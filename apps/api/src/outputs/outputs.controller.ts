import { Controller, Get, Headers, Param } from '@nestjs/common';
import { OutputsService } from './outputs.service';

@Controller('api')
export class OutputsController {
  constructor(private readonly svc: OutputsService) {}

  @Get('projects/:projectId/outputs')
  listByProject(
    @Headers('org-id') orgId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.svc.listByProject(orgId, projectId);
  }

  @Get('outputs/:id/download')
  async getDownload(@Headers('org-id') orgId: string, @Param('id') id: string) {
    const url = await this.svc.getDownloadUrl(orgId, id);
    return { url };
  }

  @Get('outputs/:id/tiles')
  async getTiles(@Headers('org-id') orgId: string, @Param('id') id: string) {
    const url = await this.svc.getTileUrl(orgId, id);
    return { tile_url: url };
  }
}
