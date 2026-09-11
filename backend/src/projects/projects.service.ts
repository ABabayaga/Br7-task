import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project, ProjectDocument } from './schemas/project.schema.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
  ) {}

  create(dto: CreateProjectDto, createdBy: string) {
    return this.projectModel.create({
      name: dto.name,
      description: dto.description,
      createdBy,
    });
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
