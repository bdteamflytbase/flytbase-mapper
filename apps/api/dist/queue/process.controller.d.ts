import { QueueService } from './queue.service';
import { JobsService } from '../jobs/jobs.service';
import { ProjectsService } from '../projects/projects.service';
import { OrgSettingsService } from '../org-settings/org-settings.service';
declare class ProcessOptionsDto {
    orthomosaic: boolean;
    mesh: boolean;
    pointcloud: boolean;
    dsm: boolean;
    dtm: boolean;
}
declare class StartProcessingDto {
    selected_file_ids: string[];
    flight_ids: string[];
    excluded_file_ids?: string[];
    quality: 'preview' | 'medium' | 'high';
    options: ProcessOptionsDto;
    media_files: {
        media_id: string;
        file_name: string;
    }[];
}
export declare class ProcessController {
    private readonly queue;
    private readonly jobs;
    private readonly projects;
    private readonly orgSettings;
    constructor(queue: QueueService, jobs: JobsService, projects: ProjectsService, orgSettings: OrgSettingsService);
    startProcessing(orgId: string, projectId: string, dto: StartProcessingDto): Promise<{
        job_id: string;
        status: string;
    }>;
}
export {};
