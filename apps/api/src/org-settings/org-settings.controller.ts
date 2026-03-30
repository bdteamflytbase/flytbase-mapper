import { Body, Controller, Get, Headers, Put } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { OrgSettingsService } from './org-settings.service';

class UpsertOrgSettingsDto {
  @IsString() flytbase_org_id: string;
  @IsString() flytbase_service_token: string;
  @IsOptional() @IsString() flytbase_api_url?: string;
}

@Controller('api/org/settings')
export class OrgSettingsController {
  constructor(private readonly svc: OrgSettingsService) {}

  @Get()
  async get(@Headers('org-id') orgId: string) {
    const s = await this.svc.get(orgId);
    if (!s) return { configured: false };
    return {
      configured: true,
      flytbase_org_id: s.flytbase_org_id,
      flytbase_api_url: s.flytbase_api_url,
      // Never return the token to the client
    };
  }

  @Put()
  async upsert(@Headers('org-id') orgId: string, @Body() dto: UpsertOrgSettingsDto) {
    await this.svc.upsert(orgId, dto);
    return { success: true };
  }
}
