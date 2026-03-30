"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var QueueService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueService = void 0;
const common_1 = require("@nestjs/common");
const amqplib = require("amqplib");
const QUEUE = 'mapper.jobs';
let QueueService = QueueService_1 = class QueueService {
    constructor() {
        this.logger = new common_1.Logger(QueueService_1.name);
    }
    async onModuleInit() {
        await this.connect();
    }
    async onModuleDestroy() {
        try {
            await this.channel?.close();
            await this.connection?.close();
        }
        catch { }
    }
    async connect() {
        const url = process.env.RABBITMQ_URL;
        this.connection = await amqplib.connect(url);
        this.channel = await this.connection.createChannel();
        await this.channel.assertQueue(QUEUE, { durable: true });
        this.logger.log(`Connected to RabbitMQ, queue: ${QUEUE}`);
    }
    async publishJobId(jobId) {
        const payload = Buffer.from(JSON.stringify({ job_id: jobId }));
        this.channel.sendToQueue(QUEUE, payload, { persistent: true });
        this.logger.log(`Published job ${jobId} to ${QUEUE}`);
    }
};
exports.QueueService = QueueService;
exports.QueueService = QueueService = QueueService_1 = __decorate([
    (0, common_1.Injectable)()
], QueueService);
//# sourceMappingURL=queue.service.js.map