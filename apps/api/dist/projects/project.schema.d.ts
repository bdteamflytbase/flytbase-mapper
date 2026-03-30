import { Document } from 'mongoose';
export declare class Project extends Document {
    org_id: string;
    site_id: string;
    name: string;
    description: string;
    mission_id: string;
    mission_name: string;
    aoi: {
        type: string;
        coordinates: [number, number][][];
    };
    thumbnail_url: string;
    status: string;
    created_by: string;
}
export declare const ProjectSchema: import("mongoose").Schema<Project, import("mongoose").Model<Project, any, any, any, Document<unknown, any, Project, any, {}> & Project & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Project, Document<unknown, {}, import("mongoose").FlatRecord<Project>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Project> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
