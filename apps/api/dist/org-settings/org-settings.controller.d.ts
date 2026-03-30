import { OrgSettingsService } from './org-settings.service';
declare class UpsertOrgSettingsDto {
    flytbase_org_id: string;
    flytbase_service_token: string;
    flytbase_api_url?: string;
}
export declare class OrgSettingsController {
    private readonly svc;
    constructor(svc: OrgSettingsService);
    get(orgId: string): Promise<{
        configured: boolean;
        flytbase_org_id?: undefined;
        flytbase_api_url?: undefined;
    } | {
        configured: boolean;
        flytbase_org_id: string;
        flytbase_api_url: string;
    }>;
    upsert(orgId: string, dto: UpsertOrgSettingsDto): Promise<{
        success: boolean;
    }>;
}
export {};
