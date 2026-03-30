import { Controller, Delete, Get, Headers, Param, Query } from '@nestjs/common';
import { JobsService } from './jobs.service';

@Controller('api/jobs')
export class JobsController {
  constructor(private readonly svc: JobsService) {}

  @Get()
  list(
    @Headers('org-id') orgId: string,
    @Query('project_id') projectId?: string,
    @Query('status') status?: string,
  ) {
    return this.svc.list(orgId, projectId, status);
  }

  @Get('stats')
  stats(@Headers('org-id') orgId: string) {
    return this.svc.getStats(orgId);
  }

  @Get(':id')
  findOne(@Headers('org-id') orgId: string, @Param('id') id: string) {
    return this.svc.findOne(orgId, id);
  }

  @Delete(':id')
  cancel(@Headers('org-id') orgId: string, @Param('id') id: string) {
    return this.svc.cancel(orgId, id);
  }
}
