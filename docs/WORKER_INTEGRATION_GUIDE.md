# Mapper Worker — Integration Guide for Backend & Frontend

> How the job processing pipeline works, what the backend must send, and what the frontend should display.

---

## Architecture Overview

```
Frontend                  Backend (NestJS API)           Worker (Python)
   |                            |                            |
   |  POST /process             |                            |
   |  {media_files, quality,    |                            |
   |   options}                 |                            |
   |--------------------------->|                            |
   |                            |  1. Create Job doc         |
   |                            |     (MongoDB, status:queued)|
   |                            |  2. Publish {job_id}       |
   |                            |     to RabbitMQ            |
   |  {job_id, status:queued}   |                            |
   |<---------------------------|                            |
   |                            |                            |
   |  subscribe_job(job_id)     |              RabbitMQ      |
   |---- WebSocket ------------>|            delivers         |
   |                            |          {job_id}           |
   |                            |--------------------------->|
   |                            |                            |
   |                            |    Worker reads job doc    |
   |                            |    from MongoDB            |
   |                            |                            |
   |                            |    Worker reads org_settings
   |                            |    (FlytBase creds)        |
   |                            |                            |
   |                            |    Worker calls FlytBase   |
   |                            |    POST /v3/objects/media-urls
   |                            |    (gets fresh download URLs)
   |                            |                            |
   |                            |    Downloads images        |
   |                            |    Runs ODM (GPU)          |
   |                            |    Post-processes outputs  |
   |                            |    Uploads to S3           |
   |                            |                            |
   |                            |    Updates MongoDB         |
   |                            |    on EVERY stage change   |
   |                            |         |                  |
   |                            |  Change Stream detects     |
   |   job:update event         |<---------|                 |
   |<---- WebSocket ------------|                            |
   |   {progress, stage, ETA}   |                            |
   |                            |                            |
   |   job:completed event      |    status → completed      |
   |<---- WebSocket ------------|<---------------------------|
```

**Key principle:** The RabbitMQ message is intentionally tiny — just `{job_id}`. The worker pulls everything it needs from MongoDB. This means:
- No message size limits
- No stale URLs in the queue
- Any worker instance can process any job
- Full job state is always in MongoDB (single source of truth)

---

## 1. Backend — How to Submit a Job

### Endpoint

```
POST /api/projects/:projectId/process
```

### Headers

| Header | Required | Description |
|--------|----------|-------------|
| `org-id` | Yes | Organization ID (for multi-tenancy) |
| `Content-Type` | Yes | `application/json` |

### Request Body

```json
{
  "selected_file_ids": ["6937df1b...", "6937df18..."],
  "flight_ids": ["flight_abc"],
  "excluded_file_ids": [],
  "media_files": [
    { "media_id": "6937df1b1f48d43226c40076", "file_name": "DJI_20251209134911_0030_V.jpeg" },
    { "media_id": "6937df187ee89a7794a72942", "file_name": "DJI_20251209134908_0029_V.jpeg" }
  ],
  "quality": "medium",
  "options": {
    "orthomosaic": true,
    "mesh": true,
    "pointcloud": true,
    "dsm": true,
    "dtm": false
  }
}
```

### Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `media_files` | `{media_id, file_name}[]` | Yes | List of FlytBase media IDs + original filenames. The worker uses `media_id` to fetch fresh download URLs from FlytBase, and `file_name` to name the downloaded file. |
| `quality` | `"preview" \| "medium" \| "high"` | Yes | Processing quality. `preview` = fastest (~15s/image), `medium` = balanced (~45s/image), `high` = best output (~120s/image). |
| `options.orthomosaic` | boolean | Yes | Generate 2D ortho map (COG GeoTIFF). This is the primary output. |
| `options.mesh` | boolean | Yes | Generate 3D textured mesh (OBJ + MTL + textures). |
| `options.pointcloud` | boolean | Yes | Generate 3D point cloud (LAZ format). |
| `options.dsm` | boolean | Yes | Generate Digital Surface Model / elevation map (COG GeoTIFF). |
| `options.dtm` | boolean | Yes | Generate Digital Terrain Model / bare-earth terrain (COG GeoTIFF). |
| `selected_file_ids` | string[] | Yes | Reference IDs of selected files (stored for audit). |
| `flight_ids` | string[] | Yes | FlytBase flight IDs used in this job (stored for reference). |
| `excluded_file_ids` | string[] | No | Files the user explicitly excluded. |

### Response

```json
{
  "job_id": "69c7bdab3cf133ca1c077c54",
  "status": "queued"
}
```

### What Happens Internally

1. Backend validates that `org_settings` exists for this `org_id` (FlytBase must be configured)
2. Creates a `Job` document in MongoDB with all the data above + `status: "queued"`
3. Publishes `{ "job_id": "69c7bdab..." }` to RabbitMQ queue `mapper.jobs`
4. Returns `job_id` to the caller

The backend does NOT call FlytBase, does NOT download images, does NOT talk to the worker. It just stores the job and enqueues the ID.

---

## 2. Worker — What It Does With the Job

Once the worker picks up `{job_id}` from RabbitMQ, it executes this pipeline:

### Pipeline Stages

| Stage | Status | Progress | What Happens |
|-------|--------|----------|-------------|
| `initializing` | `downloading` | 0% | Worker reads job doc + org_settings from MongoDB |
| `fetching_urls` | `downloading` | 1% | Calls FlytBase `POST /v3/objects/media-urls` to get fresh presigned download URLs for all `media_ids` |
| `downloading` | `downloading` | 2–10% | Downloads all images in parallel (5 concurrent) |
| `opensfm` | `processing` | 10–30% | Feature extraction + camera alignment (Structure from Motion) |
| `openmvs` | `processing` | 30–65% | Dense point cloud reconstruction (GPU-heavy) |
| `odm_meshing` | `processing` | 65–72% | 3D mesh generation |
| `mvs_texturing` | `processing` | 72–82% | Mesh texturing |
| `odm_georeferencing` | `processing` | 82–88% | Georeferencing outputs to GPS coordinates |
| `odm_orthophoto` | `processing` | 88–95% | Orthomosaic generation |
| `odm_dem` | `processing` | 95–99% | DSM/DTM elevation map generation |
| `uploading` | `processing` | 99% | Converts GeoTIFF→COG, generates thumbnail, uploads all outputs to S3 |
| `done` | `completed` | 100% | All outputs uploaded and registered in MongoDB |

### What the Worker Writes to MongoDB

On **every stage transition**, the worker updates the job document with:

```json
{
  "status": "processing",
  "stage": "openmvs",
  "progress": 30,
  "message": "Running dense reconstruction...",
  "estimated_seconds_remaining": 1847,
  "updated_at": "2026-03-28T12:00:00Z"
}
```

These updates trigger the MongoDB change stream, which the NestJS API picks up and pushes to the frontend via WebSocket.

### ETA Calculation

The worker estimates remaining time on every progress update:

- **If progress > 5%**: Extrapolates from actual elapsed time — `remaining = elapsed * (100 - progress) / progress`
- **If progress <= 5%**: Uses preset estimate — `image_count * seconds_per_image[quality]`
  - `preview`: ~15 seconds/image
  - `medium`: ~45 seconds/image
  - `high`: ~120 seconds/image

Example: 100 images on `medium`, 40% done, 30 minutes elapsed → ETA = 30 * (60/40) = 45 min remaining.

---

## 3. Frontend — How to Track Job Progress

### Step 1: Connect to WebSocket

```typescript
import { io } from "socket.io-client";

const socket = io("http://<api-host>:3000", {
  transports: ["websocket"],
});
```

### Step 2: Subscribe to Updates

**Option A — Subscribe to a specific job** (after starting processing):

```typescript
// After POST /process returns job_id
socket.emit("subscribe_job", { job_id: "69c7bdab3cf133ca1c077c54" });
```

**Option B — Subscribe to all jobs for your org** (for dashboard view):

```typescript
socket.emit("subscribe_org", { org_id: "66bc81b2c30c0bed65c204ee" });
```

### Step 3: Listen for Events

```typescript
// Progress updates (fires many times during processing)
socket.on("job:update", (data) => {
  // data = {
  //   job_id: "69c7bdab3cf133ca1c077c54",
  //   project_id: "69c7bdab3cf133ca1c077c53",
  //   status: "processing",        // queued | downloading | processing | completed | failed
  //   stage: "openmvs",            // current ODM stage
  //   progress: 45,                // 0-100
  //   message: "Dense reconstruction: 45% complete",
  //   estimated_seconds_remaining: 1200  // seconds, or null
  // }

  updateProgressBar(data.progress);
  updateStageLabel(data.stage);
  updateETA(data.estimated_seconds_remaining);
});

// Job finished successfully
socket.on("job:completed", (data) => {
  // data = { job_id: "...", project_id: "..." }
  // Now fetch the outputs
  fetchOutputs(data.project_id);
});

// Job failed
socket.on("job:failed", (data) => {
  // data = { job_id: "...", project_id: "...", error: "ODM exited with code 1..." }
  showError(data.error);
});
```

### Step 4: Display Progress

Recommended UI mapping:

| Progress Range | What to Show |
|---------------|--------------|
| 0% | "Queued — waiting for worker..." |
| 1% | "Fetching image URLs..." |
| 2–10% | "Downloading images... (X/Y)" — use `message` field |
| 10–30% | "Analyzing images — feature matching..." |
| 30–65% | "Building 3D reconstruction..." (this is the longest stage) |
| 65–95% | "Generating map outputs..." |
| 95–99% | "Converting and uploading results..." |
| 100% | "Processing complete" |

For the ETA display:

```typescript
function formatETA(seconds: number | null): string {
  if (seconds == null || seconds <= 0) return "";
  if (seconds < 60) return "Less than a minute remaining";
  if (seconds < 3600) return `~${Math.ceil(seconds / 60)} minutes remaining`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.ceil((seconds % 3600) / 60);
  return `~${hours}h ${mins}m remaining`;
}
```

---

## 4. Storage — Where Processed Outputs Live

### How It Works End-to-End

```
Worker (Python)                     S3 Storage                    Backend (NestJS)                Frontend
   |                                (SeaweedFS / AWS S3)              |                            |
   |  1. Process images with ODM         |                            |                            |
   |  2. Convert GeoTIFF → COG           |                            |                            |
   |  3. Generate thumbnail              |                            |                            |
   |                                     |                            |                            |
   |  4. Upload files via boto3 S3 API   |                            |                            |
   |------------------------------------>|                            |                            |
   |     bucket: "mapper"                |                            |                            |
   |     key: "{org_id}/{project_id}/    |                            |                            |
   |           orthomosaic_cog.tif"      |                            |                            |
   |                                     |                            |                            |
   |  5. Register output in MongoDB      |                            |                            |
   |     (outputs collection)            |                            |                            |
   |     { type, storage_key,            |                            |                            |
   |       size_bytes, metadata }        |                            |                            |
   |                                     |                            |                            |
   |                                     |     6. Frontend requests   |                            |
   |                                     |        outputs list        |  GET /outputs               |
   |                                     |                            |<---------------------------|
   |                                     |                            |                            |
   |                                     |     7. Backend reads       |                            |
   |                                     |        output docs from    |                            |
   |                                     |        MongoDB             |                            |
   |                                     |                            |                            |
   |                                     |     8. Backend generates   |                            |
   |                                     |        presigned download  |                            |
   |                                     |        URL from S3         |                            |
   |                                     |<--------------------------|                            |
   |                                     |                            |                            |
   |                                     |     9. Backend generates   |                            |
   |                                     |        TiTiler tile URL    |                            |
   |                                     |        (for COG outputs)   |                            |
   |                                     |                            |                            |
   |                                     |    10. Returns enriched    |                            |
   |                                     |        output list         |  {download_url, tile_url}  |
   |                                     |                            |--------------------------->|
   |                                     |                            |                            |
   |                                     |    11. Frontend loads      |                            |
   |                                     |        tiles directly      |                            |
   |                                     |        from TiTiler        |                            |
   |                                     |<---------------------------------------------------------|
   |                                     |                            |     /cog/tiles/{z}/{x}/{y} |
```

### S3 Storage Structure

The worker uploads all processed files to an S3-compatible object store (currently SeaweedFS, swappable with AWS S3).

**Bucket:** `mapper` (configured via `SEAWEEDFS_BUCKET` env var)

**Key format:** `{org_id}/{project_id}/{filename}`

```
mapper/                                          ← S3 bucket
  └── 66bc81b2c30c0bed65c204ee/                  ← org_id
       └── 69c7bdab3cf133ca1c077c53/             ← project_id
            ├── orthomosaic_cog.tif              ← Cloud Optimized GeoTIFF (main map)
            ├── dsm_cog.tif                      ← Digital Surface Model
            ├── dtm_cog.tif                      ← Digital Terrain Model (if requested)
            ├── pointcloud.laz                   ← 3D point cloud
            ├── mesh.obj                         ← 3D mesh geometry
            ├── odm_textured_model_geo.mtl       ← mesh material file
            ├── odm_textured_model_geo_0.jpg     ← mesh texture(s)
            └── thumbnail.jpg                    ← 800px JPEG preview
```

### What the Worker Writes to MongoDB (`outputs` collection)

For **each** file uploaded, the worker creates a document in the `outputs` collection:

```json
{
  "_id": "69c7be123cf133ca1c077c60",
  "org_id": "66bc81b2c30c0bed65c204ee",
  "project_id": "69c7bdab3cf133ca1c077c53",
  "job_id": "69c7bdab3cf133ca1c077c54",
  "type": "orthomosaic",
  "format": "tif",
  "storage_key": "66bc81b2c30c0bed65c204ee/69c7bdab3cf133ca1c077c53/orthomosaic_cog.tif",
  "size_bytes": 285435756,
  "metadata": {
    "gsd_cm": 2.45,
    "area_hectares": 12.5,
    "bounds": [73.8520, 18.5180, 73.8600, 18.5240],
    "width": 15200,
    "height": 12800
  },
  "created_at": "2026-03-28T12:30:00Z"
}
```

The `storage_key` is the S3 object key. The worker writes this — the backend never writes to S3 directly.

### How the Backend Serves Outputs to the Frontend

The backend's `OutputsService` reads output documents from MongoDB, then **enriches** each one with live URLs generated from the `StorageService`:

| Output Type | What Backend Adds | How It Generates the URL |
|-------------|-------------------|--------------------------|
| `thumbnail` | `url` | Presigned S3 GET URL (1-hour expiry) via `StorageService.getPresignedUrl(storage_key)` |
| `orthomosaic`, `dsm`, `dtm` | `tile_url` + `download_url` | **tile_url**: TiTiler URL pointing to the S3 COG path — `{TITILER_URL}/cog/tiles/{z}/{x}/{y}?url=s3://mapper/{storage_key}`. **download_url**: Presigned S3 GET URL (1-hour expiry) |
| `mesh`, `pointcloud` | `download_url` | Presigned S3 GET URL (1-hour expiry) |

**The backend never stores URLs in MongoDB** — it generates them on-the-fly from the `storage_key`. This means URLs are always fresh and never stale.

### TiTiler — How Map Tiles Work

For COG (Cloud Optimized GeoTIFF) outputs (orthomosaic, DSM, DTM), the frontend doesn't download the entire file. Instead:

1. Backend returns a `tile_url` template: `http://<titiler>:8000/cog/tiles/{z}/{x}/{y}?url=s3://mapper/{storage_key}`
2. Frontend passes this to Mapbox/Leaflet as a tile layer
3. The map library requests individual tiles as the user pans/zooms
4. TiTiler reads just the needed portion from the COG file in S3 (COGs support random access)
5. TiTiler returns a 256x256 PNG tile

TiTiler has its own S3 credentials (configured via env vars) so it can read directly from the S3 bucket without presigned URLs.

---

## 5. After Completion — Fetching Outputs

### List Outputs for a Project

```
GET /api/projects/:projectId/outputs
Header: org-id: <org_id>
```

Response (enriched with live URLs by the backend):

```json
[
  {
    "_id": "69c7be123cf133ca1c077c60",
    "org_id": "66bc81b2c30c0bed65c204ee",
    "project_id": "69c7bdab3cf133ca1c077c53",
    "job_id": "69c7bdab3cf133ca1c077c54",
    "type": "orthomosaic",
    "format": "tif",
    "storage_key": "66bc81b2c30c0bed65c204ee/69c7bdab3cf133ca1c077c53/orthomosaic_cog.tif",
    "size_bytes": 285435756,
    "metadata": {
      "gsd_cm": 2.45,
      "area_hectares": 12.5,
      "bounds": [73.8520, 18.5180, 73.8600, 18.5240],
      "width": 15200,
      "height": 12800
    },
    "created_at": "2026-03-28T12:30:00Z",
    "tile_url": "http://titiler:8000/cog/tiles/{z}/{x}/{y}?url=s3%3A%2F%2Fmapper%2F66bc81b2...%2Forthomosaic_cog.tif",
    "download_url": "http://seaweedfs:8888/mapper/66bc81b2.../orthomosaic_cog.tif?X-Amz-Signature=..."
  },
  {
    "_id": "69c7be123cf133ca1c077c61",
    "type": "dsm",
    "format": "tif",
    "storage_key": "66bc81b2c30c0bed65c204ee/69c7bdab3cf133ca1c077c53/dsm_cog.tif",
    "size_bytes": 108434300,
    "metadata": { "bounds": [73.8520, 18.5180, 73.8600, 18.5240], "gsd_cm": 2.45 },
    "created_at": "2026-03-28T12:30:00Z",
    "tile_url": "http://titiler:8000/cog/tiles/{z}/{x}/{y}?url=s3%3A%2F%2Fmapper%2F66bc81b2...%2Fdsm_cog.tif",
    "download_url": "http://seaweedfs:8888/mapper/66bc81b2.../dsm_cog.tif?X-Amz-Signature=..."
  },
  {
    "_id": "69c7be123cf133ca1c077c62",
    "type": "thumbnail",
    "format": "jpg",
    "storage_key": "66bc81b2c30c0bed65c204ee/69c7bdab3cf133ca1c077c53/thumbnail.jpg",
    "size_bytes": 85200,
    "metadata": {},
    "created_at": "2026-03-28T12:30:00Z",
    "url": "http://seaweedfs:8888/mapper/66bc81b2.../thumbnail.jpg?X-Amz-Signature=..."
  },
  {
    "_id": "69c7be123cf133ca1c077c63",
    "type": "pointcloud",
    "format": "laz",
    "storage_key": "66bc81b2c30c0bed65c204ee/69c7bdab3cf133ca1c077c53/pointcloud.laz",
    "size_bytes": 52430000,
    "metadata": {},
    "created_at": "2026-03-28T12:30:00Z",
    "download_url": "http://seaweedfs:8888/mapper/66bc81b2.../pointcloud.laz?X-Amz-Signature=..."
  }
]
```

### Output Types Reference

| Type | Format | S3 Filename | URLs Returned | How Frontend Uses It |
|------|--------|-------------|---------------|---------------------|
| `orthomosaic` | COG GeoTIFF | `orthomosaic_cog.tif` | `tile_url` + `download_url` | Render as tile layer on Mapbox/Leaflet map using `tile_url` |
| `dsm` | COG GeoTIFF | `dsm_cog.tif` | `tile_url` + `download_url` | Elevation visualization layer on map |
| `dtm` | COG GeoTIFF | `dtm_cog.tif` | `tile_url` + `download_url` | Terrain visualization layer on map |
| `mesh` | OBJ + MTL + textures | `mesh.obj` | `download_url` | Download and render in 3D viewer (Three.js, Cesium) |
| `pointcloud` | LAZ | `pointcloud.laz` | `download_url` | Download and render in point cloud viewer (Potree) |
| `thumbnail` | JPEG | `thumbnail.jpg` | `url` | Display as project preview in cards/lists |

### Metadata Explained

| Field | Type | Present On | Description |
|-------|------|-----------|-------------|
| `gsd_cm` | number | orthomosaic, dsm, dtm | Ground Sample Distance in centimeters — the real-world size of one pixel |
| `area_hectares` | number | orthomosaic, dsm, dtm | Total area covered by the map in hectares |
| `bounds` | `[west, south, east, north]` | orthomosaic, dsm, dtm | Geographic bounding box in WGS-84 decimal degrees. Use to center the map. |
| `width` | number | orthomosaic, dsm, dtm | Image width in pixels |
| `height` | number | orthomosaic, dsm, dtm | Image height in pixels |
| `point_count` | number | pointcloud | Number of 3D points (may be null) |

### Get Download URL (single output)

```
GET /api/outputs/:outputId/download
Header: org-id: <org_id>
```

Returns a presigned S3 URL valid for 15 minutes:

```json
{ "url": "http://seaweedfs:8888/mapper/66bc81b2.../orthomosaic_cog.tif?X-Amz-Expires=900&X-Amz-Signature=..." }
```

### Get Tile URL (single output, COG types only)

```
GET /api/outputs/:outputId/tiles
Header: org-id: <org_id>
```

Returns a TiTiler tile URL template for rendering on a web map:

```json
{ "tile_url": "http://titiler:8000/cog/tiles/{z}/{x}/{y}?url=s3%3A%2F%2Fmapper%2F66bc81b2...%2Forthomosaic_cog.tif" }
```

Only works for `orthomosaic`, `dsm`, `dtm` types. Returns 404 for mesh/pointcloud/thumbnail.

---

## 6. Job Document — Complete Schema

This is what the `jobs` collection contains in MongoDB. Both backend and worker read/write to it.

```typescript
interface Job {
  _id: ObjectId;

  // ── Identity ──
  org_id: string;                  // organization (indexed)
  project_id: ObjectId;            // parent project (indexed)

  // ── Input Data (set by backend at creation) ──
  media_files: {                   // what to process
    media_id: string;              // FlytBase media ID
    file_name: string;             // original filename
  }[];
  quality: "preview" | "medium" | "high";
  options: {
    orthomosaic: boolean;
    mesh: boolean;
    pointcloud: boolean;
    dsm: boolean;
    dtm: boolean;
  };
  image_count: number;             // = media_files.length
  flight_ids: string[];            // for reference
  selected_file_ids: string[];     // for reference
  excluded_file_ids: string[];     // for reference

  // ── Status (updated by worker continuously) ──
  status: "queued" | "downloading" | "processing" | "completed" | "failed";
  stage: string;                   // e.g. "opensfm", "openmvs", "uploading", "done"
  progress: number;                // 0–100
  message: string;                 // human-readable status
  estimated_seconds_remaining: number | null;  // ETA in seconds

  // ── Timing ──
  created_at: Date;                // when job was created (auto)
  updated_at: Date;                // last update (auto)
  started_at: Date | null;         // when worker began processing
  completed_at: Date | null;       // when job finished (success or failure)

  // ── Error (only when status = "failed") ──
  error: string | null;            // stack trace / error details (up to 2000 chars)
}
```

---

## 7. WebSocket Events — Complete Reference

### Events the Frontend Sends

| Event | Payload | Purpose |
|-------|---------|---------|
| `subscribe_job` | `{ job_id: string }` | Join room `job:<job_id>` to receive updates for that specific job |
| `subscribe_org` | `{ org_id: string }` | Join room `org:<org_id>` to receive updates for all jobs in that org |

### Events the Frontend Receives

| Event | Payload | When |
|-------|---------|------|
| `job:update` | `{ job_id, project_id, status, stage, progress, message, estimated_seconds_remaining }` | On every worker progress update (many times per job) |
| `job:completed` | `{ job_id, project_id }` | When job finishes successfully |
| `job:failed` | `{ job_id, project_id, error }` | When job fails |

All three events are emitted to **both** the `job:<job_id>` room and the `org:<org_id>` room.

---

## 8. Typical Timeline

For **100 images** at different quality levels:

| Quality | Download | Processing | Upload | Total |
|---------|----------|------------|--------|-------|
| `preview` | ~2 min | ~15 min | ~2 min | **~20 min** |
| `medium` | ~2 min | ~50 min | ~5 min | **~60 min** |
| `high` | ~2 min | ~3 hours | ~10 min | **~3.5 hours** |

Processing time scales roughly linearly with image count.

---

## 9. Error Handling

### Backend Errors (immediate, synchronous)

| Error | When | HTTP Status |
|-------|------|-------------|
| FlytBase not configured | `org_settings` missing for this `org_id` | 404 |
| Invalid quality | Not one of preview/medium/high | 400 |
| Empty media_files | No media IDs provided | 400 |
| Project not found | Invalid `projectId` | 404 |

### Worker Errors (async, via WebSocket `job:failed`)

| Error | Cause |
|-------|-------|
| "FlytBase integration not configured for org X" | org_settings not found in MongoDB |
| "FlytBase auth error 401: check service token" | Token expired or invalid |
| "FlytBase returned zero valid download URLs" | All media_ids returned null URLs |
| "ODM exited with code X and no orthomosaic was produced" | Images have no GPS/EXIF, insufficient overlap, or ODM crash |
| "No media files specified in job" | media_files array empty in job doc |
| Upload connection errors | S3/SeaweedFS unreachable |

Frontend should display the `error` field from `job:failed` event or from `GET /api/jobs/:id` when `status === "failed"`.

---

## 10. Quick Reference — Frontend Integration Checklist

```
1. Start processing:
   POST /api/projects/:projectId/process
   Body: { media_files, quality, options, flight_ids, selected_file_ids }
   Save returned job_id

2. Subscribe to updates:
   socket.emit("subscribe_job", { job_id })

3. Handle progress:
   socket.on("job:update") → update progress bar, stage label, ETA

4. Handle completion:
   socket.on("job:completed") → fetch outputs, show map

5. Handle failure:
   socket.on("job:failed") → show error message

6. Fetch results:
   GET /api/projects/:projectId/outputs → list all generated files
   GET /api/outputs/:id/tiles → get tile URL for map display
   GET /api/outputs/:id/download → get download URL
```
