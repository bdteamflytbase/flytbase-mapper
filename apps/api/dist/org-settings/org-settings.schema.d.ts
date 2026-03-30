import { Document } from 'mongoose';
export declare class OrgSettings extends Document {
    org_id: string;
    flytbase_org_id: string;
    flytbase_service_token: string;
    flytbase_api_url: string;
}
export declare const OrgSettingsSchema: import("mongoose").Schema<OrgSettings, import("mongoose").Model<OrgSettings, any, any, any, Document<unknown, any, OrgSettings, any, {}> & OrgSettings & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, OrgSettings, Document<unknown, {}, import("mongoose").FlatRecord<OrgSettings>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<OrgSettings> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
