import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Project } from './project.schema';
import { FlytbaseService } from '../flytbase/flytbase.service';
import { JobsService } from '../jobs/jobs.service';
import { GeoPolygon } from '../shared-types';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private model: Model<Project>,
    private readonly fb: FlytbaseService,
    private readonly jobs: JobsService,
  ) {}

  async list(orgId: string, siteId?: string): Promise<Project[]> {
    const filter: any = { org_id: orgId, status: 'active' };
    if (siteId) filter.site_id = siteId;
    return this.model.find(filter).sort({ created_at: -1 }).exec();
  }

  async create(orgId: string, dto: {
    name: string;
    site_id: string;
    mission_id: string;
    mission_name: string;
    description?: string;
    created_by?: string;
    aoi?: GeoPolygon;
  }): Promise<Project> {
    return this.model.create({ ...dto, org_id: orgId });
  }

  async findOne(orgId: string, projectId: string): Promise<Project> {
    const p = await this.model.findOne({ _id: projectId, org_id: orgId }).exec();
    if (!p) throw new NotFoundException(`Project ${projectId} not found`);
    return p;
  }

  async update(orgId: string, projectId: string, dto: Partial<{
    name: string;
    description: string;
    aoi: GeoPolygon;
    thumbnail_url: string;
  }>): Promise<Project> {
    const p = await this.model.findOneAndUpdate(
      { _id: projectId, org_id: orgId },
      { $set: dto },
      { new: true },
    ).exec();
    if (!p) throw new NotFoundException(`Project ${projectId} not found`);
    return p;
  }

  async archive(orgId: string, projectId: string): Promise<void> {
    await this.model.updateOne({ _id: projectId, org_id: orgId }, { status: 'archived' });
  }

  /**
   * Returns all media for a project, grouped by date, with processed flag.
   * If project has a mission_id, fetches by mission.
   * Falls back to AOI-based lookup for legacy projects.
   */
  async getFlights(orgId: string, projectId: string) {
    const project = await this.findOne(orgId, projectId);

    // 1. Fetch flights — mission-based or legacy AOI-based
    let allFlights;
    if (project.mission_id) {
      allFlights = await this.fb.getFlightsByMission(orgId, project.mission_id, project.site_id);
    } else {
      const aoi = project.aoi as unknown as GeoPolygon;
      allFlights = await this.fb.getAllFlightsInAOI(orgId, aoi, {
        siteId: project.site_id,
      });
    }

    // 2. Get completed + running jobs for this project
    const [completedJobs, runningJobs] = await Promise.all([
      this.jobs.findCompletedByProject(orgId, projectId),
      this.jobs.findRunningByProject(orgId, projectId),
    ]);

    const processedFlightIds = new Set<string>();
    const jobIdsByFlight = new Map<string, string[]>();
    const runningFlightIds = new Set<string>();
    const runningJobsByFlight = new Map<string, { _id: string; progress: number; stage: string; status: string }>();

    for (const job of completedJobs) {
      const sel = (job as any).flight_ids ?? [];
      for (const fid of sel) {
        processedFlightIds.add(fid);
        if (!jobIdsByFlight.has(fid)) jobIdsByFlight.set(fid, []);
        jobIdsByFlight.get(fid).push(job._id.toString());
      }
    }

    for (const job of runningJobs) {
      const sel = (job as any).flight_ids ?? [];
      for (const fid of sel) {
        runningFlightIds.add(fid);
        runningJobsByFlight.set(fid, {
          _id: job._id.toString(),
          progress: (job as any).progress ?? 0,
          stage: (job as any).stage ?? '',
          status: (job as any).status ?? 'queued',
        });
      }
    }

    // 3. Group by date with processing status
    return this.fb.groupByDate(allFlights, processedFlightIds, jobIdsByFlight, runningFlightIds, runningJobsByFlight);
  }

  /**
   * @deprecated Use getFlights() instead. Kept for direct callers during migration.
   */
  async getFlightsInAOI(orgId: string, projectId: string) {
    return this.getFlights(orgId, projectId);
  }
}
