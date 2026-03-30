import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Job } from '../jobs/job.schema';
import { JobsGateway } from './jobs.gateway';

@Injectable()
export class ChangeStreamService implements OnModuleInit {
  private readonly logger = new Logger(ChangeStreamService.name);

  constructor(
    @InjectModel(Job.name) private jobModel: Model<Job>,
    private readonly gateway: JobsGateway,
  ) {}

  async onModuleInit() {
    // Watch the jobs collection for updates from the Python worker
    const changeStream = this.jobModel.watch(
      [{ $match: { operationType: { $in: ['update', 'replace'] } } }],
      { fullDocument: 'updateLookup' },
    );

    changeStream.on('change', (event: any) => {
      const doc = event.fullDocument;
      if (!doc) return;

      const payload = {
        job_id: doc._id.toString(),
        project_id: doc.project_id?.toString(),
        status: doc.status,
        stage: doc.stage,
        progress: doc.progress,
        message: doc.message,
        estimated_seconds_remaining: doc.estimated_seconds_remaining ?? null,
      };

      this.gateway.emitJobUpdate(doc.org_id, payload);

      if (doc.status === 'completed') {
        this.gateway.emitJobCompleted(doc.org_id, doc._id.toString(), doc.project_id?.toString());
      }
      if (doc.status === 'failed') {
        this.gateway.emitJobFailed(doc.org_id, doc._id.toString(), doc.project_id?.toString(), doc.error);
      }
    });

    changeStream.on('error', (err) => {
      this.logger.error('Change stream error:', err.message);
    });

    this.logger.log('MongoDB change stream watching jobs collection');
  }
}
