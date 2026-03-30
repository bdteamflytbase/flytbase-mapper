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
exports.FlytbaseController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const flytbase_service_1 = require("./flytbase.service");
class MediaInAOIDto {
}
__decorate([
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], MediaInAOIDto.prototype, "aoi", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MediaInAOIDto.prototype, "site_id", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MediaInAOIDto.prototype, "date_from", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MediaInAOIDto.prototype, "date_to", void 0);
let FlytbaseController = class FlytbaseController {
    constructor(svc) {
        this.svc = svc;
    }
    getSites(orgId) {
        return this.svc.getSites(orgId);
    }
    getSite(orgId, siteId) {
        return this.svc.getSite(orgId, siteId);
    }
    getMissions(orgId, siteId) {
        return this.svc.getMissionsForSite(orgId, siteId);
    }
    getFilterOptions(orgId) {
        return this.svc.getMediaFilterOptions(orgId);
    }
    getMedia(orgId, flightId, page, limit) {
        return this.svc.getMediaByFlight(orgId, flightId, Number(page) || 1, Number(limit) || 200);
    }
    async countMediaInAOI(orgId, body) {
        const total = await this.svc.countMediaInAOI(orgId, body.aoi, body.site_id);
        return { total };
    }
    getMediaFolders(orgId, page, limit, body) {
        return this.svc.getMediaFolders(orgId, Number(page) || 1, Number(limit) || 60, body);
    }
    getFolderFiles(orgId, taskId, page, limit) {
        return this.svc.getFolderFiles(orgId, taskId, Number(page) || 1, Number(limit) || 60);
    }
};
exports.FlytbaseController = FlytbaseController;
__decorate([
    (0, common_1.Get)('sites'),
    __param(0, (0, common_1.Headers)('org-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], FlytbaseController.prototype, "getSites", null);
__decorate([
    (0, common_1.Get)('sites/:siteId'),
    __param(0, (0, common_1.Headers)('org-id')),
    __param(1, (0, common_1.Param)('siteId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], FlytbaseController.prototype, "getSite", null);
__decorate([
    (0, common_1.Get)('sites/:siteId/missions'),
    __param(0, (0, common_1.Headers)('org-id')),
    __param(1, (0, common_1.Param)('siteId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], FlytbaseController.prototype, "getMissions", null);
__decorate([
    (0, common_1.Get)('media/filter-options'),
    __param(0, (0, common_1.Headers)('org-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], FlytbaseController.prototype, "getFilterOptions", null);
__decorate([
    (0, common_1.Get)('media/:flightId'),
    __param(0, (0, common_1.Headers)('org-id')),
    __param(1, (0, common_1.Param)('flightId')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], FlytbaseController.prototype, "getMedia", null);
__decorate([
    (0, common_1.Post)('media/in-aoi/count'),
    __param(0, (0, common_1.Headers)('org-id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, MediaInAOIDto]),
    __metadata("design:returntype", Promise)
], FlytbaseController.prototype, "countMediaInAOI", null);
__decorate([
    (0, common_1.Post)('media/folders'),
    __param(0, (0, common_1.Headers)('org-id')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], FlytbaseController.prototype, "getMediaFolders", null);
__decorate([
    (0, common_1.Post)('media/folder/:taskId'),
    __param(0, (0, common_1.Headers)('org-id')),
    __param(1, (0, common_1.Param)('taskId')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], FlytbaseController.prototype, "getFolderFiles", null);
exports.FlytbaseController = FlytbaseController = __decorate([
    (0, common_1.Controller)('api/flytbase'),
    __metadata("design:paramtypes", [flytbase_service_1.FlytbaseService])
], FlytbaseController);
//# sourceMappingURL=flytbase.controller.js.map