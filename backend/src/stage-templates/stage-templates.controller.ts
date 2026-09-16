import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { StageTemplatesService } from './stage-templates.service.js';
import { CreateStageTemplateDto } from './dto/create-stage-template.dto.js';
import { UpdateStageTemplateDto } from './dto/update-stage-template.dto.js';
import { ReorderStageTemplatesDto } from './dto/reorder-stage-templates.dto.js';
import { Roles } from '../auth/roles.decorator.js';

@Controller()
export class StageTemplatesController {
  constructor(private readonly stageTemplatesService: StageTemplatesService) {}

  @Get('service-types/:serviceTypeId/stage-templates')
  findAllForServiceType(@Param('serviceTypeId') serviceTypeId: string) {
    return this.stageTemplatesService.findAllForServiceType(serviceTypeId);
  }

  @Roles('admin')
  @Post('service-types/:serviceTypeId/stage-templates')
  create(@Param('serviceTypeId') serviceTypeId: string, @Body() dto: CreateStageTemplateDto) {
    return this.stageTemplatesService.create(serviceTypeId, dto);
  }

  @Roles('admin')
  @Patch('stage-templates/:id')
  update(@Param('id') id: string, @Body() dto: UpdateStageTemplateDto) {
    return this.stageTemplatesService.update(id, dto);
  }

  @Roles('admin')
  @Delete('stage-templates/:id')
  remove(@Param('id') id: string) {
    return this.stageTemplatesService.remove(id);
  }

  @Roles('admin')
  @Put('service-types/:serviceTypeId/stage-templates/reorder')
  reorder(@Param('serviceTypeId') serviceTypeId: string, @Body() dto: ReorderStageTemplatesDto) {
    return this.stageTemplatesService.reorder(serviceTypeId, dto.orderedIds);
  }
}
