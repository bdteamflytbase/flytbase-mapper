"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueModule = void 0;
const common_1 = require("@nestjs/common");
const queue_service_1 = require("./queue.service");
const process_controller_1 = require("./process.controller");
const jobs_module_1 = require("../jobs/jobs.module");
const projects_module_1 = require("../projects/projects.module");
const flytbase_module_1 = require("../flytbase/flytbase.module");
const org_settings_module_1 = require("../org-settings/org-settings.module");
let QueueModule = class QueueModule {
};
exports.QueueModule = QueueModule;
exports.QueueModule = QueueModule = __decorate([
    (0, common_1.Module)({
        imports: [jobs_module_1.JobsModule, projects_module_1.ProjectsModule, flytbase_module_1.FlytbaseModule, org_settings_module_1.OrgSettingsModule],
        providers: [queue_service_1.QueueService],
        controllers: [process_controller_1.ProcessController],
        exports: [queue_service_1.QueueService],
    })
], QueueModule);
//# sourceMappingURL=queue.module.js.map