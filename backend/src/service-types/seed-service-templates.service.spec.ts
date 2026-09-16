import { Test } from '@nestjs/testing';
import { SeedServiceTemplatesService } from './seed-service-templates.service.js';
import { ServiceTypesService } from './service-types.service.js';
import { StageTemplatesService } from '../stage-templates/stage-templates.service.js';

describe('SeedServiceTemplatesService', () => {
  let service: SeedServiceTemplatesService;
  const serviceTypesServiceMock = {
    findByName: vi.fn(),
    create: vi.fn(),
  };
  const stageTemplatesServiceMock = { create: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        SeedServiceTemplatesService,
        { provide: ServiceTypesService, useValue: serviceTypesServiceMock },
        { provide: StageTemplatesService, useValue: stageTemplatesServiceMock },
      ],
    }).compile();
    service = moduleRef.get(SeedServiceTemplatesService);
  });

  it('creates every flow and its ordered stages when none exist yet', async () => {
    serviceTypesServiceMock.findByName.mockResolvedValue(null);
    serviceTypesServiceMock.create.mockImplementation((dto: { name: string }) =>
      Promise.resolve({ _id: `st-${dto.name}`, name: dto.name }),
    );

    await service.onApplicationBootstrap();

    expect(serviceTypesServiceMock.create).toHaveBeenCalledWith({ name: 'Social Media' });
    expect(serviceTypesServiceMock.create).toHaveBeenCalledWith({
      name: 'Logo / Identidade Visual',
    });
    expect(serviceTypesServiceMock.create).toHaveBeenCalledWith({ name: 'Site' });
    expect(serviceTypesServiceMock.create).toHaveBeenCalledWith({
      name: 'Captação de Vídeo Local',
    });
    expect(serviceTypesServiceMock.create).toHaveBeenCalledWith({
      name: 'Captação de Vídeo Externa',
    });

    const socialMediaStageCalls = stageTemplatesServiceMock.create.mock.calls.filter(
      ([serviceTypeId]) => serviceTypeId === 'st-Social Media',
    );
    expect(socialMediaStageCalls).toHaveLength(11);
    expect(socialMediaStageCalls[0][1]).toEqual({
      name: 'Briefing interno',
      defaultSector: 'diretoria_criacao',
      defaultDurationDays: 1,
      order: 0,
    });
    expect(socialMediaStageCalls[10][1]).toEqual({
      name: 'Cronograma concluído',
      defaultSector: 'diretoria_criacao',
      defaultDurationDays: 1,
      order: 10,
    });
    expect(socialMediaStageCalls[7][1]).toEqual({
      name: 'Material enviado ao cliente',
      defaultSector: 'cliente',
      defaultDurationDays: 1,
      order: 7,
    });
  });

  it('skips a flow whose service type already exists', async () => {
    serviceTypesServiceMock.findByName.mockImplementation((name: string) =>
      Promise.resolve(name === 'Social Media' ? { _id: 'existing-st', name } : null),
    );
    serviceTypesServiceMock.create.mockImplementation((dto: { name: string }) =>
      Promise.resolve({ _id: `st-${dto.name}`, name: dto.name }),
    );

    await service.onApplicationBootstrap();

    expect(serviceTypesServiceMock.create).not.toHaveBeenCalledWith({ name: 'Social Media' });
    const stageCallsForExisting = stageTemplatesServiceMock.create.mock.calls.filter(
      ([serviceTypeId]) => serviceTypeId === 'existing-st',
    );
    expect(stageCallsForExisting).toHaveLength(0);
    // The other four flows still get seeded.
    expect(serviceTypesServiceMock.create).toHaveBeenCalledWith({ name: 'Site' });
  });
});
