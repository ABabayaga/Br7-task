import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StageTemplatesService } from './stage-templates.service.js';
import { StageTemplatesController } from './stage-templates.controller.js';
import { StageTemplate, StageTemplateSchema } from './schemas/stage-template.schema.js';
import { ServiceTypesModule } from '../service-types/service-types.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: StageTemplate.name, schema: StageTemplateSchema }]),
    ServiceTypesModule,
  ],
  providers: [StageTemplatesService],
  controllers: [StageTemplatesController],
  exports: [StageTemplatesService],
})
export class StageTemplatesModule {}
