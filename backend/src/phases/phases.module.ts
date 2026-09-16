import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PhasesService } from './phases.service.js';
import { PhasesController } from './phases.controller.js';
import { Phase, PhaseSchema } from './schemas/phase.schema.js';
import { StageTemplate, StageTemplateSchema } from '../stage-templates/schemas/stage-template.schema.js';
import { ServiceTypesModule } from '../service-types/service-types.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Phase.name, schema: PhaseSchema },
      { name: StageTemplate.name, schema: StageTemplateSchema },
    ]),
    ServiceTypesModule,
  ],
  providers: [PhasesService],
  controllers: [PhasesController],
  exports: [PhasesService],
})
export class PhasesModule {}
