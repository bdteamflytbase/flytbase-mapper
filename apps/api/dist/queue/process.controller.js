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
exports.ProcessController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const queue_service_1 = require("./queue.service");
const jobs_service_1 = require("../jobs/jobs.service");
const projects_service_1 = require("../projects/projects.service");
const org_settings_service_1 = require("../org-settings/org-settings.service");
class ProcessOptionsDto {
}
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ProcessOptionsDto.prototype, "orthomosaic", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ProcessOptionsDto.prototype, "mesh", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ProcessOptionsDto.prototype, "pointcloud", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ProcessOptionsDto.prototype, "dsm", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ProcessOptionsDto.prototype, "dtm", void 0);
class StartProcessingDto {
}
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], StartProcessingDto.prototype, "selected_file_ids", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], StartProcessingDto.prototype, "flight_ids", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], StartProcessingDto.prototype, "excluded_file_ids", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['preview', 'medium', 'high']),
    __metadata("design:type", String)
], StartProcessingDto.prototype, "quality", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], StartProcessingDto.prototype, "media_files", void 0);
let ProcessController = class ProcessController {
    constructor(queue, jobs, projects, orgSettings) {
        this.queue = queue;
        this.jobs = jobs;
        this.projects = projects;
        this.orgSettings = orgSettings;
    }
    async startProcessing(orgId, projectId, dto) {
        await this.orgSettings.getOrThrow(orgId);
        const job = await this.jobs.create({
            org_id: orgId,
            project_id: projectId,
            media_files: dto.media_files,
            quality: dto.quality,
            options: dto.options,
            flight_ids: dto.flight_ids,
            selected_file_ids: dto.selected_file_ids,
            excluded_file_ids: dto.excluded_file_ids ?? [],
            image_count: dto.media_files.length,
        });
        await this.queue.publishJobId(job._id.toString());
        return { job_id: job._id.toString(), status: 'queued' };
    }
};
exports.ProcessController = ProcessController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Headers)('org-id')),
    __param(1, (0, common_1.Param)('projectId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, StartProcessingDto]),
    __metadata("design:returntype", Promise)
], ProcessController.prototype, "startProcessing", null);
exports.ProcessController = ProcessController = __decorate([
    (0, common_1.Controller)('api/projects/:projectId/process'),
    __metadata("design:paramtypes", [queue_service_1.QueueService,
        jobs_service_1.JobsService,
        projects_service_1.ProjectsService,
        org_settings_service_1.OrgSettingsService])
], ProcessController);
//# sourceMappingURL=process.controller.js.map