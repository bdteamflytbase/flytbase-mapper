// ─── GeoJSON ──────────────────────────────────────────────────────────────────
export interface GeoPolygon {
  type: 'Polygon';
  coordinates: [number, number][][]; // [lon, lat] pairs, closed ring
}

// ─── FlytBase Proxied Types ────────────────────────────────────────────────────
export interface FBSite {
  _id: string;
  name: string;
  coordinates: { lat: number; lng: number; alt?: number };
  missions: { _id: string; name: string }[];
}

export interface FBMediaFile {
  _id: string;
  file_name: string;
  file_type: number; // 0=image,1=video
  size: number;
  uploaded_at: string;
  location: { lat: number; long: number; alt?: number };
  thumbnail_url: string;
  data_url?: string; // download URL
}

export interface FBFlightGroup {
  task_id: string;
  flight_id: string;
  flight_date: string;
  site_id: string;
  site_name: string;
  mission_id: string;
  mission_name: string;
  total_media_count: number;
  files: FBMediaFile[];
}

export interface DateGroup {
  date: string; // YYYY-MM-DD
  total_media: number;
  flight_count: number;
  new_flight_count: number; // not yet in any dataset
  flights: (FBFlightGroup & {
    is_processed: boolean;
    job_ids?: string[];
    processing_status: 'processed' | 'processing' | 'unprocessed';
    running_job?: { _id: string; progress: number; stage: string; status: string };
  })[];
}

// Media item from /v2/media/:flightId (different field names than v3)
export interface FBMediaItem {
  _id: string;
  file_name: string;
  file_type: string; // 'image' | 'video' (string, not number!)
  file_extension: string;
  file_size?: number;
  location: { latitude: number; longitude: number };
  timestamp?: string;
  thumbnail_url: string;
  data_url: string;
  download_url: string;
  media_id?: string;
}

// ─── Mapper Entities ───────────────────────────────────────────────────────────
export interface OrgSettings {
  _id: string;
  org_id: string;
  flytbase_org_id: string;
  flytbase_api_url: string;
  configured: boolean;
  created_at: string;
  updated_at: string;
}

export interface Project {
  _id: string;
  org_id: string;
  site_id: string;
  name: string;
  description?: string;
  aoi: GeoPolygon;
  thumbnail_url?: string;
  status: 'active' | 'archived';
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export type JobStatus = 'queued' | 'downloading' | 'processing' | 'completed' | 'failed';
export type OutputType = 'orthomosaic' | 'mesh' | 'pointcloud' | 'dsm' | 'dtm' | 'thumbnail';

export interface Job {
  _id: string;
  org_id: string;
  project_id: string;
  status: JobStatus;
  stage: string;
  progress: number;
  message: string;
  image_count: number;
  media_files: { media_id: string; file_name: string }[];
  quality: 'preview' | 'medium' | 'high';
  options: {
    orthomosaic: boolean;
    mesh: boolean;
    pointcloud: boolean;
    dsm: boolean;
    dtm: boolean;
  };
  estimated_seconds_remaining?: number | null;
  started_at?: string;
  completed_at?: string;
  error?: string;
  flight_ids: string[];
  selected_file_ids: string[];
  excluded_file_ids: string[];
  created_at: string;
}

export interface OutputMetadata {
  gsd_cm?: number;
  area_hectares?: number;
  point_count?: number;
  width?: number;
  height?: number;
  bounds?: [number, number, number, number]; // west, south, east, north
}

export interface Output {
  _id: string;
  org_id: string;
  project_id: string;
  job_id: string;
  type: OutputType;
  format: string;
  storage_key: string;
  size_bytes: number;
  metadata: OutputMetadata;
  // Computed by API, not stored:
  download_url?: string;
  tile_url?: string;
  created_at: string;
}

// ─── WebSocket Events ──────────────────────────────────────────────────────────
export interface JobUpdateEvent {
  job_id: string;
  project_id: string;
  status: JobStatus;
  stage: string;
  progress: number;
  message: string;
}

export interface JobCompletedEvent {
  job_id: string;
  project_id: string;
}

export interface JobFailedEvent {
  job_id: string;
  project_id: string;
  error: string;
}

// ─── RabbitMQ Message ─────────────────────────────────────────────────────────
// The RabbitMQ message is intentionally tiny — just the job_id.
// The worker reads all data from MongoDB (job doc + org_settings).
export interface WorkerJobMessage {
  job_id: string;
}
