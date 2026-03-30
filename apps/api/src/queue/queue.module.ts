import { Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { ProcessController } from './process.controller';
import { JobsModule } from '../jobs/jobs.module';
import { ProjectsModule } from '../projects/projects.module';
import { FlytbaseModule } from '../flytbase/flytbase.module';
import { OrgSettingsModule } from '../org-settings/org-settings.module';

@Module({
  imports: [JobsModule, ProjectsModule, FlytbaseModule, OrgSettingsModule],
  providers: [QueueService],
  controllers: [ProcessController],
  exports: [QueueService],
})
export class QueueModule {}
