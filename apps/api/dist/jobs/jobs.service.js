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
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const job_schema_1 = require("./job.schema");
let JobsService = class JobsService {
    constructor(model) {
        this.model = model;
    }
    async create(data) {
        return this.model.create({
            ...data,
            project_id: new mongoose_2.Types.ObjectId(data.project_id),
            status: 'queued',
            progress: 0,
        });
    }
    async list(orgId, projectId, status) {
        const filter = { org_id: orgId };
        if (projectId && mongoose_2.Types.ObjectId.isValid(projectId))
            filter.project_id = new mongoose_2.Types.ObjectId(projectId);
        if (status) {
            const statuses = status.split(',').map(s => s.trim()).filter(Boolean);
            filter.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
        }
        return this.model.find(filter).sort({ created_at: -1 }).exec();
    }
    async findOne(orgId, jobId) {
        const j = await this.model.findOne({ _id: jobId, org_id: orgId }).exec();
        if (!j)
            throw new common_1.NotFoundException(`Job ${jobId} not found`);
        return j;
    }
    async findCompletedByProject(orgId, projectId) {
        return this.model.find({
            org_id: orgId,
            project_id: new mongoose_2.Types.ObjectId(projectId),
            status: 'completed',
        }).exec();
    }
    async findRunningByProject(orgId, projectId) {
        return this.model.find({
            org_id: orgId,
            project_id: new mongoose_2.Types.ObjectId(projectId),
            status: { $in: ['queued', 'downloading', 'processing'] },
        }).sort({ created_at: -1 }).exec();
    }
    async getStats(orgId) {
        const [active, completed, total] = await Promise.all([
            this.model.countDocuments({ org_id: orgId, status: { $in: ['queued', 'downloading', 'processing'] } }),
            this.model.countDocuments({ org_id: orgId, status: 'completed' }),
            this.model.countDocuments({ org_id: orgId }),
        ]);
        return { active_count: active, completed_count: completed, total_jobs: total };
    }
    async cancel(orgId, jobId) {
        await this.model.updateOne({ _id: jobId, org_id: orgId, status: { $in: ['queued'] } }, { status: 'failed', error: 'Cancelled by user' });
    }
};
exports.JobsService = JobsService;
exports.JobsService = JobsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(job_schema_1.Job.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], JobsService);
//# sourceMappingURL=jobs.service.js.map