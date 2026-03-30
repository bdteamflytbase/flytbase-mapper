import { OnModuleInit } from '@nestjs/common';
import { Model } from 'mongoose';
import { Job } from '../jobs/job.schema';
import { JobsGateway } from './jobs.gateway';
export declare class ChangeStreamService implements OnModuleInit {
    private jobModel;
    private readonly gateway;
    private readonly logger;
    constructor(jobModel: Model<Job>, gateway: JobsGateway);
    onModuleInit(): Promise<void>;
}
