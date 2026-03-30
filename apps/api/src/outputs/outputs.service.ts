import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Output } from './output.schema';
import { StorageService } from '../storage/storage.service';

const COG_TYPES = new Set(['orthomosaic', 'dsm', 'dtm']);

@Injectable()
export class OutputsService {
  constructor(
    @InjectModel(Output.name) private model: Model<Output>,
    private readonly storage: StorageService,
  ) {}

  async listByProject(orgId: string, projectId: string): Promise<any[]> {
    // Worker stores project_id as string; query both string and ObjectId for safety
    const outputs = await this.model.find({
      org_id: orgId,
      $or: [
        { project_id: projectId },
        { project_id: Types.ObjectId.isValid(projectId) ? new Types.ObjectId(projectId) : projectId },
      ],
    }).sort({ created_at: -1 }).exec();

    // Use SeaweedFS filer endpoint (port 8888) for direct file access — no auth needed
    // The filer stores S3 objects under /buckets/<bucket>/<key>
    const filerBase = (process.env.SEAWEEDFS_ENDPOINT || 'http://localhost:8333')
      .replace(':8333', ':8888'); // Filer is on 8888, S3 API is on 8333

    return outputs.map((o) => {
      const base: any = o.toObject();
      const fileUrl = `${filerBase}/buckets/${this.storage.getBucket()}/${o.storage_key}`;

      base.download_url = fileUrl;

      if (COG_TYPES.has(o.type)) {
        // TiTiler tile URL for map-based viewing (optional, may not be needed)
        const cogUrl = `s3://${this.storage.getBucket()}/${o.storage_key}`;
        base.tile_url = `${process.env.TITILER_URL}/cog/tiles/WebMercatorQuad/{z}/{x}/{y}.png?url=${encodeURIComponent(cogUrl)}`;
      }

      return base;
    });
  }

  async getDownloadUrl(orgId: string, outputId: string): Promise<string> {
    const o = await this.model.findOne({ _id: outputId, org_id: orgId }).exec();
    if (!o) throw new NotFoundException(`Output ${outputId} not found`);
    return this.storage.getPresignedUrl(o.storage_key, 900); // 15-min URL
  }

  async getTileUrl(orgId: string, outputId: string): Promise<string> {
    const o = await this.model.findOne({ _id: outputId, org_id: orgId }).exec();
    if (!o) throw new NotFoundException(`Output ${outputId} not found`);
    if (!COG_TYPES.has(o.type)) throw new NotFoundException('Not a tiled output');
    const cogUrl = await this.storage.getPublicUrl(o.storage_key);
    return `${process.env.TITILER_URL}/cog/tiles/WebMercatorQuad/{z}/{x}/{y}.png?url=${encodeURIComponent(cogUrl)}`;
  }
}
