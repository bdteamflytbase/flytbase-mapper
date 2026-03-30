import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as amqplib from 'amqplib';

const QUEUE = 'mapper.jobs';

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private connection: any;
  private channel: any;

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    try {
      await this.channel?.close();
      await this.connection?.close();
    } catch {}
  }

  private async connect() {
    const url = process.env.RABBITMQ_URL;
    this.connection = await amqplib.connect(url);
    this.channel = await this.connection.createChannel();
    await this.channel.assertQueue(QUEUE, { durable: true });
    this.logger.log(`Connected to RabbitMQ, queue: ${QUEUE}`);
  }

  /**
   * Publish just the job_id to RabbitMQ.
   * The worker reads all job data from MongoDB — the message is intentionally tiny.
   */
  async publishJobId(jobId: string): Promise<void> {
    const payload = Buffer.from(JSON.stringify({ job_id: jobId }));
    this.channel.sendToQueue(QUEUE, payload, { persistent: true });
    this.logger.log(`Published job ${jobId} to ${QUEUE}`);
  }
}
