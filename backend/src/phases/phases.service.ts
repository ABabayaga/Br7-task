import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Phase, PhaseDocument } from './schemas/phase.schema.js';
import { StageTemplate } from '../stage-templates/schemas/stage-template.schema.js';
import { CreatePhaseDto } from './dto/create-phase.dto.js';
import { UpdatePhaseDto } from './dto/update-phase.dto.js';
import { ServiceTypesService } from '../service-types/service-types.service.js';

@Injectable()
export class PhasesService {
  constructor(
    @InjectModel(Phase.name) private readonly phaseModel: Model<Phase>,
    @InjectModel(StageTemplate.name) private readonly stageTemplateModel: Model<StageTemplate>,
    private readonly serviceTypesService: ServiceTypesService,
  ) {}

  async create(serviceTypeId: string, dto: CreatePhaseDto): Promise<PhaseDocument> {
    await this.serviceTypesService.assertActive(serviceTypeId);
    if (dto.endDay < dto.startDay) {
      throw new BadRequestException('endDay must be greater than or equal to startDay');
    }
    const order = await this.phaseModel.countDocuments({ serviceTypeId });
    return this.phaseModel.create({
      serviceTypeId,
      name: dto.name,
      color: dto.color,
      startDay: dto.startDay,
      endDay: dto.endDay,
      order,
    }) as Promise<PhaseDocument>;
  }

  findAllForServiceType(serviceTypeId: string): Promise<PhaseDocument[]> {
    return this.phaseModel.find({ serviceTypeId }).sort({ order: 1 }) as Promise<PhaseDocument[]>;
  }

  async update(id: string, dto: UpdatePhaseDto): Promise<PhaseDocument> {
    if (dto.startDay !== undefined && dto.endDay !== undefined && dto.endDay < dto.startDay) {
      throw new BadRequestException('endDay must be greater than or equal to startDay');
    }
    const updated = (await this.phaseModel.findByIdAndUpdate(id, dto, {
      returnDocument: 'after',
    })) as PhaseDocument | null;
    if (!updated) {
      throw new NotFoundException(`Phase ${id} not found`);
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    const removed = await this.phaseModel.findByIdAndDelete(id);
    if (!removed) {
      throw new NotFoundException(`Phase ${id} not found`);
    }
    await this.stageTemplateModel.updateMany({ phaseId: id }, { $unset: { phaseId: '' } });
  }

  async reorder(serviceTypeId: string, orderedIds: string[]): Promise<PhaseDocument[]> {
    const existing = await this.phaseModel.find({ serviceTypeId }).lean();
    const existingIds = existing.map((p) => p._id.toString());
    const sameSet =
      existingIds.length === orderedIds.length &&
      existingIds.every((id) => orderedIds.includes(id));
    if (!sameSet) {
      throw new BadRequestException(
        'orderedIds must match exactly the phases of this service type',
      );
    }

    const offset = orderedIds.length;
    await Promise.all(
      orderedIds.map((id, index) => this.phaseModel.updateOne({ _id: id }, { order: offset + index })),
    );
    await Promise.all(
      orderedIds.map((id, index) => this.phaseModel.updateOne({ _id: id }, { order: index })),
    );

    return this.findAllForServiceType(serviceTypeId);
  }
}
