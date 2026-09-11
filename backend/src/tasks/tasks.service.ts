import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Task, TaskDocument } from './schemas/task.schema.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { wouldCreateCycle } from './dependency-cycle.util.js';

@Injectable()
export class TasksService {
  constructor(@InjectModel(Task.name) private readonly taskModel: Model<Task>) {}

  create(projectId: string, dto: CreateTaskDto) {
    return this.taskModel.create({
      name: dto.name,
      projectId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      assigneeId: dto.assigneeId,
    });
  }

  findAllForProject(projectId: string): Promise<TaskDocument[]> {
    return this.taskModel.find({ projectId }) as Promise<TaskDocument[]>;
  }

  async update(id: string, dto: UpdateTaskDto): Promise<TaskDocument> {
    const task = (await this.taskModel.findById(id)) as TaskDocument | null;
    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }

    if (dto.dependencies) {
      const projectTasks = await this.taskModel
        .find({ projectId: task.projectId })
        .lean();
      const allTasks = projectTasks.map((t) => ({
        id: t._id.toString(),
        dependencies: t.dependencies.map((d) => d.toString()),
      }));

      if (wouldCreateCycle(id, dto.dependencies, allTasks)) {
        throw new BadRequestException('This would create a dependency cycle');
      }
    }

    const updated = (await this.taskModel.findByIdAndUpdate(id, dto, {
      returnDocument: 'after',
    })) as TaskDocument | null;
    if (!updated) {
      throw new NotFoundException(`Task ${id} not found`);
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    const task = await this.taskModel.findByIdAndDelete(id);
    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }
    await this.taskModel.updateMany(
      { projectId: task.projectId },
      { $pull: { dependencies: task._id } },
    );
  }
}
