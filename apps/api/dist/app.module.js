"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const serve_static_1 = require("@nestjs/serve-static");
const path_1 = require("path");
const org_settings_module_1 = require("./org-settings/org-settings.module");
const flytbase_module_1 = require("./flytbase/flytbase.module");
const projects_module_1 = require("./projects/projects.module");
const jobs_module_1 = require("./jobs/jobs.module");
const outputs_module_1 = require("./outputs/outputs.module");
const queue_module_1 = require("./queue/queue.module");
const storage_module_1 = require("./storage/storage.module");
const change_stream_module_1 = require("./change-stream/change-stream.module");
const health_module_1 = require("./health/health.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forRoot(process.env.MONGODB_URI, {
                dbName: 'mapper',
                serverSelectionTimeoutMS: 5000,
                connectTimeoutMS: 10000,
            }),
            serve_static_1.ServeStaticModule.forRoot({
                rootPath: (0, path_1.join)(__dirname, '..', 'web', 'dist'),
                exclude: ['/api/(.*)'],
                serveStaticOptions: { fallthrough: true },
            }),
            org_settings_module_1.OrgSettingsModule,
            flytbase_module_1.FlytbaseModule,
            projects_module_1.ProjectsModule,
            jobs_module_1.JobsModule,
            outputs_module_1.OutputsModule,
            queue_module_1.QueueModule,
            storage_module_1.StorageModule,
            change_stream_module_1.ChangeStreamModule,
            health_module_1.HealthModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map