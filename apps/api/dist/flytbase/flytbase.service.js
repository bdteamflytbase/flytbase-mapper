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
var FlytbaseService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlytbaseService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
const org_settings_service_1 = require("../org-settings/org-settings.service");
let FlytbaseService = FlytbaseService_1 = class FlytbaseService {
    constructor(orgSettings) {
        this.orgSettings = orgSettings;
        this.logger = new common_1.Logger(FlytbaseService_1.name);
    }
    client(settings) {
        return axios_1.default.create({
            baseURL: settings.flytbase_api_url,
            headers: {
                Authorization: `Bearer ${settings.flytbase_service_token}`,
                'org-id': settings.flytbase_org_id,
                'Content-Type': 'application/json',
            },
            timeout: 60000,
        });
    }
    async getSites(orgId) {
        const settings = await this.orgSettings.getOrThrow(orgId);
        const client = this.client(settings);
        const res = await client.get(`/sites/organization/${settings.flytbase_org_id}`);
        return res.data;
    }
    async getSite(orgId, siteId) {
        const settings = await this.orgSettings.getOrThrow(orgId);
        const client = this.client(settings);
        const res = await client.get(`/sites/${siteId}`);
        return res.data;
    }
    async getAllFlightsInAOI(orgId, aoi, options) {
        const settings = await this.orgSettings.getOrThrow(orgId);
        const client = this.client(settings);
        const body = {
            mediaTypes: [0],
            geoFilter: {
                intersects: {
                    type: aoi.type,
                    coordinates: aoi.coordinates[0],
                },
            },
        };
        if (options?.siteId)
            body.siteIds = [options.siteId];
        if (options?.dateFrom || options?.dateTo) {
            body.dateRange = {};
            if (options.dateFrom)
                body.dateRange.start = options.dateFrom;
            if (options.dateTo)
                body.dateRange.end = options.dateTo;
        }
        const allGroups = [];
        let page = 1;
        const limit = 50;
        while (true) {
            const res = await client.post(`/v3/objects/files?page=${page}&limit=${limit}&sortingOrder=-1`, body);
            const items = res.data?.media ?? [];
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
                    files: (item.files ?? []).map((f) => ({
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
            if (items.length < limit)
                break;
            page++;
        }
        return allGroups;
    }
    async getMissionsForSite(orgId, siteId) {
        const settings = await this.orgSettings.getOrThrow(orgId);
        const client = this.client(settings);
        const res = await client.get('/v2/mission', {
            params: { site_id: siteId },
        });
        const allMissions = Array.isArray(res.data) ? res.data : [];
        const gridMissions = allMissions.filter((m) => {
            if (m.type !== 2)
                return false;
            const sids = m.site_ids ?? [];
            return sids.length === 0 || sids.includes(siteId);
        });
        this.logger.log(`getMissionsForSite: ${allMissions.length} total missions, ${gridMissions.length} grid missions for site ${siteId}`);
        return gridMissions.map((m) => ({
            mission_id: m._id,
            mission_name: m.name,
            type: m.type,
            site_ids: m.site_ids ?? [],
        }));
    }
    async getFlightsByMission(orgId, missionId, siteId) {
        const settings = await this.orgSettings.getOrThrow(orgId);
        const client = this.client(settings);
        if (!siteId) {
            this.logger.warn('getFlightsByMission called without siteId — cannot scan flights');
            return [];
        }
        const allGroups = [];
        let page = 1;
        const limit = 60;
        const maxPages = 20;
        while (page <= maxPages) {
            const res = await client.get('/v2/flight', {
                params: { 'site_id[]': siteId, page, limit },
            });
            const flights = res.data?.flightLogs ?? [];
            for (const f of flights) {
                const missionMatch = (f.missions ?? []).find((m) => m.mission_id === missionId);
                if (!missionMatch)
                    continue;
                allGroups.push({
                    task_id: f.task_id ?? f.flight_id,
                    flight_id: f.flight_id,
                    flight_date: f.timestamp ?? f.created_time ?? new Date().toISOString(),
                    site_id: siteId,
                    site_name: '',
                    mission_id: missionMatch.mission_id ?? missionId,
                    mission_name: missionMatch.mission_name ?? '',
                    total_media_count: f.total_media ?? 0,
                    files: [],
                });
            }
            if (flights.length < limit)
                break;
            page++;
        }
        this.logger.log(`getFlightsByMission: scanned ${(page - 1) * limit} flights, found ${allGroups.length} matching mission ${missionId}`);
        return allGroups;
    }
    async getMediaByFlight(orgId, flightId, page = 1, limit = 200) {
        const settings = await this.orgSettings.getOrThrow(orgId);
        const client = this.client(settings);
        const res = await client.get(`/v2/media/${flightId}`, { params: { page, limit } });
        return res.data;
    }
    async getMediaFilterOptions(orgId) {
        const settings = await this.orgSettings.getOrThrow(orgId);
        const client = this.client(settings);
        const res = await client.get('/v2/objects/filter/media-filter-options');
        return res.data;
    }
    async getMediaFolders(orgId, page = 1, limit = 60, body) {
        const settings = await this.orgSettings.getOrThrow(orgId);
        const client = this.client(settings);
        const res = await client.post(`/v2/objects/folders?page=${page}&limit=${limit}&sortingOrder=-1&groupBy=undefined`, body || {});
        return res.data;
    }
    async getFolderFiles(orgId, taskId, page = 1, limit = 60) {
        const settings = await this.orgSettings.getOrThrow(orgId);
        const client = this.client(settings);
        const res = await client.post(`/v2/objects/folder/${taskId}?page=${page}&limit=${limit}&sortingOrder=-1&groupBy=1`, {});
        return res.data;
    }
    async countMediaInAOI(orgId, aoi, siteId) {
        const settings = await this.orgSettings.getOrThrow(orgId);
        const client = this.client(settings);
        const body = {
            mediaTypes: [0],
            geoFilter: {
                intersects: {
                    type: aoi.type,
                    coordinates: aoi.coordinates[0],
                },
            },
        };
        if (siteId)
            body.siteIds = [siteId];
        const res = await client.post('/v3/objects/files/count', body);
        return res.data?.total ?? 0;
    }
    groupByDate(flights, processedFlightIds, jobIdsByFlight, runningFlightIds, runningJobsByFlight) {
        const byDate = new Map();
        for (const fg of flights) {
            const date = (fg.flight_date ?? new Date().toISOString()).substring(0, 10);
            if (!byDate.has(date))
                byDate.set(date, []);
            byDate.get(date).push(fg);
        }
        return Array.from(byDate.entries())
            .sort(([a], [b]) => b.localeCompare(a))
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
                    processing_status: isProcessed ? 'processed' : isRunning ? 'processing' : 'unprocessed',
                    running_job: runningJobsByFlight?.get(f.flight_id) ?? undefined,
                };
            }),
        }));
    }
};
exports.FlytbaseService = FlytbaseService;
exports.FlytbaseService = FlytbaseService = FlytbaseService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [org_settings_service_1.OrgSettingsService])
], FlytbaseService);
//# sourceMappingURL=flytbase.service.js.map