import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OrgSettings } from './org-settings.schema';

@Injectable()
export class OrgSettingsService {
  constructor(@InjectModel(OrgSettings.name) private model: Model<OrgSettings>) {}

  async get(orgId: string): Promise<OrgSettings | null> {
    return this.model.findOne({ org_id: orgId }).exec();
  }

  async upsert(orgId: string, dto: {
    flytbase_org_id: string;
    flytbase_service_token: string;
    flytbase_api_url?: string;
  }): Promise<OrgSettings> {
    return this.model.findOneAndUpdate(
      { org_id: orgId },
      { ...dto, org_id: orgId },
      { upsert: true, new: true },
    ).exec();
  }

  async getOrThrow(orgId: string): Promise<OrgSettings> {
    const settings = await this.get(orgId);
    if (!settings) {
      throw new NotFoundException(
        `FlytBase integration not configured for org ${orgId}. Go to Settings and add your FlytBase service token.`,
      );
    }
    return settings;
  }
}
