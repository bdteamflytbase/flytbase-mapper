import { Model } from 'mongoose';
import { Job } from './job.schema';
export declare class JobsService {
    private model;
    constructor(model: Model<Job>);
    create(data: {
        org_id: string;
        project_id: string;
        media_files: {
            media_id: string;
            file_name: string;
        }[];
        quality: string;
        options: {
            orthomosaic: boolean;
            mesh: boolean;
            pointcloud: boolean;
            dsm: boolean;
            dtm: boolean;
        };
        flight_ids: string[];
        selected_file_ids: string[];
        excluded_file_ids: string[];
        image_count: number;
    }): Promise<Job>;
    list(orgId: string, projectId?: string, status?: string): Promise<Job[]>;
    findOne(orgId: string, jobId: string): Promise<Job>;
    findCompletedByProject(orgId: string, projectId: string): Promise<Job[]>;
    findRunningByProject(orgId: string, projectId: string): Promise<Job[]>;
    getStats(orgId: string): Promise<{
        active_count: number;
        completed_count: number;
        total_jobs: number;
    }>;
    cancel(orgId: string, jobId: string): Promise<void>;
}
