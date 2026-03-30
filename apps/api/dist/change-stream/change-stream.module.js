"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChangeStreamModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const job_schema_1 = require("../jobs/job.schema");
const change_stream_service_1 = require("./change-stream.service");
const jobs_gateway_1 = require("./jobs.gateway");
let ChangeStreamModule = class ChangeStreamModule {
};
exports.ChangeStreamModule = ChangeStreamModule;
exports.ChangeStreamModule = ChangeStreamModule = __decorate([
    (0, common_1.Module)({
        imports: [mongoose_1.MongooseModule.forFeature([{ name: job_schema_1.Job.name, schema: job_schema_1.JobSchema }])],
        providers: [change_stream_service_1.ChangeStreamService, jobs_gateway_1.JobsGateway],
    })
], ChangeStreamModule);
//# sourceMappingURL=change-stream.module.js.map