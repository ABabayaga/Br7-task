import { Body, Controller, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { ClientsService } from './clients.service.js';
import { CreateClientDto } from './dto/create-client.dto.js';
import { UpdateClientDto } from './dto/update-client.dto.js';
import { UpdateClientOverrideDto } from './dto/update-client-override.dto.js';
import { Roles } from '../auth/roles.decorator.js';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  findAll() {
    return this.clientsService.findAll();
  }

  @Roles('admin')
  @Post()
  create(@Body() dto: CreateClientDto) {
    return this.clientsService.create(dto);
  }

  @Roles('admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClientDto) {
    return this.clientsService.update(id, dto);
  }

  @Get(':id/overrides/:serviceTypeId')
  async getOverride(@Param('id') id: string, @Param('serviceTypeId') serviceTypeId: string) {
    const disabledStageTemplateIds = await this.clientsService.getDisabledStageTemplateIds(
      id,
      serviceTypeId,
    );
    return { disabledStageTemplateIds };
  }

  @Roles('admin')
  @Put(':id/overrides/:serviceTypeId')
  setOverride(
    @Param('id') id: string,
    @Param('serviceTypeId') serviceTypeId: string,
    @Body() dto: UpdateClientOverrideDto,
  ) {
    return this.clientsService.setDisabledStages(id, serviceTypeId, dto.disabledStageTemplateIds);
  }
}
