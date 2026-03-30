import { Document, Types } from 'mongoose';
export declare class Output extends Document {
    org_id: string;
    project_id: Types.ObjectId;
    job_id: Types.ObjectId;
    type: string;
    format: string;
    storage_key: string;
    size_bytes: number;
    metadata: {
        gsd_cm?: number;
        area_hectares?: number;
        point_count?: number;
        width?: number;
        height?: number;
        bounds?: [number, number, number, number];
    };
}
export declare const OutputSchema: import("mongoose").Schema<Output, import("mongoose").Model<Output, any, any, any, Document<unknown, any, Output, any, {}> & Output & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Output, Document<unknown, {}, import("mongoose").FlatRecord<Output>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Output> & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}>;
