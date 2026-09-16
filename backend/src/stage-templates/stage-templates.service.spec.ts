import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StageTemplatesService } from './stage-templates.service.js';
import { StageTemplate } from './schemas/stage-template.schema.js';
import { ServiceTypesService } from '../service-types/service-types.service.js';

describe('StageTemplatesService', () => {
  let service: StageTemplatesService;
  const modelMock = {
    create: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    countDocuments: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
    updateOne: vi.fn(),
  };
  const phaseModelMock = { findById: vi.fn() };
  const serviceTypesServiceMock = { assertActive: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        StageTemplatesService,
        { provide: getModelToken(StageTemplate.name), useValue: modelMock },
        { provide: getModelToken('Phase'), useValue: phaseModelMock },
        { provide: ServiceTypesService, useValue: serviceTypesServiceMock },
      ],
    }).compile();
    service = moduleRef.get(StageTemplatesService);
  });

  it('creates a stage template with the next order when order is omitted', async () => {
    serviceTypesServiceMock.assertActive.mockResolvedValue({ _id: 'st1', active: true });
    modelMock.countDocuments.mockResolvedValue(2);
    modelMock.create.mockResolvedValue({ _id: 'stage-1', order: 2 });

    await service.create('st1', {
      name: 'Briefing',
      defaultSector: 'criacao',
      defaultDurationDays: 3,
    });

    expect(modelMock.create).toHaveBeenCalledWith({
      serviceTypeId: 'st1',
      order: 2,
      name: 'Briefing',
      defaultSector: 'criacao',
      defaultDurationDays: 3,
      phaseId: undefined,
    });
  });

  it('rejects creating a stage with a phaseId from another service type', async () => {
    serviceTypesServiceMock.assertActive.mockResolvedValue({ _id: 'st1', active: true });
    phaseModelMock.findById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'phase-1', serviceTypeId: 'st2' }),
    });

    await expect(
      service.create('st1', {
        name: 'Briefing',
        defaultSector: 'criacao',
        defaultDurationDays: 1,
        phaseId: 'phase-1',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(modelMock.create).not.toHaveBeenCalled();
  });

  it('creates a stage with a phaseId that belongs to the same service type', async () => {
    serviceTypesServiceMock.assertActive.mockResolvedValue({ _id: 'st1', active: true });
    phaseModelMock.findById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'phase-1', serviceTypeId: 'st1' }),
    });
    modelMock.countDocuments.mockResolvedValue(0);
    modelMock.create.mockResolvedValue({ _id: 'stage-1' });

    await service.create('st1', {
      name: 'Briefing',
      defaultSector: 'criacao',
      defaultDurationDays: 1,
      phaseId: 'phase-1',
    });

    expect(modelMock.create).toHaveBeenCalledWith({
      serviceTypeId: 'st1',
      order: 0,
      name: 'Briefing',
      defaultSector: 'criacao',
      defaultDurationDays: 1,
      phaseId: 'phase-1',
    });
  });

  it('rejects updating a stage with a phaseId from another service type', async () => {
    modelMock.findById.mockResolvedValue({ _id: 'stage-1', serviceTypeId: 'st1' });
    phaseModelMock.findById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'phase-1', serviceTypeId: 'st2' }),
    });

    await expect(service.update('stage-1', { phaseId: 'phase-1' })).rejects.toThrow(
      BadRequestException,
    );
    expect(modelMock.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('allows clearing a stage phaseId by sending null', async () => {
    modelMock.findByIdAndUpdate.mockResolvedValue({ _id: 'stage-1', phaseId: undefined });

    await service.update('stage-1', { phaseId: null });

    expect(modelMock.findByIdAndUpdate).toHaveBeenCalledWith(
      'stage-1',
      { phaseId: null },
      { returnDocument: 'after' },
    );
  });

  it('throws NotFoundException when updating a missing stage template', async () => {
    modelMock.findByIdAndUpdate.mockResolvedValue(null);

    await expect(service.update('missing-id', { name: 'X' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rejects reorder when the id set does not match the service type stages', async () => {
    modelMock.find.mockReturnValue({
      lean: vi.fn().mockResolvedValue([{ _id: 'a' }, { _id: 'b' }]),
    });

    await expect(service.reorder('st1', ['a', 'c'])).rejects.toThrow(BadRequestException);
  });

  it('reorders stages by writing the new order to each', async () => {
    modelMock.find
      .mockReturnValueOnce({ lean: vi.fn().mockResolvedValue([{ _id: 'a' }, { _id: 'b' }]) })
      .mockReturnValueOnce({
        sort: vi.fn().mockResolvedValue([{ _id: 'b', order: 0 }, { _id: 'a', order: 1 }]),
      });
    modelMock.updateOne.mockResolvedValue({});

    await service.reorder('st1', ['b', 'a']);

    expect(modelMock.updateOne).toHaveBeenCalledTimes(4);
    expect(modelMock.updateOne).toHaveBeenNthCalledWith(3, { _id: 'b' }, { order: 0 });
    expect(modelMock.updateOne).toHaveBeenNthCalledWith(4, { _id: 'a' }, { order: 1 });
    expect(modelMock.find).toHaveBeenCalledTimes(2);
  });
});
