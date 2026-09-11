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
});
