import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectsService } from './projects.service.js';
import { ProjectsController } from './projects.controller.js';
import { Project, ProjectSchema } from './schemas/project.schema.js';
import { ClientsModule } from '../clients/clients.module.js';
import { ServiceTypesModule } from '../service-types/service-types.module.js';
import { StageTemplatesModule } from '../stage-templates/stage-templates.module.js';
import { TasksModule } from '../tasks/tasks.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Project.name, schema: ProjectSchema }]),
    ClientsModule,
    ServiceTypesModule,
    StageTemplatesModule,
    TasksModule,
  ],
  providers: [ProjectsService],
  controllers: [ProjectsController],
  exports: [ProjectsService],
})
export class ProjectsModule {}
