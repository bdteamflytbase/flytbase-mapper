import { ProjectsService } from './projects.service';
import { GeoPolygon } from '../shared-types';
declare class CreateProjectDto {
    name: string;
    site_id: string;
    mission_id: string;
    mission_name: string;
    description?: string;
    aoi?: GeoPolygon;
}
declare class UpdateProjectDto {
    name?: string;
    description?: string;
    aoi?: GeoPolygon;
}
export declare class ProjectsController {
    private readonly svc;
    constructor(svc: ProjectsService);
    list(orgId: string, siteId?: string): Promise<import("./project.schema").Project[]>;
    create(orgId: string, dto: CreateProjectDto): Promise<import("./project.schema").Project>;
    findOne(orgId: string, id: string): Promise<import("./project.schema").Project>;
    update(orgId: string, id: string, dto: UpdateProjectDto): Promise<import("./project.schema").Project>;
    archive(orgId: string, id: string): Promise<void>;
    getFlights(orgId: string, id: string): Promise<import("../shared-types").DateGroup[]>;
}
export {};
