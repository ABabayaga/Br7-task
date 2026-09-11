import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service.js';
import { Project } from './schemas/project.schema.js';

describe('ProjectsService', () => {
  let service: ProjectsService;
  const modelMock = {
    create: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: getModelToken(Project.name), useValue: modelMock },
      ],
    }).compile();
    service = moduleRef.get(ProjectsService);
  });

  it('creates a project with createdBy set', async () => {
    modelMock.create.mockResolvedValue({ _id: '1', name: 'Campanha X' });

    await service.create({ name: 'Campanha X' }, 'user-1');

    expect(modelMock.create).toHaveBeenCalledWith({
      name: 'Campanha X',
      description: undefined,
      createdBy: 'user-1',
    });
  });

  it('throws NotFoundException when the project does not exist', async () => {
    modelMock.findById.mockResolvedValue(null);

    await expect(service.findOne('missing-id')).rejects.toThrow(NotFoundException);
  });
});
