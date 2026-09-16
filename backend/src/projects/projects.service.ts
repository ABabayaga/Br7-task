import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project, ProjectDocument } from './schemas/project.schema.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { ClientsService } from '../clients/clients.service.js';
import { ServiceTypesService } from '../service-types/service-types.service.js';
import { StageTemplatesService } from '../stage-templates/stage-templates.service.js';
import { TasksService } from '../tasks/tasks.service.js';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
    private readonly clientsService: ClientsService,
    private readonly serviceTypesService: ServiceTypesService,
    private readonly stageTemplatesService: StageTemplatesService,
    private readonly tasksService: TasksService,
  ) {}

  async create(dto: CreateProjectDto, createdBy: string): Promise<ProjectDocument> {
    await this.clientsService.assertActive(dto.clientId);
    await this.serviceTypesService.assertActive(dto.serviceTypeId);

    const project = (await this.projectModel.create({
      name: dto.name,
      description: dto.description,
      clientId: dto.clientId,
      serviceTypeId: dto.serviceTypeId,
      startDate: dto.startDate,
      createdBy,
    })) as ProjectDocument;

    try {
      const stageTemplates = await this.stageTemplatesService.findAllForServiceType(
        dto.serviceTypeId,
      );
      const disabledIds = await this.clientsService.getDisabledStageTemplateIds(
        dto.clientId,
        dto.serviceTypeId,
      );
      const activeStages = stageTemplates
        .filter((stage) => stage.active)
        .filter((stage) => !disabledIds.includes(stage._id.toString()))
        .map((stage) => ({
          id: stage._id.toString(),
          name: stage.name,
          defaultSector: stage.defaultSector,
          defaultDurationDays: stage.defaultDurationDays,
        }));

      if (activeStages.length > 0) {
        await this.tasksService.generateFromTemplate(
          project._id.toString(),
          dto.startDate,
          activeStages,
        );
      }
    } catch (err) {
      await this.projectModel.findByIdAndDelete(project._id);
      throw err;
    }

    return project;
  }

  findAll(): Promise<ProjectDocument[]> {
    return this.projectModel.find() as Promise<ProjectDocument[]>;
  }

  async findOne(id: string): Promise<ProjectDocument> {
    const project = (await this.projectModel.findById(id)) as ProjectDocument | null;
    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }
    return project;
  }

  async update(id: string, dto: UpdateProjectDto): Promise<ProjectDocument> {
    const project = (await this.projectModel.findByIdAndUpdate(id, dto, {
      returnDocument: 'after',
    })) as ProjectDocument | null;
    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }
    return project;
  }

  async remove(id: string): Promise<void> {
    const result = await this.projectModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException(`Project ${id} not found`);
    }
  }
}
