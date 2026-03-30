import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Job } from './job.schema';

@Injectable()
export class JobsService {
  constructor(@InjectModel(Job.name) private model: Model<Job>) {}

  async create(data: {
    org_id: string;
    project_id: string;
    media_files: { media_id: string; file_name: string }[];
    quality: string;
    options: { orthomosaic: boolean; mesh: boolean; pointcloud: boolean; dsm: boolean; dtm: boolean };
    flight_ids: string[];
    selected_file_ids: string[];
    excluded_file_ids: string[];
    image_count: number;
  }): Promise<Job> {
    return this.model.create({
      ...data,
      project_id: new Types.ObjectId(data.project_id),
      status: 'queued',
      progress: 0,
    });
  }

  async list(orgId: string, projectId?: string, status?: string): Promise<Job[]> {
    const filter: any = { org_id: orgId };
    if (projectId && Types.ObjectId.isValid(projectId)) filter.project_id = new Types.ObjectId(projectId);
    if (status) {
      const statuses = status.split(',').map(s => s.trim()).filter(Boolean);
      filter.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
    }
    return this.model.find(filter).sort({ created_at: -1 }).exec();
  }

  async findOne(orgId: string, jobId: string): Promise<Job> {
    const j = await this.model.findOne({ _id: jobId, org_id: orgId }).exec();
    if (!j) throw new NotFoundException(`Job ${jobId} not found`);
    return j;
  }

  async findCompletedByProject(orgId: string, projectId: string): Promise<Job[]> {
    return this.model.find({
      org_id: orgId,
      project_id: new Types.ObjectId(projectId),
      status: 'completed',
    }).exec();
  }

  async findRunningByProject(orgId: string, projectId: string): Promise<Job[]> {
    return this.model.find({
      org_id: orgId,
      project_id: new Types.ObjectId(projectId),
      status: { $in: ['queued', 'downloading', 'processing'] },
    }).sort({ created_at: -1 }).exec();
  }

  async getStats(orgId: string): Promise<{ active_count: number; completed_count: number; total_jobs: number }> {
    const [active, completed, total] = await Promise.all([
      this.model.countDocuments({ org_id: orgId, status: { $in: ['queued', 'downloading', 'processing'] } }),
      this.model.countDocuments({ org_id: orgId, status: 'completed' }),
      this.model.countDocuments({ org_id: orgId }),
    ]);
    return { active_count: active, completed_count: completed, total_jobs: total };
  }

  async cancel(orgId: string, jobId: string): Promise<void> {
    await this.model.updateOne(
      { _id: jobId, org_id: orgId, status: { $in: ['queued'] } },
      { status: 'failed', error: 'Cancelled by user' },
    );
  }
}
