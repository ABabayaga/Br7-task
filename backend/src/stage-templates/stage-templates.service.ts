import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { StageTemplate, StageTemplateDocument } from './schemas/stage-template.schema.js';
import { CreateStageTemplateDto } from './dto/create-stage-template.dto.js';
import { UpdateStageTemplateDto } from './dto/update-stage-template.dto.js';
import { ServiceTypesService } from '../service-types/service-types.service.js';

@Injectable()
export class StageTemplatesService {
  constructor(
    @InjectModel(StageTemplate.name) private readonly stageTemplateModel: Model<StageTemplate>,
    private readonly serviceTypesService: ServiceTypesService,
  ) {}

  async create(serviceTypeId: string, dto: CreateStageTemplateDto): Promise<StageTemplateDocument> {
    await this.serviceTypesService.assertActive(serviceTypeId);
    const order = dto.order ?? (await this.stageTemplateModel.countDocuments({ serviceTypeId }));
    return this.stageTemplateModel.create({
      serviceTypeId,
      order,
      name: dto.name,
      defaultSector: dto.defaultSector,
      defaultDurationDays: dto.defaultDurationDays,
    }) as Promise<StageTemplateDocument>;
  }

  findAllForServiceType(serviceTypeId: string): Promise<StageTemplateDocument[]> {
    return this.stageTemplateModel
      .find({ serviceTypeId })
      .sort({ order: 1 }) as Promise<StageTemplateDocument[]>;
  }

  async update(id: string, dto: UpdateStageTemplateDto): Promise<StageTemplateDocument> {
    const updated = (await this.stageTemplateModel.findByIdAndUpdate(id, dto, {
      returnDocument: 'after',
    })) as StageTemplateDocument | null;
    if (!updated) {
      throw new NotFoundException(`StageTemplate ${id} not found`);
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    const removed = await this.stageTemplateModel.findByIdAndDelete(id);
    if (!removed) {
      throw new NotFoundException(`StageTemplate ${id} not found`);
    }
  }

  async reorder(serviceTypeId: string, orderedIds: string[]): Promise<StageTemplateDocument[]> {
    const existing = await this.stageTemplateModel.find({ serviceTypeId }).lean();
    const existingIds = existing.map((t) => t._id.toString());
    const sameSet =
      existingIds.length === orderedIds.length &&
      existingIds.every((id) => orderedIds.includes(id));
    if (!sameSet) {
      throw new BadRequestException(
        'orderedIds must match exactly the stage templates of this service type',
      );
    }

    // Two-phase update: first move every document to a temporary order
    // beyond the final range, then assign final orders. Doing it in one
    // phase can violate the (serviceTypeId, order) unique index when two
    // documents swap positions (a concurrent update briefly duplicates a
    // still-held order value).
    const offset = orderedIds.length;
    await Promise.all(
      orderedIds.map((id, index) =>
        this.stageTemplateModel.updateOne({ _id: id }, { order: offset + index }),
      ),
    );
    await Promise.all(
      orderedIds.map((id, index) =>
        this.stageTemplateModel.updateOne({ _id: id }, { order: index }),
      ),
    );

    return this.findAllForServiceType(serviceTypeId);
  }
}
