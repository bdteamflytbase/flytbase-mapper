import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { IsObject, IsOptional, IsString } from 'class-validator';
import { FlytbaseService } from './flytbase.service';
import { GeoPolygon } from '../shared-types';

class MediaInAOIDto {
  @IsObject() aoi: GeoPolygon;
  @IsOptional() @IsString() site_id?: string;
  @IsOptional() @IsString() date_from?: string;
  @IsOptional() @IsString() date_to?: string;
}

@Controller('api/flytbase')
export class FlytbaseController {
  constructor(private readonly svc: FlytbaseService) {}

  @Get('sites')
  getSites(@Headers('org-id') orgId: string) {
    return this.svc.getSites(orgId);
  }

  @Get('sites/:siteId')
  getSite(@Headers('org-id') orgId: string, @Param('siteId') siteId: string) {
    return this.svc.getSite(orgId, siteId);
  }

  @Get('sites/:siteId/missions')
  getMissions(@Headers('org-id') orgId: string, @Param('siteId') siteId: string) {
    return this.svc.getMissionsForSite(orgId, siteId);
  }

  @Get('media/filter-options')
  getFilterOptions(@Headers('org-id') orgId: string) {
    return this.svc.getMediaFilterOptions(orgId);
  }

  @Get('media/:flightId')
  getMedia(
    @Headers('org-id') orgId: string,
    @Param('flightId') flightId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.getMediaByFlight(orgId, flightId, Number(page) || 1, Number(limit) || 200);
  }

  @Post('media/in-aoi/count')
  async countMediaInAOI(@Headers('org-id') orgId: string, @Body() body: MediaInAOIDto) {
    const total = await this.svc.countMediaInAOI(orgId, body.aoi, body.site_id);
    return { total };
  }

  /** List media folders (flights) — FlytBase gallery view */
  @Post('media/folders')
  getMediaFolders(
    @Headers('org-id') orgId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Body() body?: any,
  ) {
    return this.svc.getMediaFolders(orgId, Number(page) || 1, Number(limit) || 60, body);
  }

  /** List files inside a folder (flight) */
  @Post('media/folder/:taskId')
  getFolderFiles(
    @Headers('org-id') orgId: string,
    @Param('taskId') taskId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.getFolderFiles(orgId, taskId, Number(page) || 1, Number(limit) || 60);
  }
}
