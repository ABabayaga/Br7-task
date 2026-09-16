import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { PhasesService } from './phases.service.js';
import { CreatePhaseDto } from './dto/create-phase.dto.js';
import { UpdatePhaseDto } from './dto/update-phase.dto.js';
import { ReorderPhasesDto } from './dto/reorder-phases.dto.js';
import { Roles } from '../auth/roles.decorator.js';

@Controller()
export class PhasesController {
  constructor(private readonly phasesService: PhasesService) {}

  @Get('service-types/:serviceTypeId/phases')
  findAllForServiceType(@Param('serviceTypeId') serviceTypeId: string) {
    return this.phasesService.findAllForServiceType(serviceTypeId);
  }

  @Roles('admin')
  @Post('service-types/:serviceTypeId/phases')
  create(@Param('serviceTypeId') serviceTypeId: string, @Body() dto: CreatePhaseDto) {
    return this.phasesService.create(serviceTypeId, dto);
  }

  @Roles('admin')
  @Patch('phases/:id')
  update(@Param('id') id: string, @Body() dto: UpdatePhaseDto) {
    return this.phasesService.update(id, dto);
  }

  @Roles('admin')
  @Delete('phases/:id')
  remove(@Param('id') id: string) {
    return this.phasesService.remove(id);
  }

  @Roles('admin')
  @Put('service-types/:serviceTypeId/phases/reorder')
  reorder(@Param('serviceTypeId') serviceTypeId: string, @Body() dto: ReorderPhasesDto) {
    return this.phasesService.reorder(serviceTypeId, dto.orderedIds);
  }
}
