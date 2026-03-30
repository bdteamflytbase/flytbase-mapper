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
exports.OutputsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const output_schema_1 = require("./output.schema");
const storage_service_1 = require("../storage/storage.service");
const COG_TYPES = new Set(['orthomosaic', 'dsm', 'dtm']);
let OutputsService = class OutputsService {
    constructor(model, storage) {
        this.model = model;
        this.storage = storage;
    }
    async listByProject(orgId, projectId) {
        const outputs = await this.model.find({
            org_id: orgId,
            $or: [
                { project_id: projectId },
                { project_id: mongoose_2.Types.ObjectId.isValid(projectId) ? new mongoose_2.Types.ObjectId(projectId) : projectId },
            ],
        }).sort({ created_at: -1 }).exec();
        const filerBase = (process.env.SEAWEEDFS_ENDPOINT || 'http://localhost:8333')
            .replace(':8333', ':8888');
        return outputs.map((o) => {
            const base = o.toObject();
            const fileUrl = `${filerBase}/buckets/${this.storage.getBucket()}/${o.storage_key}`;
            base.download_url = fileUrl;
            if (COG_TYPES.has(o.type)) {
                const cogUrl = `s3://${this.storage.getBucket()}/${o.storage_key}`;
                base.tile_url = `${process.env.TITILER_URL}/cog/tiles/WebMercatorQuad/{z}/{x}/{y}.png?url=${encodeURIComponent(cogUrl)}`;
            }
            return base;
        });
    }
    async getDownloadUrl(orgId, outputId) {
        const o = await this.model.findOne({ _id: outputId, org_id: orgId }).exec();
        if (!o)
            throw new common_1.NotFoundException(`Output ${outputId} not found`);
        return this.storage.getPresignedUrl(o.storage_key, 900);
    }
    async getTileUrl(orgId, outputId) {
        const o = await this.model.findOne({ _id: outputId, org_id: orgId }).exec();
        if (!o)
            throw new common_1.NotFoundException(`Output ${outputId} not found`);
        if (!COG_TYPES.has(o.type))
            throw new common_1.NotFoundException('Not a tiled output');
        const cogUrl = await this.storage.getPublicUrl(o.storage_key);
        return `${process.env.TITILER_URL}/cog/tiles/WebMercatorQuad/{z}/{x}/{y}.png?url=${encodeURIComponent(cogUrl)}`;
    }
};
exports.OutputsService = OutputsService;
exports.OutputsService = OutputsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(output_schema_1.Output.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        storage_service_1.StorageService])
], OutputsService);
//# sourceMappingURL=outputs.service.js.map