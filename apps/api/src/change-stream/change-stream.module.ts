import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Job, JobSchema } from '../jobs/job.schema';
import { ChangeStreamService } from './change-stream.service';
import { JobsGateway } from './jobs.gateway';

@Module({
  imports: [MongooseModule.forFeature([{ name: Job.name, schema: JobSchema }])],
  providers: [ChangeStreamService, JobsGateway],
})
export class ChangeStreamModule {}
