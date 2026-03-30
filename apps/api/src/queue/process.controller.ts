import { Body, Controller, Headers, Param, Post } from '@nestjs/common';
import { IsArray, IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { QueueService } from './queue.service';
import { JobsService } from '../jobs/jobs.service';
import { ProjectsService } from '../projects/projects.service';
import { OrgSettingsService } from '../org-settings/org-settings.service';

class ProcessOptionsDto {
  @IsBoolean() orthomosaic: boolean;
  @IsBoolean() mesh: boolean;
  @IsBoolean() pointcloud: boolean;
  @IsBoolean() dsm: boolean;
  @IsBoolean() dtm: boolean;
}

class StartProcessingDto {
  @IsArray() @IsString({ each: true }) selected_file_ids: string[];
  @IsArray() @IsString({ each: true }) flight_ids: string[];
  @IsArray() @IsOptional() @IsString({ each: true }) excluded_file_ids?: string[];
  @IsIn(['preview', 'medium', 'high']) quality: 'preview' | 'medium' | 'high';
  options: ProcessOptionsDto;
  @IsArray() media_files: { media_id: string; file_name: string }[];
}

@Controller('api/projects/:projectId/process')
export class ProcessController {
  constructor(
    private readonly queue: QueueService,
    private readonly jobs: JobsService,
    private readonly projects: ProjectsService,
    private readonly orgSettings: OrgSettingsService,
  ) {}

  @Post()
  async startProcessing(
    @Headers('org-id') orgId: string,
    @Param('projectId') projectId: string,
    @Body() dto: StartProcessingDto,
  ) {
    // Validate org settings exist (worker will need them)
    await this.orgSettings.getOrThrow(orgId);

    // 1. Create Job document in MongoDB with ALL data the worker needs
    const job = await this.jobs.create({
      org_id: orgId,
      project_id: projectId,
      media_files: dto.media_files,
      quality: dto.quality,
      options: dto.options,
      flight_ids: dto.flight_ids,
      selected_file_ids: dto.selected_file_ids,
      excluded_file_ids: dto.excluded_file_ids ?? [],
      image_count: dto.media_files.length,
    });

    // 2. Publish ONLY job_id to RabbitMQ — worker reads everything from MongoDB
    await this.queue.publishJobId(job._id.toString());

    return { job_id: job._id.toString(), status: 'queued' };
  }
}
