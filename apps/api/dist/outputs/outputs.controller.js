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
exports.OutputsController = void 0;
const common_1 = require("@nestjs/common");
const outputs_service_1 = require("./outputs.service");
let OutputsController = class OutputsController {
    constructor(svc) {
        this.svc = svc;
    }
    listByProject(orgId, projectId) {
        return this.svc.listByProject(orgId, projectId);
    }
    async getDownload(orgId, id) {
        const url = await this.svc.getDownloadUrl(orgId, id);
        return { url };
    }
    async getTiles(orgId, id) {
        const url = await this.svc.getTileUrl(orgId, id);
        return { tile_url: url };
    }
};
exports.OutputsController = OutputsController;
__decorate([
    (0, common_1.Get)('projects/:projectId/outputs'),
    __param(0, (0, common_1.Headers)('org-id')),
    __param(1, (0, common_1.Param)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], OutputsController.prototype, "listByProject", null);
__decorate([
    (0, common_1.Get)('outputs/:id/download'),
    __param(0, (0, common_1.Headers)('org-id')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], OutputsController.prototype, "getDownload", null);
__decorate([
    (0, common_1.Get)('outputs/:id/tiles'),
    __param(0, (0, common_1.Headers)('org-id')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], OutputsController.prototype, "getTiles", null);
exports.OutputsController = OutputsController = __decorate([
    (0, common_1.Controller)('api'),
    __metadata("design:paramtypes", [outputs_service_1.OutputsService])
], OutputsController);
//# sourceMappingURL=outputs.controller.js.map