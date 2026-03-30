import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { OrgSettingsService } from '../org-settings/org-settings.service';
import { OrgSettings } from '../org-settings/org-settings.schema';
import { GeoPolygon, DateGroup, FBFlightGroup } from '../shared-types';

@Injectable()
export class FlytbaseService {
  private readonly logger = new Logger(FlytbaseService.name);

  constructor(private readonly orgSettings: OrgSettingsService) {}

  private client(settings: OrgSettings): AxiosInstance {
    return axios.create({
      baseURL: settings.flytbase_api_url,
      headers: {
        Authorization: `Bearer ${settings.flytbase_service_token}`,
        'org-id': settings.flytbase_org_id,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    });
  }

  async getSites(orgId: string) {
    const settings = await this.orgSettings.getOrThrow(orgId);
    const client = this.client(settings);
    const res = await client.get(`/sites/organization/${settings.flytbase_org_id}`);
    return res.data;
  }

  async getSite(orgId: string, siteId: string) {
    const settings = await this.orgSettings.getOrThrow(orgId);
    const client = this.client(settings);
    const res = await client.get(`/sites/${siteId}`);
    return res.data;
  }

  /**
   * Calls POST /v3/objects/files across all pages, returns ALL flight groups
   * that have media captured inside the given AOI polygon.
   *
   * API response: { media: [...], page: N, limit: N }
   * Each item:   { task_id, created_time, total_media, missions[], files[] }
   * Each file:   { media_id, flight_id, file_name, location{lat,long,alt},
   *                thumbnail_url, data_url, capture_timestamp }
   */
  async getAllFlightsInAOI(
    orgId: string,
    aoi: GeoPolygon,
    options?: { dateFrom?: string; dateTo?: string; siteId?: string },
  ): Promise<FBFlightGroup[]> {
    const settings = await this.orgSettings.getOrThrow(orgId);
    const client = this.client(settings);

    const body: any = {
      mediaTypes: [0], // images only
      geoFilter: {
        intersects: {
          type: aoi.type,
          coordinates: aoi.coordinates[0], // v3 API takes the outer ring array
        },
      },
    };

    if (options?.siteId) body.siteIds = [options.siteId];
    if (options?.dateFrom || options?.dateTo) {
      body.dateRange = {};
      if (options.dateFrom) body.dateRange.start = options.dateFrom;
      if (options.dateTo) body.dateRange.end = options.dateTo;
    }

    const allGroups: FBFlightGroup[] = [];
    let page = 1;
    const limit = 50;

    while (true) {
      const res = await client.post(
        `/v3/objects/files?page=${page}&limit=${limit}&sortingOrder=-1`,
        body,
      );
      // API returns { media: [] } not { data: [] }
      const items: any[] = res.data?.media ?? [];

      for (const item of items) {
        const firstFile = item.files?.[0];
        const mission = item.missions?.[0];
        allGroups.push({
          task_id: item.task_id,
          flight_id: firstFile?.flight_id ?? item.task_id,
          flight_date: item.created_time,
          site_id: options?.siteId ?? '',
          site_name: '',
          mission_id: mission?._id ?? '',
          mission_name: mission?.name ?? '',
          total_media_count: item.total_media ?? item.files?.length ?? 0,
          files: (item.files ?? []).map((f: any) => ({
            _id: f.media_id,
            file_name: f.file_name,
            file_type: f.file_type ?? 0,
            size: 0,
            uploaded_at: f.create_time ?? f.capture_timestamp,
            location: f.location ?? { lat: 0, long: 0 },
            thumbnail_url: f.thumbnail_url ?? '',
            data_url: f.data_url,
          })),
        });
      }

      // No totalPages in response — stop when we get fewer items than the limit
      if (items.length < limit) break;
      page++;
    }

    return allGroups;
  }

  /**
   * Returns GRID missions for a site via GET /v2/mission.
   * Filters: type=2 (grid) AND site_id present in mission's site_ids[].
   * Paginates through all missions since the API returns max 200 per page.
   */
  async getMissionsForSite(
    orgId: string,
    siteId: string,
  ): Promise<{ mission_id: string; mission_name: string; type: number; site_ids: string[] }[]> {
    const settings = await this.orgSettings.getOrThrow(orgId);
    const client = this.client(settings);

    // /v2/mission ignores pagination — returns ALL missions in one call
    const res = await client.get('/v2/mission', {
      params: { site_id: siteId },
    });
    const allMissions: any[] = Array.isArray(res.data) ? res.data : [];

    // Filter: only GRID missions (type=2) that have this site_id in site_ids[]
    const gridMissions = allMissions.filter((m) => {
      if (m.type !== 2) return false;
      // Include if site_ids contains our site, OR if site_ids is empty
      // (some grid missions have empty site_ids but are returned by the site_id query param)
      const sids: string[] = m.site_ids ?? [];
      return sids.length === 0 || sids.includes(siteId);
    });

    this.logger.log(
      `getMissionsForSite: ${allMissions.length} total missions, ${gridMissions.length} grid missions for site ${siteId}`,
    );

    return gridMissions.map((m) => ({
      mission_id: m._id,
      mission_name: m.name,
      type: m.type,
      site_ids: m.site_ids ?? [],
    }));
  }

  /**
   * Returns all flight groups for a given mission, paginated.
   * Uses the same mapping logic as getAllFlightsInAOI.
   */
  /**
   * Returns flights for a mission by scanning GET /v2/flight by site
   * and filtering client-side by mission_id.
   * (The mission_id[] query param on /v2/flight is broken — returns 0 always.)
   */
  async getFlightsByMission(
    orgId: string,
    missionId: string,
    siteId?: string,
  ): Promise<FBFlightGroup[]> {
    const settings = await this.orgSettings.getOrThrow(orgId);
    const client = this.client(settings);

    if (!siteId) {
      this.logger.warn('getFlightsByMission called without siteId — cannot scan flights');
      return [];
    }

    const allGroups: FBFlightGroup[] = [];
    let page = 1;
    const limit = 60;
    const maxPages = 20; // safety limit: 1200 flights max scan

    while (page <= maxPages) {
      const res = await client.get('/v2/flight', {
        params: { 'site_id[]': siteId, page, limit },
      });
      const flights: any[] = res.data?.flightLogs ?? [];

      for (const f of flights) {
        // Check if this flight belongs to our mission
        const missionMatch = (f.missions ?? []).find(
          (m: any) => m.mission_id === missionId,
        );
        if (!missionMatch) continue;

        allGroups.push({
          task_id: f.task_id ?? f.flight_id,
          flight_id: f.flight_id,
          flight_date: f.timestamp ?? f.created_time ?? new Date().toISOString(),
          site_id: siteId,
          site_name: '',
          mission_id: missionMatch.mission_id ?? missionId,
          mission_name: missionMatch.mission_name ?? '',
          total_media_count: f.total_media ?? 0,
          files: [], // Media loaded separately via /v2/media/:flightId
        });
      }

      if (flights.length < limit) break;
      page++;
    }

    this.logger.log(
      `getFlightsByMission: scanned ${(page - 1) * limit} flights, found ${allGroups.length} matching mission ${missionId}`,
    );

    return allGroups;
  }

  /**
   * Get media for a specific flight via FlytBase /v2/media/:flightId
   */
  async getMediaByFlight(orgId: string, flightId: string, page = 1, limit = 200): Promise<any> {
    const settings = await this.orgSettings.getOrThrow(orgId);
    const client = this.client(settings);
    const res = await client.get(`/v2/media/${flightId}`, { params: { page, limit } });
    return res.data;
  }

  /** Get media filter options (sites, missions, devices, cameras) */
  async getMediaFilterOptions(orgId: string): Promise<any> {
    const settings = await this.orgSettings.getOrThrow(orgId);
    const client = this.client(settings);
    const res = await client.get('/v2/objects/filter/media-filter-options');
    return res.data;
  }

  /** List media folders (flights grouped) — used for custom project gallery */
  async getMediaFolders(orgId: string, page = 1, limit = 60, body?: any): Promise<any> {
    const settings = await this.orgSettings.getOrThrow(orgId);
    const client = this.client(settings);
    const res = await client.post(
      `/v2/objects/folders?page=${page}&limit=${limit}&sortingOrder=-1&groupBy=undefined`,
      body || {},
    );
    return res.data;
  }

  /** List files inside a specific folder (flight) */
  async getFolderFiles(orgId: string, taskId: string, page = 1, limit = 60): Promise<any> {
    const settings = await this.orgSettings.getOrThrow(orgId);
    const client = this.client(settings);
    const res = await client.post(
      `/v2/objects/folder/${taskId}?page=${page}&limit=${limit}&sortingOrder=-1&groupBy=1`,
      {},
    );
    return res.data;
  }

  async countMediaInAOI(orgId: string, aoi: GeoPolygon, siteId?: string): Promise<number> {
    const settings = await this.orgSettings.getOrThrow(orgId);
    const client = this.client(settings);

    const body: any = {
      mediaTypes: [0],
      geoFilter: {
        intersects: {
          type: aoi.type,
          coordinates: aoi.coordinates[0],
        },
      },
    };
    if (siteId) body.siteIds = [siteId];

    const res = await client.post('/v3/objects/files/count', body);
    return res.data?.total ?? 0;
  }

  /**
   * Groups flight groups by date (YYYY-MM-DD), sorted newest first.
   */
  groupByDate(
    flights: FBFlightGroup[],
    processedFlightIds: Set<string>,
    jobIdsByFlight: Map<string, string[]>,
    runningFlightIds?: Set<string>,
    runningJobsByFlight?: Map<string, { _id: string; progress: number; stage: string; status: string }>,
  ): DateGroup[] {
    const byDate = new Map<string, FBFlightGroup[]>();

    for (const fg of flights) {
      const date = (fg.flight_date ?? new Date().toISOString()).substring(0, 10); // YYYY-MM-DD
      if (!byDate.has(date)) byDate.set(date, []);
      byDate.get(date).push(fg);
    }

    return Array.from(byDate.entries())
      .sort(([a], [b]) => b.localeCompare(a)) // newest first
      .map(([date, fgs]) => ({
        date,
        total_media: fgs.reduce((s, f) => s + f.total_media_count, 0),
        flight_count: fgs.length,
        new_flight_count: fgs.filter((f) => !processedFlightIds.has(f.flight_id)).length,
        flights: fgs.map((f) => {
          const isProcessed = processedFlightIds.has(f.flight_id);
          const isRunning = runningFlightIds?.has(f.flight_id) ?? false;
          return {
            ...f,
            is_processed: isProcessed,
            job_ids: jobIdsByFlight.get(f.flight_id) ?? [],
            processing_status: isProcessed ? 'processed' as const : isRunning ? 'processing' as const : 'unprocessed' as const,
            running_job: runningJobsByFlight?.get(f.flight_id) ?? undefined,
          };
        }),
      }));
  }
}
