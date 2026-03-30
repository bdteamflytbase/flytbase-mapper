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
exports.OrgSettingsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const org_settings_schema_1 = require("./org-settings.schema");
let OrgSettingsService = class OrgSettingsService {
    constructor(model) {
        this.model = model;
    }
    async get(orgId) {
        return this.model.findOne({ org_id: orgId }).exec();
    }
    async upsert(orgId, dto) {
        return this.model.findOneAndUpdate({ org_id: orgId }, { ...dto, org_id: orgId }, { upsert: true, new: true }).exec();
    }
    async getOrThrow(orgId) {
        const settings = await this.get(orgId);
        if (!settings) {
            throw new common_1.NotFoundException(`FlytBase integration not configured for org ${orgId}. Go to Settings and add your FlytBase service token.`);
        }
        return settings;
    }
};
exports.OrgSettingsService = OrgSettingsService;
exports.OrgSettingsService = OrgSettingsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(org_settings_schema_1.OrgSettings.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], OrgSettingsService);
//# sourceMappingURL=org-settings.service.js.map