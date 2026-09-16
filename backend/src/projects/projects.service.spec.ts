import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service.js';
import { Project } from './schemas/project.schema.js';
import { ClientsService } from '../clients/clients.service.js';
import { ServiceTypesService } from '../service-types/service-types.service.js';
import { StageTemplatesService } from '../stage-templates/stage-templates.service.js';
import { TasksService } from '../tasks/tasks.service.js';

describe('ProjectsService', () => {
  let service: ProjectsService;
  const modelMock = {
    create: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
  };
  const clientsServiceMock = {
    assertActive: vi.fn(),
    getDisabledStageTemplateIds: vi.fn(),
  };
  const serviceTypesServiceMock = { assertActive: vi.fn() };
  const stageTemplatesServiceMock = { findAllForServiceType: vi.fn() };
  const tasksServiceMock = { generateFromTemplate: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: getModelToken(Project.name), useValue: modelMock },
        { provide: ClientsService, useValue: clientsServiceMock },
        { provide: ServiceTypesService, useValue: serviceTypesServiceMock },
        { provide: StageTemplatesService, useValue: stageTemplatesServiceMock },
        { provide: TasksService, useValue: tasksServiceMock },
      ],
    }).compile();
    service = moduleRef.get(ProjectsService);
  });

  it('creates a project and generates tasks from the active, non-disabled stages', async () => {
    clientsServiceMock.assertActive.mockResolvedValue({ _id: 'c1', active: true });
    serviceTypesServiceMock.assertActive.mockResolvedValue({ _id: 'st1', active: true });
    modelMock.create.mockResolvedValue({ _id: 'p1' });
    stageTemplatesServiceMock.findAllForServiceType.mockResolvedValue([
      { _id: { toString: () => 's1' }, name: 'Briefing', defaultSector: 'criacao', defaultDurationDays: 2, active: true },
      { _id: { toString: () => 's2' }, name: 'Facebook', defaultSector: 'criacao', defaultDurationDays: 1, active: true },
    ]);
    clientsServiceMock.getDisabledStageTemplateIds.mockResolvedValue(['s2']);

    await service.create(
      { name: 'Campanha X', clientId: 'c1', serviceTypeId: 'st1', startDate: '2026-01-01' },
      'user-1',
    );

    expect(tasksServiceMock.generateFromTemplate).toHaveBeenCalledWith('p1', '2026-01-01', [
      { id: 's1', name: 'Briefing', defaultSector: 'criacao', defaultDurationDays: 2 },
    ]);
  });

  it('skips task generation and does not error when every stage is disabled', async () => {
    clientsServiceMock.assertActive.mockResolvedValue({ _id: 'c1', active: true });
    serviceTypesServiceMock.assertActive.mockResolvedValue({ _id: 'st1', active: true });
    modelMock.create.mockResolvedValue({ _id: 'p1' });
    stageTemplatesServiceMock.findAllForServiceType.mockResolvedValue([
      { _id: { toString: () => 's1' }, name: 'Briefing', defaultSector: 'criacao', defaultDurationDays: 2, active: true },
    ]);
    clientsServiceMock.getDisabledStageTemplateIds.mockResolvedValue(['s1']);

    await service.create(
      { name: 'Campanha X', clientId: 'c1', serviceTypeId: 'st1', startDate: '2026-01-01' },
      'user-1',
    );

    expect(tasksServiceMock.generateFromTemplate).not.toHaveBeenCalled();
  });

  it('rolls back the project when task generation fails', async () => {
    clientsServiceMock.assertActive.mockResolvedValue({ _id: 'c1', active: true });
    serviceTypesServiceMock.assertActive.mockResolvedValue({ _id: 'st1', active: true });
    modelMock.create.mockResolvedValue({ _id: 'p1' });
    stageTemplatesServiceMock.findAllForServiceType.mockResolvedValue([
      { _id: { toString: () => 's1' }, name: 'Briefing', defaultSector: 'criacao', defaultDurationDays: 2, active: true },
    ]);
    clientsServiceMock.getDisabledStageTemplateIds.mockResolvedValue([]);
    tasksServiceMock.generateFromTemplate.mockRejectedValue(new Error('boom'));

    await expect(
      service.create(
        { name: 'Campanha X', clientId: 'c1', serviceTypeId: 'st1', startDate: '2026-01-01' },
        'user-1',
      ),
    ).rejects.toThrow('boom');
    expect(modelMock.findByIdAndDelete).toHaveBeenCalledWith('p1');
  });

  it('excludes archived stages from generation even when not disabled by the client', async () => {
    clientsServiceMock.assertActive.mockResolvedValue({ _id: 'c1', active: true });
    serviceTypesServiceMock.assertActive.mockResolvedValue({ _id: 'st1', active: true });
    modelMock.create.mockResolvedValue({ _id: 'p1' });
    tasksServiceMock.generateFromTemplate.mockResolvedValue([]);
    stageTemplatesServiceMock.findAllForServiceType.mockResolvedValue([
      { _id: { toString: () => 's1' }, name: 'Briefing', defaultSector: 'criacao', defaultDurationDays: 2, active: true },
      { _id: { toString: () => 's2' }, name: 'Facebook', defaultSector: 'criacao', defaultDurationDays: 1, active: false },
    ]);
    clientsServiceMock.getDisabledStageTemplateIds.mockResolvedValue([]);

    await service.create(
      { name: 'Campanha X', clientId: 'c1', serviceTypeId: 'st1', startDate: '2026-01-01' },
      'user-1',
    );

    expect(tasksServiceMock.generateFromTemplate).toHaveBeenCalledWith('p1', '2026-01-01', [
      { id: 's1', name: 'Briefing', defaultSector: 'criacao', defaultDurationDays: 2 },
    ]);
  });

  it('throws NotFoundException when the project does not exist', async () => {
    modelMock.findById.mockResolvedValue(null);

    await expect(service.findOne('missing-id')).rejects.toThrow(NotFoundException);
  });
});
