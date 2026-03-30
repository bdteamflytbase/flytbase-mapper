import { OrgSettingsService } from '../org-settings/org-settings.service';
import { GeoPolygon, DateGroup, FBFlightGroup } from '../shared-types';
export declare class FlytbaseService {
    private readonly orgSettings;
    private readonly logger;
    constructor(orgSettings: OrgSettingsService);
    private client;
    getSites(orgId: string): Promise<any>;
    getSite(orgId: string, siteId: string): Promise<any>;
    getAllFlightsInAOI(orgId: string, aoi: GeoPolygon, options?: {
        dateFrom?: string;
        dateTo?: string;
        siteId?: string;
    }): Promise<FBFlightGroup[]>;
    getMissionsForSite(orgId: string, siteId: string): Promise<{
        mission_id: string;
        mission_name: string;
        type: number;
        site_ids: string[];
    }[]>;
    getFlightsByMission(orgId: string, missionId: string, siteId?: string): Promise<FBFlightGroup[]>;
    getMediaByFlight(orgId: string, flightId: string, page?: number, limit?: number): Promise<any>;
    getMediaFilterOptions(orgId: string): Promise<any>;
    getMediaFolders(orgId: string, page?: number, limit?: number, body?: any): Promise<any>;
    getFolderFiles(orgId: string, taskId: string, page?: number, limit?: number): Promise<any>;
    countMediaInAOI(orgId: string, aoi: GeoPolygon, siteId?: string): Promise<number>;
    groupByDate(flights: FBFlightGroup[], processedFlightIds: Set<string>, jobIdsByFlight: Map<string, string[]>, runningFlightIds?: Set<string>, runningJobsByFlight?: Map<string, {
        _id: string;
        progress: number;
        stage: string;
        status: string;
    }>): DateGroup[];
}
