import { FlytbaseService } from './flytbase.service';
import { GeoPolygon } from '../shared-types';
declare class MediaInAOIDto {
    aoi: GeoPolygon;
    site_id?: string;
    date_from?: string;
    date_to?: string;
}
export declare class FlytbaseController {
    private readonly svc;
    constructor(svc: FlytbaseService);
    getSites(orgId: string): Promise<any>;
    getSite(orgId: string, siteId: string): Promise<any>;
    getMissions(orgId: string, siteId: string): Promise<{
        mission_id: string;
        mission_name: string;
        type: number;
        site_ids: string[];
    }[]>;
    getFilterOptions(orgId: string): Promise<any>;
    getMedia(orgId: string, flightId: string, page?: string, limit?: string): Promise<any>;
    countMediaInAOI(orgId: string, body: MediaInAOIDto): Promise<{
        total: number;
    }>;
    getMediaFolders(orgId: string, page?: string, limit?: string, body?: any): Promise<any>;
    getFolderFiles(orgId: string, taskId: string, page?: string, limit?: string): Promise<any>;
}
export {};
