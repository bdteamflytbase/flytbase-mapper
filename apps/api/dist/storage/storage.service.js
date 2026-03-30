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
var StorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const common_1 = require("@nestjs/common");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
let StorageService = StorageService_1 = class StorageService {
    constructor() {
        this.logger = new common_1.Logger(StorageService_1.name);
        this.endpoint = process.env.SEAWEEDFS_ENDPOINT || 'http://localhost:8888';
        this.bucket = process.env.SEAWEEDFS_BUCKET || 'mapper';
        this.client = new client_s3_1.S3Client({
            endpoint: this.endpoint,
            region: 'us-east-1',
            credentials: {
                accessKeyId: process.env.SEAWEEDFS_ACCESS_KEY || '',
                secretAccessKey: process.env.SEAWEEDFS_SECRET_KEY || '',
            },
            forcePathStyle: true,
        });
    }
    getBucket() {
        return this.bucket;
    }
    async getPresignedUrl(key, expiresIn = 3600) {
        const cmd = new client_s3_1.GetObjectCommand({ Bucket: this.bucket, Key: key });
        return (0, s3_request_presigner_1.getSignedUrl)(this.client, cmd, { expiresIn });
    }
    async getPublicUrl(key) {
        return `s3://${this.bucket}/${key}`;
    }
    async checkExists(key) {
        try {
            await this.client.send(new client_s3_1.HeadObjectCommand({ Bucket: this.bucket, Key: key }));
            return true;
        }
        catch {
            return false;
        }
    }
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = StorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], StorageService);
//# sourceMappingURL=storage.service.js.map