import { Model } from 'mongoose';
import { OrgSettings } from './org-settings.schema';
export declare class OrgSettingsService {
    private model;
    constructor(model: Model<OrgSettings>);
    get(orgId: string): Promise<OrgSettings | null>;
    upsert(orgId: string, dto: {
        flytbase_org_id: string;
        flytbase_service_token: string;
        flytbase_api_url?: string;
    }): Promise<OrgSettings>;
    getOrThrow(orgId: string): Promise<OrgSettings>;
}
