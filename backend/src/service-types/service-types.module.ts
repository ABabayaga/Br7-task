import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ServiceTypesService } from './service-types.service.js';
import { ServiceTypesController } from './service-types.controller.js';
import { ServiceType, ServiceTypeSchema } from './schemas/service-type.schema.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: ServiceType.name, schema: ServiceTypeSchema }])],
  providers: [ServiceTypesService],
  controllers: [ServiceTypesController],
  exports: [ServiceTypesService],
})
export class ServiceTypesModule {}
