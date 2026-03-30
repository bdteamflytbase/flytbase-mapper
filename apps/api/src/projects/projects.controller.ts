import {
  Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query,
} from '@nestjs/common';
import { IsObject, IsOptional, IsString } from 'class-validator';
import { ProjectsService } from './projects.service';
import { GeoPolygon } from '../shared-types';

class CreateProjectDto {
  @IsString() name: string;
  @IsString() site_id: string;
  @IsString() mission_id: string;
  @IsString() mission_name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsObject() aoi?: GeoPolygon;
}

class UpdateProjectDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsObject() aoi?: GeoPolygon;
}

@Controller('api/projects')
export class ProjectsController {
  constructor(private readonly svc: ProjectsService) {}

  @Get()
  list(@Headers('org-id') orgId: string, @Query('site_id') siteId?: string) {
    return this.svc.list(orgId, siteId);
  }

  @Post()
  create(@Headers('org-id') orgId: string, @Body() dto: CreateProjectDto) {
    return this.svc.create(orgId, dto);
  }

  @Get(':id')
  findOne(@Headers('org-id') orgId: string, @Param('id') id: string) {
    return this.svc.findOne(orgId, id);
  }

  @Patch(':id')
  update(
    @Headers('org-id') orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.svc.update(orgId, id, dto);
  }

  @Delete(':id')
  archive(@Headers('org-id') orgId: string, @Param('id') id: string) {
    return this.svc.archive(orgId, id);
  }

  /** The core endpoint: date → flights → files, by mission (or legacy AOI fallback) */
  @Get(':id/flights')
  getFlights(@Headers('org-id') orgId: string, @Param('id') id: string) {
    return this.svc.getFlights(orgId, id);
  }
}
