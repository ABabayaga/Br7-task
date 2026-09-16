import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ClientsService } from './clients.service.js';
import { Client } from './schemas/client.schema.js';
import { ClientServiceOverride } from './schemas/client-service-override.schema.js';
import { StageTemplatesService } from '../stage-templates/stage-templates.service.js';

describe('ClientsService', () => {
  let service: ClientsService;
  const clientModelMock = {
    create: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  };
  const overrideModelMock = {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
  };
  const stageTemplatesServiceMock = { findAllForServiceType: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ClientsService,
        { provide: getModelToken(Client.name), useValue: clientModelMock },
        { provide: getModelToken(ClientServiceOverride.name), useValue: overrideModelMock },
        { provide: StageTemplatesService, useValue: stageTemplatesServiceMock },
      ],
    }).compile();
    service = moduleRef.get(ClientsService);
  });

  it('throws NotFoundException when updating a missing client', async () => {
    clientModelMock.findByIdAndUpdate.mockResolvedValue(null);

    await expect(service.update('missing-id', { name: 'X' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('returns an empty array when no override exists', async () => {
    overrideModelMock.findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });

    await expect(service.getDisabledStageTemplateIds('c1', 'st1')).resolves.toEqual([]);
  });

  it('returns the stored disabled ids as strings', async () => {
    overrideModelMock.findOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ disabledStageTemplateIds: [{ toString: () => 's1' }] }),
    });

    await expect(service.getDisabledStageTemplateIds('c1', 'st1')).resolves.toEqual(['s1']);
  });

  it('rejects setDisabledStages with an id that is not part of the service type', async () => {
    clientModelMock.findById.mockResolvedValue({ _id: 'c1', active: true });
    stageTemplatesServiceMock.findAllForServiceType.mockResolvedValue([
      { _id: { toString: () => 's1' } },
    ]);

    await expect(
      service.setDisabledStages('c1', 'st1', ['s1', 'not-real']),
    ).rejects.toThrow(BadRequestException);
  });

  it('upserts the override when all ids are valid', async () => {
    clientModelMock.findById.mockResolvedValue({ _id: 'c1', active: true });
    stageTemplatesServiceMock.findAllForServiceType.mockResolvedValue([
      { _id: { toString: () => 's1' } },
      { _id: { toString: () => 's2' } },
    ]);
    overrideModelMock.findOneAndUpdate.mockResolvedValue({ disabledStageTemplateIds: ['s1'] });

    await service.setDisabledStages('c1', 'st1', ['s1']);

    expect(overrideModelMock.findOneAndUpdate).toHaveBeenCalledWith(
      { clientId: 'c1', serviceTypeId: 'st1' },
      { clientId: 'c1', serviceTypeId: 'st1', disabledStageTemplateIds: ['s1'] },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    );
  });
});
