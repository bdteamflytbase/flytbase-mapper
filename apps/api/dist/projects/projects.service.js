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
exports.ProjectsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const project_schema_1 = require("./project.schema");
const flytbase_service_1 = require("../flytbase/flytbase.service");
const jobs_service_1 = require("../jobs/jobs.service");
let ProjectsService = class ProjectsService {
    constructor(model, fb, jobs) {
        this.model = model;
        this.fb = fb;
        this.jobs = jobs;
    }
    async list(orgId, siteId) {
        const filter = { org_id: orgId, status: 'active' };
        if (siteId)
            filter.site_id = siteId;
        return this.model.find(filter).sort({ created_at: -1 }).exec();
    }
    async create(orgId, dto) {
        return this.model.create({ ...dto, org_id: orgId });
    }
    async findOne(orgId, projectId) {
        const p = await this.model.findOne({ _id: projectId, org_id: orgId }).exec();
        if (!p)
            throw new common_1.NotFoundException(`Project ${projectId} not found`);
        return p;
    }
    async update(orgId, projectId, dto) {
        const p = await this.model.findOneAndUpdate({ _id: projectId, org_id: orgId }, { $set: dto }, { new: true }).exec();
        if (!p)
            throw new common_1.NotFoundException(`Project ${projectId} not found`);
        return p;
    }
    async archive(orgId, projectId) {
        await this.model.updateOne({ _id: projectId, org_id: orgId }, { status: 'archived' });
    }
    async getFlights(orgId, projectId) {
        const project = await this.findOne(orgId, projectId);
        let allFlights;
        if (project.mission_id) {
            allFlights = await this.fb.getFlightsByMission(orgId, project.mission_id, project.site_id);
        }
        else {
            const aoi = project.aoi;
            allFlights = await this.fb.getAllFlightsInAOI(orgId, aoi, {
                siteId: project.site_id,
            });
        }
        const [completedJobs, runningJobs] = await Promise.all([
            this.jobs.findCompletedByProject(orgId, projectId),
            this.jobs.findRunningByProject(orgId, projectId),
        ]);
        const processedFlightIds = new Set();
        const jobIdsByFlight = new Map();
        const runningFlightIds = new Set();
        const runningJobsByFlight = new Map();
        for (const job of completedJobs) {
            const sel = job.flight_ids ?? [];
            for (const fid of sel) {
                processedFlightIds.add(fid);
                if (!jobIdsByFlight.has(fid))
                    jobIdsByFlight.set(fid, []);
                jobIdsByFlight.get(fid).push(job._id.toString());
            }
        }
        for (const job of runningJobs) {
            const sel = job.flight_ids ?? [];
            for (const fid of sel) {
                runningFlightIds.add(fid);
                runningJobsByFlight.set(fid, {
                    _id: job._id.toString(),
                    progress: job.progress ?? 0,
                    stage: job.stage ?? '',
                    status: job.status ?? 'queued',
                });
            }
        }
        return this.fb.groupByDate(allFlights, processedFlightIds, jobIdsByFlight, runningFlightIds, runningJobsByFlight);
    }
    async getFlightsInAOI(orgId, projectId) {
        return this.getFlights(orgId, projectId);
    }
};
exports.ProjectsService = ProjectsService;
exports.ProjectsService = ProjectsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(project_schema_1.Project.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        flytbase_service_1.FlytbaseService,
        jobs_service_1.JobsService])
], ProjectsService);
//# sourceMappingURL=projects.service.js.map