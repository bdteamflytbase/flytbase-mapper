import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'projects', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Project extends Document {
  @Prop({ required: true, index: true }) org_id: string;
  @Prop({ required: true }) site_id: string;
  @Prop({ required: true }) name: string;
  @Prop() description: string;

  @Prop() mission_id: string;
  @Prop() mission_name: string;

  @Prop({
    type: {
      type: String,
      enum: ['Polygon'],
    },
    coordinates: { type: [[[Number]]] },
  })
  aoi: { type: string; coordinates: [number, number][][] };

  @Prop() thumbnail_url: string;
  @Prop({ default: 'active', enum: ['active', 'archived'] }) status: string;
  @Prop() created_by: string;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
ProjectSchema.index({ org_id: 1, site_id: 1 });
