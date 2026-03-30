"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ChangeStreamService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChangeStreamService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const job_schema_1 = require("../jobs/job.schema");
const jobs_gateway_1 = require("./jobs.gateway");
let ChangeStreamService = ChangeStreamService_1 = class ChangeStreamService {
    constructor(jobModel, gateway) {
        this.jobModel = jobModel;
        this.gateway = gateway;
        this.logger = new common_1.Logger(ChangeStreamService_1.name);
    }
    async onModuleInit() {
        const changeStream = this.jobModel.watch([{ $match: { operationType: { $in: ['update', 'replace'] } } }], { fullDocument: 'updateLookup' });
        changeStream.on('change', (event) => {
            const doc = event.fullDocument;
            if (!doc)
                return;
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
};
exports.ChangeStreamService = ChangeStreamService;
exports.ChangeStreamService = ChangeStreamService = ChangeStreamService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(job_schema_1.Job.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        jobs_gateway_1.JobsGateway])
], ChangeStreamService);
//# sourceMappingURL=change-stream.service.js.map