import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PhasesService } from './phases.service.js';
import { Phase } from './schemas/phase.schema.js';
import { StageTemplate } from '../stage-templates/schemas/stage-template.schema.js';
import { ServiceTypesService } from '../service-types/service-types.service.js';

describe('PhasesService', () => {
  let service: PhasesService;
  const phaseModelMock = {
    create: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
    updateOne: vi.fn(),
  };
  const stageTemplateModelMock = { updateMany: vi.fn() };
  const serviceTypesServiceMock = { assertActive: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        PhasesService,
        { provide: getModelToken(Phase.name), useValue: phaseModelMock },
        { provide: getModelToken(StageTemplate.name), useValue: stageTemplateModelMock },
        { provide: ServiceTypesService, useValue: serviceTypesServiceMock },
      ],
    }).compile();
    service = moduleRef.get(PhasesService);
  });

  it('creates a phase with the next order', async () => {
    serviceTypesServiceMock.assertActive.mockResolvedValue({ _id: 'st1', active: true });
    phaseModelMock.countDocuments.mockResolvedValue(1);
    phaseModelMock.create.mockResolvedValue({ _id: 'phase-1', order: 1 });

    await service.create('st1', { name: 'Fase II', color: '#2563EB', startDay: 1, endDay: 4 });

    expect(phaseModelMock.create).toHaveBeenCalledWith({
      serviceTypeId: 'st1',
      name: 'Fase II',
      color: '#2563EB',
      startDay: 1,
      endDay: 4,
      order: 1,
    });
  });

  it('rejects creation when endDay is before startDay', async () => {
    serviceTypesServiceMock.assertActive.mockResolvedValue({ _id: 'st1', active: true });

    await expect(
      service.create('st1', { name: 'Fase II', color: '#2563EB', startDay: 5, endDay: 2 }),
    ).rejects.toThrow(BadRequestException);
    expect(phaseModelMock.create).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when updating a missing phase', async () => {
    phaseModelMock.findByIdAndUpdate.mockResolvedValue(null);

    await expect(service.update('missing-id', { name: 'X' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rejects an update where the new endDay is before the new startDay', async () => {
    await expect(service.update('phase-1', { startDay: 10, endDay: 2 })).rejects.toThrow(
      BadRequestException,
    );
    expect(phaseModelMock.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('unlinks stage templates from the phase when it is removed', async () => {
    phaseModelMock.findByIdAndDelete.mockResolvedValue({ _id: 'phase-1' });
    stageTemplateModelMock.updateMany.mockResolvedValue({});

    await service.remove('phase-1');

    expect(stageTemplateModelMock.updateMany).toHaveBeenCalledWith(
      { phaseId: 'phase-1' },
      { $unset: { phaseId: '' } },
    );
  });

  it('throws NotFoundException when removing a missing phase', async () => {
    phaseModelMock.findByIdAndDelete.mockResolvedValue(null);

    await expect(service.remove('missing-id')).rejects.toThrow(NotFoundException);
    expect(stageTemplateModelMock.updateMany).not.toHaveBeenCalled();
  });

  it('rejects reorder when the id set does not match the service type phases', async () => {
    phaseModelMock.find.mockReturnValue({
      lean: vi.fn().mockResolvedValue([{ _id: 'a' }, { _id: 'b' }]),
    });

    await expect(service.reorder('st1', ['a', 'c'])).rejects.toThrow(BadRequestException);
  });

  it('reorders phases in two phases to avoid the unique index conflict', async () => {
    phaseModelMock.find
      .mockReturnValueOnce({ lean: vi.fn().mockResolvedValue([{ _id: 'a' }, { _id: 'b' }]) })
      .mockReturnValueOnce({
        sort: vi.fn().mockResolvedValue([{ _id: 'b', order: 0 }, { _id: 'a', order: 1 }]),
      });
    phaseModelMock.updateOne.mockResolvedValue({});

    await service.reorder('st1', ['b', 'a']);

    expect(phaseModelMock.updateOne).toHaveBeenCalledTimes(4);
    expect(phaseModelMock.updateOne).toHaveBeenNthCalledWith(3, { _id: 'b' }, { order: 0 });
    expect(phaseModelMock.updateOne).toHaveBeenNthCalledWith(4, { _id: 'a' }, { order: 1 });
  });
});
