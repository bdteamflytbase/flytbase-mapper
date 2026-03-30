"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutputsModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const output_schema_1 = require("./output.schema");
const outputs_controller_1 = require("./outputs.controller");
const outputs_service_1 = require("./outputs.service");
const storage_module_1 = require("../storage/storage.module");
let OutputsModule = class OutputsModule {
};
exports.OutputsModule = OutputsModule;
exports.OutputsModule = OutputsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([{ name: output_schema_1.Output.name, schema: output_schema_1.OutputSchema }]),
            storage_module_1.StorageModule,
        ],
        controllers: [outputs_controller_1.OutputsController],
        providers: [outputs_service_1.OutputsService],
        exports: [outputs_service_1.OutputsService],
    })
], OutputsModule);
//# sourceMappingURL=outputs.module.js.map