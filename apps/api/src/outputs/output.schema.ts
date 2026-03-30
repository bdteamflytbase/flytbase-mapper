import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ collection: 'outputs', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Output extends Document {
  @Prop({ required: true, index: true }) org_id: string;
  @Prop({ type: Types.ObjectId, required: true, index: true }) project_id: Types.ObjectId;
  @Prop({ type: Types.ObjectId, required: true }) job_id: Types.ObjectId;
  @Prop({ required: true, enum: ['orthomosaic','mesh','pointcloud','dsm','dtm','thumbnail'] }) type: string;
  @Prop({ required: true }) format: string;
  @Prop({ required: true }) storage_key: string;
  @Prop({ default: 0 }) size_bytes: number;
  @Prop({ type: Object, default: {} }) metadata: {
    gsd_cm?: number;
    area_hectares?: number;
    point_count?: number;
    width?: number;
    height?: number;
    bounds?: [number, number, number, number];
  };
}

export const OutputSchema = SchemaFactory.createForClass(Output);
OutputSchema.index({ org_id: 1, project_id: 1 });
