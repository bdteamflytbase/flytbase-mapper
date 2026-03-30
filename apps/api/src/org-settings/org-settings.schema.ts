import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'org_settings', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class OrgSettings extends Document {
  @Prop({ required: true, index: true }) org_id: string;
  @Prop({ required: true }) flytbase_org_id: string;
  @Prop({ required: true }) flytbase_service_token: string;
  @Prop({ default: 'https://api.flytbase.com' }) flytbase_api_url: string;
}

export const OrgSettingsSchema = SchemaFactory.createForClass(OrgSettings);
