import { Module } from '@nestjs/common';
import { FlytbaseService } from './flytbase.service';
import { FlytbaseController } from './flytbase.controller';
import { OrgSettingsModule } from '../org-settings/org-settings.module';

@Module({
  imports: [OrgSettingsModule],
  providers: [FlytbaseService],
  controllers: [FlytbaseController],
  exports: [FlytbaseService],
})
export class FlytbaseModule {}
