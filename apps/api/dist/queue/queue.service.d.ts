import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
export declare class QueueService implements OnModuleInit, OnModuleDestroy {
    private readonly logger;
    private connection;
    private channel;
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    private connect;
    publishJobId(jobId: string): Promise<void>;
}
