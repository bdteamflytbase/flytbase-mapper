import { Document, Types } from 'mongoose';
export declare class Job extends Document {
    org_id: string;
    project_id: Types.ObjectId;
    status: string;
    stage: string;
    progress: number;
    message: string;
    image_count: number;
    started_at: Date;
    completed_at: Date;
    error: string;
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
    estimated_seconds_remaining: number | null;
    flight_ids: string[];
    selected_file_ids: string[];
    excluded_file_ids: string[];
}
export declare const JobSchema: import("mongoose").Schema<Job, import("mongoose").Model<Job, any, any, any, Document<unknown, any, Job, any, {}> & Job & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Job, Document<unknown, {}, import("mongoose").FlatRecord<Job>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Job> & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}>;
