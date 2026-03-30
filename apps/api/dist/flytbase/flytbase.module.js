"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlytbaseModule = void 0;
const common_1 = require("@nestjs/common");
const flytbase_service_1 = require("./flytbase.service");
const flytbase_controller_1 = require("./flytbase.controller");
const org_settings_module_1 = require("../org-settings/org-settings.module");
let FlytbaseModule = class FlytbaseModule {
};
exports.FlytbaseModule = FlytbaseModule;
exports.FlytbaseModule = FlytbaseModule = __decorate([
    (0, common_1.Module)({
        imports: [org_settings_module_1.OrgSettingsModule],
        providers: [flytbase_service_1.FlytbaseService],
        controllers: [flytbase_controller_1.FlytbaseController],
        exports: [flytbase_service_1.FlytbaseService],
    })
], FlytbaseModule);
//# sourceMappingURL=flytbase.module.js.map