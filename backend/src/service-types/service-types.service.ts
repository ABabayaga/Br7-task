import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ServiceType, ServiceTypeDocument } from './schemas/service-type.schema.js';
import { CreateServiceTypeDto } from './dto/create-service-type.dto.js';
import { UpdateServiceTypeDto } from './dto/update-service-type.dto.js';

@Injectable()
export class ServiceTypesService {
  constructor(
    @InjectModel(ServiceType.name) private readonly serviceTypeModel: Model<ServiceType>,
  ) {}

  create(dto: CreateServiceTypeDto) {
    return this.serviceTypeModel.create({ name: dto.name });
  }

  findAll(): Promise<ServiceTypeDocument[]> {
    return this.serviceTypeModel.find() as Promise<ServiceTypeDocument[]>;
  }

  findByName(name: string): Promise<ServiceTypeDocument | null> {
    return this.serviceTypeModel.findOne({ name }) as Promise<ServiceTypeDocument | null>;
  }

  async update(id: string, dto: UpdateServiceTypeDto): Promise<ServiceTypeDocument> {
    const updated = (await this.serviceTypeModel.findByIdAndUpdate(id, dto, {
      returnDocument: 'after',
    })) as ServiceTypeDocument | null;
    if (!updated) {
      throw new NotFoundException(`ServiceType ${id} not found`);
    }
    return updated;
  }

  async assertActive(id: string): Promise<ServiceTypeDocument> {
    const serviceType = (await this.serviceTypeModel.findById(id)) as ServiceTypeDocument | null;
    if (!serviceType || !serviceType.active) {
      throw new BadRequestException(`Service type ${id} not found or inactive`);
    }
    return serviceType;
  }
}
