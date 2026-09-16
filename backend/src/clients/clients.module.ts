import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsService } from './clients.service.js';
import { ClientsController } from './clients.controller.js';
import { Client, ClientSchema } from './schemas/client.schema.js';
import {
  ClientServiceOverride,
  ClientServiceOverrideSchema,
} from './schemas/client-service-override.schema.js';
import { StageTemplatesModule } from '../stage-templates/stage-templates.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Client.name, schema: ClientSchema },
      { name: ClientServiceOverride.name, schema: ClientServiceOverrideSchema },
    ]),
    StageTemplatesModule,
  ],
  providers: [ClientsService],
  controllers: [ClientsController],
  exports: [ClientsService],
})
export class ClientsModule {}
