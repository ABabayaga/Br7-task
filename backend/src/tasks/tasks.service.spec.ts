import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { TasksService } from './tasks.service.js';
import { Task } from './schemas/task.schema.js';

describe('TasksService', () => {
  let service: TasksService;
  const modelMock = {
    create: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
    updateMany: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [TasksService, { provide: getModelToken(Task.name), useValue: modelMock }],
    }).compile();
    service = moduleRef.get(TasksService);
  });

  it('rejects an update that would create a dependency cycle', async () => {
    const taskA = { _id: 'a', projectId: 'p1', dependencies: [] };
    const taskB = { _id: 'b', projectId: 'p1', dependencies: ['a'] };
    modelMock.findById.mockResolvedValue(taskA);
    modelMock.find.mockReturnValue({
      lean: vi.fn().mockResolvedValue([taskA, taskB]),
    });

    // Proposing that 'a' now depends on 'b' would create a -> b -> a.
    await expect(service.update('a', { dependencies: ['b'] })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('generates chained tasks from stage templates starting on the given date', async () => {
    modelMock.create
      .mockResolvedValueOnce({ _id: 'task-1', name: 'Briefing' })
      .mockResolvedValueOnce({ _id: 'task-2', name: 'Cronograma' });

    const stages = [
      { id: 'stage-1', name: 'Briefing', defaultSector: 'diretoria_criacao' as const, defaultDurationDays: 2 },
      { id: 'stage-2', name: 'Cronograma', defaultSector: 'criacao' as const, defaultDurationDays: 3 },
    ];

    const created = await service.generateFromTemplate('project-1', '2026-01-01', stages);

    expect(modelMock.create).toHaveBeenNthCalledWith(1, {
      name: 'Briefing',
      projectId: 'project-1',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-01-02'),
      setor: 'diretoria_criacao',
      sourceStageTemplateId: 'stage-1',
      dependencies: [],
    });
    expect(modelMock.create).toHaveBeenNthCalledWith(2, {
      name: 'Cronograma',
      projectId: 'project-1',
      startDate: new Date('2026-01-03'),
      endDate: new Date('2026-01-05'),
      setor: 'criacao',
      sourceStageTemplateId: 'stage-2',
      dependencies: ['task-1'],
    });
    expect(created).toHaveLength(2);
  });
});
