import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { OrgSettingsModule } from './org-settings/org-settings.module';
import { FlytbaseModule } from './flytbase/flytbase.module';
import { ProjectsModule } from './projects/projects.module';
import { JobsModule } from './jobs/jobs.module';
import { OutputsModule } from './outputs/outputs.module';
import { QueueModule } from './queue/queue.module';
import { StorageModule } from './storage/storage.module';
import { ChangeStreamModule } from './change-stream/change-stream.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI, {
      dbName: 'mapper',
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    }),

    // Serve React build at root (NestJS serves everything on port 3000)
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'web', 'dist'),
      exclude: ['/api/(.*)'],
      serveStaticOptions: { fallthrough: true },
    }),

    OrgSettingsModule,
    FlytbaseModule,
    ProjectsModule,
    JobsModule,
    OutputsModule,
    QueueModule,
    StorageModule,
    ChangeStreamModule,
    HealthModule,
  ],
})
export class AppModule {}
