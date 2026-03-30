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
exports.JobsGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
let JobsGateway = class JobsGateway {
    handleSubscribe(data, client) {
        client.join(`job:${data.job_id}`);
    }
    handleSubscribeOrg(data, client) {
        client.join(`org:${data.org_id}`);
    }
    emitJobUpdate(orgId, payload) {
        this.server.to(`org:${orgId}`).emit('job:update', payload);
        this.server.to(`job:${payload.job_id}`).emit('job:update', payload);
    }
    emitJobCompleted(orgId, jobId, projectId) {
        this.server.to(`org:${orgId}`).emit('job:completed', { job_id: jobId, project_id: projectId });
    }
    emitJobFailed(orgId, jobId, projectId, error) {
        this.server.to(`org:${orgId}`).emit('job:failed', { job_id: jobId, project_id: projectId, error });
    }
};
exports.JobsGateway = JobsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], JobsGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('subscribe_job'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], JobsGateway.prototype, "handleSubscribe", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('subscribe_org'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], JobsGateway.prototype, "handleSubscribeOrg", null);
exports.JobsGateway = JobsGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({ cors: { origin: '*' }, namespace: '/' })
], JobsGateway);
//# sourceMappingURL=jobs.gateway.js.map