import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { StageTemplate, StageTemplateDocument } from './schemas/stage-template.schema.js';
import { Phase } from '../phases/schemas/phase.schema.js';
import { CreateStageTemplateDto } from './dto/create-stage-template.dto.js';
import { UpdateStageTemplateDto } from './dto/update-stage-template.dto.js';
import { ServiceTypesService } from '../service-types/service-types.service.js';

@Injectable()
export class StageTemplatesService {
  constructor(
    @InjectModel(StageTemplate.name) private readonly stageTemplateModel: Model<StageTemplate>,
    @InjectModel(Phase.name) private readonly phaseModel: Model<Phase>,
    private readonly serviceTypesService: ServiceTypesService,
  ) {}

  private async assertPhaseBelongsToServiceType(
    phaseId: string,
    serviceTypeId: string,
  ): Promise<void> {
    const phase = await this.phaseModel.findById(phaseId).lean();
    if (!phase || phase.serviceTypeId.toString() !== serviceTypeId) {
      throw new BadRequestException(
        `Phase ${phaseId} does not belong to service type ${serviceTypeId}`,
      );
    }
  }

  async create(serviceTypeId: string, dto: CreateStageTemplateDto): Promise<StageTemplateDocument> {
    await this.serviceTypesService.assertActive(serviceTypeId);
    if (dto.phaseId) {
      await this.assertPhaseBelongsToServiceType(dto.phaseId, serviceTypeId);
    }
    const order = dto.order ?? (await this.stageTemplateModel.countDocuments({ serviceTypeId }));
    return this.stageTemplateModel.create({
      serviceTypeId,
      order,
      name: dto.name,
      defaultSector: dto.defaultSector,
      defaultDurationDays: dto.defaultDurationDays,
      phaseId: dto.phaseId,
    }) as Promise<StageTemplateDocument>;
  }

  findAllForServiceType(serviceTypeId: string): Promise<StageTemplateDocument[]> {
    return this.stageTemplateModel
      .find({ serviceTypeId })
      .sort({ order: 1 }) as Promise<StageTemplateDocument[]>;
  }

  async update(id: string, dto: UpdateStageTemplateDto): Promise<StageTemplateDocument> {
    if (dto.phaseId) {
      const stage = (await this.stageTemplateModel.findById(id)) as StageTemplateDocument | null;
      if (!stage) {
        throw new NotFoundException(`StageTemplate ${id} not found`);
      }
      await this.assertPhaseBelongsToServiceType(dto.phaseId, stage.serviceTypeId.toString());
    }

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
