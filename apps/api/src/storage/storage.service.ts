import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly endpoint: string;

  constructor() {
    this.endpoint = process.env.SEAWEEDFS_ENDPOINT || 'http://localhost:8888';
    this.bucket = process.env.SEAWEEDFS_BUCKET || 'mapper';

    this.client = new S3Client({
      endpoint: this.endpoint,
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env.SEAWEEDFS_ACCESS_KEY || '',
        secretAccessKey: process.env.SEAWEEDFS_SECRET_KEY || '',
      },
      forcePathStyle: true, // Required for SeaweedFS / MinIO
    });
  }

  getBucket(): string {
    return this.bucket;
  }

  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, cmd, { expiresIn });
  }

  async getPublicUrl(key: string): Promise<string> {
    // For TiTiler: returns the direct S3 URL
    // TiTiler has its own S3 credentials configured via env, so it can read directly
    return `s3://${this.bucket}/${key}`;
  }

  async checkExists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }
}
