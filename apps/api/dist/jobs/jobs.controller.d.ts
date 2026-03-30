import { JobsService } from './jobs.service';
export declare class JobsController {
    private readonly svc;
    constructor(svc: JobsService);
    list(orgId: string, projectId?: string, status?: string): Promise<import("./job.schema").Job[]>;
    stats(orgId: string): Promise<{
        active_count: number;
        completed_count: number;
        total_jobs: number;
    }>;
    findOne(orgId: string, id: string): Promise<import("./job.schema").Job>;
    cancel(orgId: string, id: string): Promise<void>;
}
