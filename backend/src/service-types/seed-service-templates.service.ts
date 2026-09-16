import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ServiceTypesService } from './service-types.service.js';
import { StageTemplatesService } from '../stage-templates/stage-templates.service.js';
import type { Sector } from '../common/sector.js';

interface StageSeed {
  name: string;
  defaultSector: Sector;
}

interface ServiceTypeSeed {
  name: string;
  stages: StageSeed[];
}

/**
 * Etapas extraídas do PDF "Fluxos Operacionais BR7" (seções 3, 5, 6, 7, 8).
 * Cada lista segue o "caminho feliz" do fluxo: os ramos de aprovação/
 * alteração do PDF (ex: "9A aprovado" / "9B alteração solicitada") viram
 * loops manuais no Gantt depois, não etapas duplicadas no template.
 * Etapas que o PDF descreve como "está com: Cliente" usam
 * defaultSector: 'cliente'.
 */
export const SERVICE_TYPE_SEEDS: ServiceTypeSeed[] = [
  {
    name: 'Social Media',
    stages: [
      { name: 'Briefing interno', defaultSector: 'diretoria_criacao' },
      { name: 'Planejamento de conteúdo', defaultSector: 'diretoria_criacao' },
      { name: 'Criação do cronograma', defaultSector: 'criacao' },
      { name: 'Desenvolvimento dos criativos para Instagram', defaultSector: 'criacao' },
      { name: 'Facebook', defaultSector: 'criacao' },
      { name: 'LinkedIn', defaultSector: 'criacao' },
      { name: 'Revisão interna', defaultSector: 'diretoria_criacao' },
      { name: 'Material enviado ao cliente', defaultSector: 'cliente' },
      { name: 'Conteúdo aprovado', defaultSector: 'criacao' },
      { name: 'Cronograma em execução', defaultSector: 'criacao' },
      { name: 'Cronograma concluído', defaultSector: 'diretoria_criacao' },
    ],
  },
  {
    name: 'Logo / Identidade Visual',
    stages: [
      { name: 'Briefing de marca', defaultSector: 'diretoria_criacao' },
      { name: 'Pesquisa e referências', defaultSector: 'diretoria_criacao' },
      { name: 'Desenvolvimento do conceito', defaultSector: 'diretoria_criacao' },
      { name: 'Criação da logo', defaultSector: 'criacao' },
      { name: 'Revisão interna', defaultSector: 'diretoria_criacao' },
      { name: 'Preparação da apresentação', defaultSector: 'criacao' },
      { name: 'Apresentação ao cliente', defaultSector: 'cliente' },
      { name: 'Identidade aprovada', defaultSector: 'criacao' },
      { name: 'Branding concluído', defaultSector: 'diretoria_criacao' },
    ],
  },
  {
    name: 'Site',
    stages: [
      { name: 'Reunião inicial', defaultSector: 'diretoria' },
      { name: 'Briefing do site', defaultSector: 'diretoria_criacao' },
      { name: 'Primeiro protótipo', defaultSector: 'desenvolvimento' },
      { name: 'Revisão interna', defaultSector: 'diretoria_criacao' },
      { name: 'Protótipo enviado', defaultSector: 'cliente' },
      { name: 'Alterações recebidas', defaultSector: 'diretoria_executiva' },
      { name: 'Contrato do site', defaultSector: 'diretoria_executiva' },
      { name: 'Contrato enviado', defaultSector: 'cliente' },
      { name: 'Contrato assinado', defaultSector: 'desenvolvimento' },
      { name: 'Alterações em desenvolvimento', defaultSector: 'desenvolvimento' },
      { name: 'Revisão interna da nova versão', defaultSector: 'diretoria_criacao' },
      { name: 'Site enviado novamente ao cliente', defaultSector: 'cliente' },
      { name: 'Site aprovado', defaultSector: 'desenvolvimento' },
      { name: 'Publicação', defaultSector: 'desenvolvimento' },
      { name: 'Site no ar', defaultSector: 'desenvolvimento' },
    ],
  },
  {
    name: 'Captação de Vídeo Local',
    stages: [
      { name: 'Solicitação recebida', defaultSector: 'diretoria_executiva' },
      { name: 'Planejamento / roteiro', defaultSector: 'diretoria_criacao' },
      { name: 'Agendamento', defaultSector: 'diretoria_executiva' },
      { name: 'Captação agendada', defaultSector: 'diretoria_executiva' },
      { name: 'Captação realizada', defaultSector: 'criacao' },
      { name: 'Material captado', defaultSector: 'criacao' },
      { name: 'Edição', defaultSector: 'criacao' },
      { name: 'Revisão interna', defaultSector: 'diretoria_criacao' },
      { name: 'Vídeo enviado', defaultSector: 'cliente' },
      { name: 'Aprovado', defaultSector: 'criacao' },
    ],
  },
  {
    name: 'Captação de Vídeo Externa',
    stages: [
      { name: 'Planejamento da gravação', defaultSector: 'diretoria_criacao' },
      { name: 'Preparação das orientações', defaultSector: 'criacao' },
      { name: 'Orientações enviadas', defaultSector: 'cliente' },
      { name: 'Cliente realizando captação', defaultSector: 'cliente' },
      { name: 'Aguardando arquivos', defaultSector: 'cliente' },
      { name: 'Material recebido', defaultSector: 'criacao' },
      { name: 'Análise do material', defaultSector: 'diretoria_criacao' },
      { name: 'Edição', defaultSector: 'criacao' },
      { name: 'Revisão interna', defaultSector: 'diretoria_criacao' },
      { name: 'Material enviado', defaultSector: 'cliente' },
      { name: 'Aprovação', defaultSector: 'cliente' },
      { name: 'Finalizado', defaultSector: 'diretoria_criacao' },
    ],
  },
];

@Injectable()
export class SeedServiceTemplatesService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedServiceTemplatesService.name);

  constructor(
    private readonly serviceTypesService: ServiceTypesService,
    private readonly stageTemplatesService: StageTemplatesService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    for (const seed of SERVICE_TYPE_SEEDS) {
      const existing = await this.serviceTypesService.findByName(seed.name);
      if (existing) continue;

      const serviceType = await this.serviceTypesService.create({ name: seed.name });
      for (const [index, stage] of seed.stages.entries()) {
        await this.stageTemplatesService.create(serviceType._id.toString(), {
          name: stage.name,
          defaultSector: stage.defaultSector,
          defaultDurationDays: 1,
          order: index,
        });
      }
      this.logger.log(`Seeded service type "${seed.name}" with ${seed.stages.length} stages`);
    }
  }
}
