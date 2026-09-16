import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Client, ClientDocument } from './schemas/client.schema.js';
import {
  ClientServiceOverride,
  ClientServiceOverrideDocument,
} from './schemas/client-service-override.schema.js';
import { CreateClientDto } from './dto/create-client.dto.js';
import { UpdateClientDto } from './dto/update-client.dto.js';
import { StageTemplatesService } from '../stage-templates/stage-templates.service.js';

@Injectable()
export class ClientsService {
  constructor(
    @InjectModel(Client.name) private readonly clientModel: Model<Client>,
    @InjectModel(ClientServiceOverride.name)
    private readonly overrideModel: Model<ClientServiceOverride>,
    private readonly stageTemplatesService: StageTemplatesService,
  ) {}

  create(dto: CreateClientDto) {
    return this.clientModel.create({ name: dto.name });
  }

  findAll(): Promise<ClientDocument[]> {
    return this.clientModel.find() as Promise<ClientDocument[]>;
  }

  async update(id: string, dto: UpdateClientDto): Promise<ClientDocument> {
    const updated = (await this.clientModel.findByIdAndUpdate(id, dto, {
      returnDocument: 'after',
    })) as ClientDocument | null;
    if (!updated) {
      throw new NotFoundException(`Client ${id} not found`);
    }
    return updated;
  }

  async assertActive(id: string): Promise<ClientDocument> {
    const client = (await this.clientModel.findById(id)) as ClientDocument | null;
    if (!client || !client.active) {
      throw new BadRequestException(`Client ${id} not found or inactive`);
    }
    return client;
  }

  async getDisabledStageTemplateIds(clientId: string, serviceTypeId: string): Promise<string[]> {
    const override = await this.overrideModel.findOne({ clientId, serviceTypeId }).lean();
    return override ? override.disabledStageTemplateIds.map((id) => id.toString()) : [];
  }

  async setDisabledStages(
    clientId: string,
    serviceTypeId: string,
    disabledStageTemplateIds: string[],
  ): Promise<ClientServiceOverrideDocument> {
    await this.assertActive(clientId);
    const templates = await this.stageTemplatesService.findAllForServiceType(serviceTypeId);
    const validIds = new Set(templates.map((t) => t._id.toString()));
    const invalid = disabledStageTemplateIds.filter((id) => !validIds.has(id));
    if (invalid.length > 0) {
      throw new BadRequestException(
        `Invalid stage template ids for this service type: ${invalid.join(', ')}`,
      );
    }

    return this.overrideModel.findOneAndUpdate(
      { clientId, serviceTypeId },
      { clientId, serviceTypeId, disabledStageTemplateIds },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    ) as Promise<ClientServiceOverrideDocument>;
  }
}
