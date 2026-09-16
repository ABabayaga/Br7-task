import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ServiceTypesService } from './service-types.service.js';
import { ServiceType } from './schemas/service-type.schema.js';

describe('ServiceTypesService', () => {
  let service: ServiceTypesService;
  const modelMock = {
    create: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ServiceTypesService,
        { provide: getModelToken(ServiceType.name), useValue: modelMock },
      ],
    }).compile();
    service = moduleRef.get(ServiceTypesService);
  });

  it('throws NotFoundException when updating a missing service type', async () => {
    modelMock.findByIdAndUpdate.mockResolvedValue(null);

    await expect(service.update('missing-id', { name: 'X' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('assertActive throws BadRequestException when inactive', async () => {
    modelMock.findById.mockResolvedValue({ _id: '1', active: false });

    await expect(service.assertActive('1')).rejects.toThrow(BadRequestException);
  });

  it('assertActive throws BadRequestException when missing', async () => {
    modelMock.findById.mockResolvedValue(null);

    await expect(service.assertActive('missing-id')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('assertActive returns the document when active', async () => {
    const doc = { _id: '1', active: true };
    modelMock.findById.mockResolvedValue(doc);

    await expect(service.assertActive('1')).resolves.toBe(doc);
  });

  it('findByName delegates to the model', async () => {
    const doc = { _id: '1', name: 'Social Media' };
    modelMock.findOne.mockResolvedValue(doc);

    await expect(service.findByName('Social Media')).resolves.toBe(doc);
    expect(modelMock.findOne).toHaveBeenCalledWith({ name: 'Social Media' });
  });
});
