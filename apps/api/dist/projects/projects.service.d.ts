import { Model } from 'mongoose';
import { Project } from './project.schema';
import { FlytbaseService } from '../flytbase/flytbase.service';
import { JobsService } from '../jobs/jobs.service';
import { GeoPolygon } from '../shared-types';
export declare class ProjectsService {
    private model;
    private readonly fb;
    private readonly jobs;
    constructor(model: Model<Project>, fb: FlytbaseService, jobs: JobsService);
    list(orgId: string, siteId?: string): Promise<Project[]>;
    create(orgId: string, dto: {
        name: string;
        site_id: string;
        mission_id: string;
        mission_name: string;
        description?: string;
        created_by?: string;
        aoi?: GeoPolygon;
    }): Promise<Project>;
    findOne(orgId: string, projectId: string): Promise<Project>;
    update(orgId: string, projectId: string, dto: Partial<{
        name: string;
        description: string;
        aoi: GeoPolygon;
        thumbnail_url: string;
    }>): Promise<Project>;
    archive(orgId: string, projectId: string): Promise<void>;
    getFlights(orgId: string, projectId: string): Promise<import("../shared-types").DateGroup[]>;
    getFlightsInAOI(orgId: string, projectId: string): Promise<import("../shared-types").DateGroup[]>;
}
