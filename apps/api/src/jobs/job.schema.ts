import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ collection: 'jobs', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Job extends Document {
  @Prop({ required: true, index: true }) org_id: string;
  @Prop({ type: Types.ObjectId, required: true, index: true }) project_id: Types.ObjectId;
  @Prop({ default: 'queued', enum: ['queued','downloading','processing','completed','failed'] }) status: string;
  @Prop({ default: '' }) stage: string;
  @Prop({ default: 0 }) progress: number;
  @Prop({ default: '' }) message: string;
  @Prop({ default: 0 }) image_count: number;
  @Prop() started_at: Date;
  @Prop() completed_at: Date;
  @Prop() error: string;

  // Input data — worker reads these from MongoDB
  @Prop({ type: [{ media_id: String, file_name: String }], default: [] })
  media_files: { media_id: string; file_name: string }[];

  @Prop({ default: 'medium', enum: ['preview', 'medium', 'high'] }) quality: string;

  @Prop({ type: Object, default: {} })
  options: {
    orthomosaic: boolean;
    mesh: boolean;
    pointcloud: boolean;
    dsm: boolean;
    dtm: boolean;
  };

  // ETA — updated by worker on every stage change
  @Prop({ default: null }) estimated_seconds_remaining: number | null;

  // Reference IDs
  @Prop({ type: [String], default: [] }) flight_ids: string[];
  @Prop({ type: [String], default: [] }) selected_file_ids: string[];
  @Prop({ type: [String], default: [] }) excluded_file_ids: string[];
}

export const JobSchema = SchemaFactory.createForClass(Job);
JobSchema.index({ org_id: 1, project_id: 1 });
