import axios from 'axios';

// ─── Token & Org Management ──────────────────────────────────────────────────
// Simplified for local dev — connects directly to :4000 API
// No auth needed for the local SQLite backend

const TOKEN_KEY = 'mapper_token';
const ORG_KEY = 'mapper_org_id';
const API_URL_KEY = 'mapper_flytbase_api_url';

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) || 'local-dev';
}

export function setToken(token: string) {
  const clean = token.replace(/^Bearer\s+/i, '');
  localStorage.setItem(TOKEN_KEY, clean);
  const orgId = decodeJwtOrgId(clean);
  if (orgId) localStorage.setItem(ORG_KEY, orgId);
}

export function getOrgId(): string {
  return localStorage.getItem(ORG_KEY) || 'local';
}

export function getFlytbaseApiUrl(): string {
  return localStorage.getItem(API_URL_KEY) || 'https://api-stag.flytbase.com';
}

export function setFlytbaseApiUrl(url: string) {
  localStorage.setItem(API_URL_KEY, url);
}

function decodeJwtOrgId(token: string): string {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return '';
    let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (payload.length % 4) payload += '=';
    const decoded = JSON.parse(atob(payload));
    return decoded.sub || decoded.oid || '';
  } catch {
    return '';
  }
}

// Always configured for local dev
export function isConfigured(): boolean {
  return true;
}

// ─── Axios Instance ──────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const orgId = getOrgId();
  if (orgId) config.headers['org-id'] = orgId;
  return config;
});

export default api;

// ─── Auth API (bootstrap) ────────────────────────────────────────────────────
export const authApi = {
  bootstrap: async (token: string, apiUrl: string) => {
    setToken(token);
    setFlytbaseApiUrl(apiUrl);
    return getOrgId();
  },
};

// ─── Typed API calls (mapped to :4000 FastAPI backend) ───────────────────────

// The :4000 backend uses /api/sites, /api/projects, /api/jobs directly
// Field mapping: _id → id, created_at stays, site_id stays

// Helper to normalize :4000 response to match the frontend's expected shape
function normalizeSite(s: any) {
  return { ...s, _id: s.id || s._id, thumbnail_url: s.thumbnail_url };
}

function normalizeProject(p: any) {
  return {
    ...p,
    _id: p.id || p._id,
    site_id: p.site_id,
    thumbnail_url: p.outputs?.orthomosaic?.download_url || null,
    created_at: p.created_at,
    mission_name: p.description || null,
  };
}

function normalizeJob(j: any) {
  return {
    ...j,
    _id: j.id || j._id,
    project_id: j.project_id,
    status: j.status,
    progress: j.progress,
    stage: j.message,
    image_count: null,
    created_at: j.started_at || j.created_at,
    completed_at: j.completed_at,
    error: j.status === 'failed' ? j.message : null,
  };
}

function normalizeOutput(o: any) {
  return {
    ...o,
    _id: o.id || o._id,
    download_url: o.download_url,
    size_bytes: o.size_mb ? o.size_mb * 1024 * 1024 : null,
  };
}

export const sitesApi = {
  list: () => api.get('/sites').then((r) => r.data.map(normalizeSite)),
  get: (id: string) => api.get(`/sites/${id}`).then((r) => normalizeSite(r.data)),
  getMissions: (siteId: string) => api.get(`/sites/${siteId}/missions`).then((r) => r.data).catch(() => []),
};

export const projectsApi = {
  list: (siteId?: string) =>
    api.get('/projects', { params: siteId ? { site_id: siteId } : {} }).then((r) => r.data.map(normalizeProject)),
  create: (data: any) => api.post('/projects', data, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  }).then((r) => normalizeProject(r.data)),
  get: (id: string) => api.get(`/projects/${id}`).then((r) => normalizeProject(r.data)),
  update: (id: string, data: any) => api.patch(`/projects/${id}`, data).then((r) => normalizeProject(r.data)),
  delete: (id: string) => api.delete(`/projects/${id}`).then((r) => r.data),
  getFlights: (id: string) => api.get(`/projects/${id}/flights`).then((r) => r.data).catch(() => []),
  getOutputs: (id: string) => api.get(`/projects/${id}/outputs`).then((r) => r.data.map(normalizeOutput)),
  process: (id: string, data: any) =>
    api.post(`/projects/${id}/process`, data).then((r) => r.data),
};

export const jobsApi = {
  list: (projectId?: string, status?: string) =>
    api.get('/jobs', { params: { project_id: projectId, status } }).then((r) => r.data.map(normalizeJob)),
  get: (id: string) => api.get(`/jobs/${id}`).then((r) => normalizeJob(r.data)),
  cancel: (id: string) => api.delete(`/jobs/${id}`).then((r) => r.data),
};

export const mediaApi = {
  getByFlight: (flightId: string, page = 1, limit = 200) =>
    api.get(`/flytbase/media/${flightId}`, { params: { page, limit } }).then((r) => r.data).catch(() => []),
  countInAOI: (aoi: any, siteId?: string) =>
    api.post('/flytbase/media/in-aoi/count', { aoi, site_id: siteId }).then((r) => r.data).catch(() => ({ count: 0 })),
  getFilterOptions: () =>
    api.get('/flytbase/media/filter-options').then((r) => r.data).catch(() => ({})),
  getFolders: (page = 1, limit = 60, body?: any) =>
    api.post(`/flytbase/media/folders?page=${page}&limit=${limit}`, body || {}).then((r) => r.data).catch(() => []),
  getFolderFiles: (taskId: string, page = 1, limit = 60) =>
    api.post(`/flytbase/media/folder/${taskId}?page=${page}&limit=${limit}`).then((r) => r.data).catch(() => []),
};

export const settingsApi = {
  get: () => api.get('/health').then((r) => r.data),
  save: (data: any) => Promise.resolve(data),
};
