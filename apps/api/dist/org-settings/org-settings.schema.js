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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrgSettingsSchema = exports.OrgSettings = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let OrgSettings = class OrgSettings extends mongoose_2.Document {
};
exports.OrgSettings = OrgSettings;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], OrgSettings.prototype, "org_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], OrgSettings.prototype, "flytbase_org_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], OrgSettings.prototype, "flytbase_service_token", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'https://api.flytbase.com' }),
    __metadata("design:type", String)
], OrgSettings.prototype, "flytbase_api_url", void 0);
exports.OrgSettings = OrgSettings = __decorate([
    (0, mongoose_1.Schema)({ collection: 'org_settings', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
], OrgSettings);
exports.OrgSettingsSchema = mongoose_1.SchemaFactory.createForClass(OrgSettings);
//# sourceMappingURL=org-settings.schema.js.map