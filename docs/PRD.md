# FlytBase Mapper — Product Requirements Document

**Version**: 1.0
**Date**: March 2026
**Status**: In Development (Local → Cloud Migration Planned)

---

## 1. Overview

### 1.1 Product Summary

FlytBase Mapper is a photogrammetry platform integrated with the FlytBase drone operations ecosystem. It allows FlytBase customers to select drone flights captured over a geographic area, trigger automated 3D reconstruction processing, and view the resulting geospatial outputs — orthomosaic maps, 3D textured models, point clouds, DSM, and DTM — directly in the browser.

### 1.2 Problem Statement

FlytBase operators capture large volumes of aerial imagery during grid missions but have no integrated path from raw imagery to processed geospatial outputs. Currently they must manually export images, use standalone desktop tools (Pix4D, Agisoft), and re-import results. This breaks the operational workflow and creates delays between capture and analysis.

### 1.3 Goals

- Let FlytBase operators process drone imagery to 3D outputs without leaving the FlytBase ecosystem
- Support batch selection of flights by date and geographic area (AOI)
- Deliver orthomosaic, point cloud, DSM, DTM, and textured 3D model as outputs
- Display outputs in an interactive browser-based viewer with 2D, 3D, and elevation views
- Run processing on GPU-accelerated infrastructure without operator intervention

### 1.4 Non-Goals (v1)

- Real-time processing during flight (post-flight only)
- Multi-user collaboration or role-based access control within a project
- On-device or edge processing
- AI-based anomaly detection on outputs (future)
- Mobile app

---

## 2. Users

### Primary User

**FlytBase Organization Admin / Operator**
- Already has a FlytBase account with active drone operations
- Has conducted grid missions over a defined area (site)
- Wants to see processed 3D outputs without managing external software
- Technical comfort: moderate — comfortable with web apps but not CLI tools

### Secondary User (Future)

**GIS Analyst / Data Consumer**
- Receives a share link or download to the orthomosaic/point cloud
- Does not interact with the capture or processing side

---

## 3. System Architecture

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      User's Browser                         │
│           React SPA (routes, viewers, state)                │
└───────────────────────────┬─────────────────────────────────┘
                            │ REST + WebSocket
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    NestJS API (port 3000)                    │
│  - Serves React SPA                                         │
│  - REST endpoints for projects, jobs, outputs               │
│  - Proxies FlytBase v3 API (media queries, site listings)   │
│  - Publishes jobs to RabbitMQ                               │
│  - MongoDB change stream → WebSocket (real-time job status) │
│  - S3 presigned URL generation                              │
└────┬──────────────┬───────────────┬───────────────┬─────────┘
     │ MongoDB      │ RabbitMQ      │ SeaweedFS/S3  │ FlytBase API
     ▼              ▼               ▼               ▼
  MongoDB        RabbitMQ       Object Storage   FlytBase v3
  Atlas          (CloudAMQP)    (SeaweedFS now,  (media metadata,
  (projects,     mapper.jobs    S3 future)       site/flight data)
   jobs,         queue
   outputs,
   org_settings)
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│              GPU Worker (Python, Docker-in-Docker)           │
│  - Consumes mapper.jobs queue (one job at a time)           │
│  - Downloads images from pre-signed URLs                    │
│  - Runs OpenDroneMap (ODM 3.6) inside Docker                │
│  - Converts outputs to Cloud Optimized GeoTIFF (COG)        │
│  - Uploads to object storage, registers in MongoDB          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    TiTiler (port 8000)                       │
│  - Reads COG files from S3-compatible storage               │
│  - Serves XYZ map tiles for orthomosaic, DSM, DTM           │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Data Flow — Full E2E

```
1. User opens Mapper UI → authenticates with FlytBase org credentials
2. Settings page: enter FlytBase org ID + service token (stored encrypted in MongoDB)
3. Dashboard: API proxies FlytBase /v3/sites → displays site cards
4. Site page: API fetches projects from MongoDB for that site
5. Create Project: user draws AOI polygon on map → POST /api/projects
6. Project page: API calls FlytBase /v3/objects/files with AOI geo-filter
             → returns media grouped by date → displayed as collapsible flight rows
7. User selects flights/files → clicks Process → ProcessingModal (quality, output options)
8. POST /api/projects/:id/process → API creates Job record (status: queued)
             → publishes to RabbitMQ mapper.jobs queue
             → returns { job_id } to frontend
9. Frontend subscribes to WebSocket room job:<job_id>
10. Worker picks up job:
    a. Downloads images from FlytBase pre-signed URLs (5 parallel)
    b. Runs ODM Docker container (GPU, --gpus all)
    c. Post-processes: COG conversion, thumbnail generation, metadata extraction
    d. Uploads outputs to object storage (S3 keys: {org_id}/{project_id}/*)
    e. Registers output records in MongoDB
    f. Updates job status → completed
11. MongoDB change stream detects update → API emits WebSocket job:update event
12. Frontend re-fetches outputs → View Results button becomes active
13. Viewer page: loads outputs, renders 2D map (Leaflet+COG tiles), 3D mesh (Three.js OBJ), elevation (COG DEMs)
```

---

## 4. Features

### 4.1 Organization Setup

**FR-01: FlytBase Credentials Configuration**
- User enters FlytBase Org ID and Service Token via Settings page
- API validates by making a test call to FlytBase
- Credentials stored encrypted in MongoDB per org
- All subsequent API calls made with these credentials as a service account (not user JWT)

**FR-02: Org Isolation**
- All data (projects, jobs, outputs) is scoped to `org_id`
- `org-id` header required on all frontend API calls
- No cross-org data leakage

### 4.2 Sites & Projects

**FR-03: Site Listing**
- Dashboard displays all FlytBase sites for the org (proxied from FlytBase API)
- Shows site name, coordinates, project count
- Clicking a site navigates to its project list

**FR-04: Project Creation**
- User draws a polygon AOI (Area of Interest) on an interactive map
- Project is stored with name, description, site_id, and GeoJSON AOI polygon
- AOI is used as the geographic filter for all media queries

**FR-05: Project Listing**
- Projects listed per site in a card grid
- Card shows thumbnail (generated from orthomosaic after first job completes), creation date, processing status

**FR-06: Project Deletion**
- Soft-delete (status: archived) — no data loss on first delete
- Hard delete of associated outputs from storage (future)

### 4.3 Flight Selection

**FR-07: AOI-Based Media Discovery**
- On opening a project, API queries FlytBase `/v3/objects/files` with the project's AOI polygon as a geo-filter
- Returns all media captured within the AOI boundary
- No manual flight URL entry required

**FR-08: Date-Grouped Flight Display**
- Media grouped by capture date (UTC) and flight (task_id)
- Each date row is a collapsible accordion showing all flights for that day
- Each flight row shows: mission name, image count, capture time, thumbnail grid

**FR-09: Granular File Selection**
- User can select/deselect entire dates, individual flights, or individual files
- Selection state managed in Zustand store (selectedFlightIds, selectedFileIds, deselectedFileIds)
- Selected count shown live in header: "Process (N)"

### 4.4 Processing

**FR-10: Job Submission**
- User clicks Process → ProcessingModal
- Modal options:
  - **Quality**: Preview (fast, low-res) / Medium (default) / High (slow, full-res)
  - **Outputs**: Orthomosaic, 3D Mesh, Point Cloud, DSM, DTM (checkboxes)
- On confirm: POST /api/projects/:id/process with selection payload

**FR-11: ODM Quality Presets**

| Quality | Feature Quality | PC Quality | Orthophoto Res | Use Case |
|---------|----------------|------------|----------------|----------|
| Preview | Lowest | Lowest | 5 cm/px | Quick check, many images |
| Medium | Medium | Medium | 2 cm/px | Standard deliverable |
| High | High | High | 1 cm/px | Survey-grade output |

**FR-12: Output Type Selection**

| Output | Format | Default | Description |
|--------|--------|---------|-------------|
| Orthomosaic | COG GeoTIFF | On | Georeferenced 2D aerial map |
| 3D Mesh | OBJ + PNG textures | On | RGB photorealistic 3D model |
| Point Cloud | LAZ (compressed) | On | Dense 3D point cloud |
| DSM | COG GeoTIFF | On | Digital Surface Model (surface elevation) |
| DTM | COG GeoTIFF | Off | Digital Terrain Model (bare earth) |

**FR-13: One Job at a Time Per GPU**
- Worker processes prefetch_count=1 from RabbitMQ queue
- Additional jobs are queued and processed sequentially
- Multiple GPU workers can be deployed to parallelize across orgs (future)

**FR-14: Job Progress Tracking**
- Frontend subscribes to WebSocket room for the active job
- Progress bar shows current stage and percentage

| Stage | Progress | Description |
|-------|----------|-------------|
| Downloading | 0–10% | Fetching images from FlytBase CDN |
| OpenSfM | 10–30% | Feature extraction, matching, reconstruction |
| OpenMVS | 30–65% | Dense point cloud generation |
| Meshing | 65–72% | 3D mesh from point cloud |
| Texturing | 72–82% | Projecting drone photos onto mesh |
| Georeferencing | 82–88% | GPS alignment, LAZ export |
| Orthophoto | 88–95% | 2D orthomosaic generation |
| DEM | 95–99% | DSM/DTM generation |
| Uploading | 99% | COG conversion + upload to storage |
| Completed | 100% | All outputs available |

**FR-15: Job Failure Handling**
- On ODM failure: job status set to `failed` with error message
- Error shown in UI on the project page
- User can resubmit (creates new job)

### 4.5 Outputs Viewer

**FR-16: 2D Orthomosaic Viewer**
- Leaflet map displaying the orthomosaic as XYZ tiles via TiTiler
- Supports zoom, pan, satellite basemap toggle
- Overlay: project AOI polygon outline

**FR-17: 3D Mesh Viewer**
- Three.js scene rendering the OBJ + texture files
- Orbit controls: rotate, zoom, pan
- Photorealistic RGB appearance from drone imagery baked as texture atlases
- Two variants: full 3D mesh (terrain elevation) and 2.5D mesh

**FR-18: Elevation Viewer**
- COG raster display for DSM (Digital Surface Model) and DTM (Digital Terrain Model)
- Color-mapped elevation visualization via TiTiler
- Toggle between DSM and DTM

**FR-19: Output Downloads**
- Download button per output type
- Presigned URL generation (15-minute expiry) from object storage
- Direct browser download (no server-side streaming)

---

## 5. Technical Specifications

### 5.1 API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/health | Health check |
| GET/PUT | /api/org/settings | Org credentials |
| GET | /api/flytbase/sites | List FlytBase sites |
| GET | /api/flytbase/sites/:id | Get site detail |
| POST | /api/flytbase/media/in-aoi/count | Count media in AOI |
| GET | /api/projects | List projects |
| POST | /api/projects | Create project |
| GET | /api/projects/:id | Get project |
| PATCH | /api/projects/:id | Update project |
| DELETE | /api/projects/:id | Archive project |
| GET | /api/projects/:id/flights | Get AOI media grouped by date |
| POST | /api/projects/:id/process | Submit processing job |
| GET | /api/jobs | List jobs |
| GET | /api/jobs/:id | Get job |
| DELETE | /api/jobs/:id | Cancel queued job |
| GET | /api/projects/:id/outputs | List outputs with signed URLs |
| GET | /api/outputs/:id/download | Presigned download URL (15 min) |
| GET | /api/outputs/:id/tiles | TiTiler tile URL |

### 5.2 WebSocket Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `job:update` | Server → Client | `{ job_id, status, stage, progress, message }` | Job progress update |
| `job:completed` | Server → Client | `{ job_id, project_id, status }` | Job finished |

Rooms: `org:{org_id}` (all org jobs), `job:{job_id}` (specific job)

### 5.3 MongoDB Collections

| Collection | Key Fields | Indexes |
|------------|-----------|---------|
| `projects` | org_id, site_id, name, aoi, status, thumbnail_url | `{ org_id, site_id }` |
| `jobs` | org_id, project_id, status, stage, progress, flight_ids, image_count | `{ org_id, project_id }` |
| `outputs` | org_id, project_id, job_id, type, format, storage_key, metadata | `{ org_id, project_id }` |
| `org_settings` | org_id, flytbase_org_id, flytbase_service_token, flytbase_api_url | `{ org_id }` |

### 5.4 Object Storage Key Schema

```
{org_id}/
  {project_id}/
    orthomosaic_cog.tif
    dsm_cog.tif
    dtm_cog.tif
    mesh.obj
    mesh_material*.png       (texture atlases, up to 17 files)
    pointcloud.laz
    thumbnail.jpg
```

### 5.5 ODM Processing Requirements

| Parameter | Value |
|-----------|-------|
| Min images | 3 (practical minimum for SfM) |
| Recommended images | 30–200 (overlap ≥ 75%) |
| GPU VRAM required | ≥ 6 GB (8 GB recommended) |
| RAM required | ≥ 16 GB (32 GB for large datasets) |
| Disk required | ~10× input image size for intermediates |
| Formats accepted | JPEG, TIFF (with GPS EXIF metadata) |

---

## 6. Current State (Local Deployment)

### 6.1 What Is Running Locally

| Service | Host | How |
|---------|------|-----|
| NestJS API + React SPA | GPU machine (100.76.65.86:3000) | Docker container |
| GPU Worker (ODM) | GPU machine | Docker container |
| SeaweedFS (S3) | GPU machine | Docker container |
| TiTiler | GPU machine | Docker container |
| MongoDB | MongoDB Atlas (cloud) | External managed |
| RabbitMQ | CloudAMQP (cloud) | External managed |

### 6.2 Current Limitations

- **SeaweedFS is local** — outputs not accessible outside the GPU machine network; TiTiler tiles only served locally
- **Single GPU worker** — one job processed at a time; no horizontal scaling
- **No auth** — org-id header sent in plaintext from localStorage; no session validation
- **No HTTPS** — all traffic over HTTP, plaintext
- **No upload pipeline** — images must already exist in FlytBase; no direct upload to Mapper
- **No output sharing** — no public share links for viewers
- **Worker and API on same machine** — no physical separation of compute and control plane

---

## 7. Cloud Migration Plan

### 7.1 Target Cloud Architecture

```
                         ┌─────────────────────┐
                         │   CloudFront CDN     │
                         │ (HTTPS, cache tiles) │
                         └──────────┬──────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
            ┌───────▼──────┐               ┌───────▼──────┐
            │  API Service  │               │   TiTiler     │
            │ (ECS Fargate  │               │ (ECS Fargate) │
            │  or K8s pod)  │               │              │
            └───────┬───────┘               └───────┬──────┘
                    │                               │
        ┌───────────┼────────────┐                  │
        │           │            │                  │
   ┌────▼──┐  ┌────▼────┐  ┌───▼────┐         ┌───▼────┐
   │MongoDB│  │RabbitMQ │  │  S3    │◄─────────│  S3   │
   │ Atlas │  │CloudAMQP│  │(output)│          │(reads) │
   └───────┘  └─────────┘  └───────┘          └────────┘
                    │
              ┌─────▼──────┐
              │  GPU Worker │
              │ (EC2 g4dn/  │
              │  g5 instance│
              │  or Lambda  │
              │  + ECS)     │
              └─────────────┘
```

### 7.2 Storage: SeaweedFS → AWS S3 (or Compatible)

**Change required**: Zero code changes in worker or API — both use S3-compatible API (boto3/AWS SDK).

| Now | Cloud |
|-----|-------|
| SeaweedFS on GPU machine port 8888 | AWS S3 bucket (or Cloudflare R2 for egress cost) |
| `SEAWEEDFS_ENDPOINT=http://localhost:8888` | Remove endpoint override (native S3) |
| Presigned URLs point to local IP | Presigned URLs point to public S3/R2 |

**Recommendation**: Cloudflare R2 — S3-compatible, zero egress fees (critical for tile serving and downloads), free 10GB storage.

### 7.3 GPU Worker: Docker Compose → Cloud GPU Instance

**Option A — EC2 GPU Instance (recommended for v1)**
- Instance: `g4dn.xlarge` (4 vCPU, 16GB RAM, 1× T4 16GB VRAM) — ~$0.526/hr spot
- Worker runs as a Docker container, connects to RabbitMQ
- Auto-start on instance launch via systemd service
- Scale by starting more instances (each consumes one job at a time)
- **Change required**: Remove Docker-in-Docker — run ODM natively or via subprocess instead of `docker run`

**Option B — ECS with GPU task definition**
- ODM runs as a sidecar container in the same ECS task
- Worker container + ODM container share a mounted volume
- Auto-scaling based on RabbitMQ queue depth (custom CloudWatch metric)

**Option C — AWS Batch (recommended for v2)**
- Submit ODM jobs as Batch jobs, worker just submits and monitors
- Fully managed scaling, spot instance support
- More complex integration but zero idle cost

### 7.4 Docker-in-Docker Removal (Required for Cloud)

Currently the worker runs ODM via `docker run` inside the worker container, requiring Docker socket mount. This is a security concern and incompatible with most managed container platforms.

**Cloud solution**: Run ODM as a subprocess directly:

```python
# Instead of:
cmd = ["docker", "run", "--rm", "--gpus", "all", "-v", ..., "opendronemap/odm:latest", ...]

# Use ODM installed natively or via system Python bindings:
cmd = ["python3", "/opt/odm/run.py", "--project-path", "/datasets", ...]
```

ODM provides a native Python runner. The worker and ODM would be packaged together in one Docker image.

### 7.5 API: Single Instance → Horizontally Scalable

- Move to stateless deployment (already stateless — no in-memory session)
- Deploy to ECS Fargate or App Runner
- MongoDB change stream emitter must be a single instance or use Redis pub/sub for Socket.io fan-out across multiple API instances

**Required change for multi-instance Socket.io**:
```
Redis (ElastiCache) as Socket.io adapter
→ npm install @socket.io/redis-adapter
```

### 7.6 Auth: Header-Based → JWT / SuperTokens

Current: `org-id` sent from localStorage, no validation.

Cloud plan:
- Integrate SuperTokens (already used in FlytBase operations app) for session validation
- API validates JWT, extracts `org_id` from token claims
- No more manual org-id header — extracted server-side
- Use FlytBase SSO so users don't need separate credentials

### 7.7 HTTPS

- CloudFront in front of ALB → API
- ACM certificate for custom domain (`mapper.flytbase.com`)
- TiTiler behind CloudFront for tile caching (dramatically reduces tile compute cost)

### 7.8 Migration Steps (Ordered)

1. **S3/R2 migration** — swap SeaweedFS endpoint, test presigned URLs and TiTiler COG reads
2. **HTTPS + domain** — CloudFront + ACM, update CORS origins
3. **Auth hardening** — SuperTokens JWT validation in NestJS guards
4. **Worker on EC2** — provision g4dn.xlarge, remove Docker-in-Docker, install ODM natively
5. **Auto-scaling worker** — SQS queue depth metric → ASG scale-out policy
6. **API multi-instance** — Redis Socket.io adapter, deploy to ECS Fargate with ALB
7. **TiTiler CloudFront cache** — add cache behaviors for `/cog/tiles/` paths

---

## 8. Non-Functional Requirements

### 8.1 Performance

| Metric | Target | Notes |
|--------|--------|-------|
| Flight list load time | < 3s | FlytBase API pagination, 50 items/page |
| Job submission latency | < 500ms | RabbitMQ publish is async |
| Orthomosaic tile load (first) | < 2s | COG + TiTiler, after CloudFront warm |
| 3D mesh load time | < 10s | OBJ + textures, depends on mesh size |
| Processing time (38 images, medium) | ~15 min | Benchmarked on g4dn.xlarge |
| Processing time (200 images, medium) | ~60 min | Estimated |

### 8.2 Reliability

- API: 99.9% uptime target (ECS with health checks + auto-restart)
- Worker: At-least-once delivery via RabbitMQ durable queue + `requeue=False` on failure
- Storage: S3/R2 provides 99.999999999% (11 nines) object durability
- Job retries: Manual resubmit only (automatic retry not implemented — ODM failures often need user data correction)

### 8.3 Security

- FlytBase service token stored server-side only, never returned to frontend
- Presigned URLs expire in 15 minutes (downloads) and 3600s (tile URLs)
- Output keys scoped to org_id — no cross-org access via guessing keys
- All traffic over HTTPS (cloud deployment)
- No secrets in Docker images — all via environment variables / AWS Secrets Manager

### 8.4 Scalability

| Dimension | Local Limit | Cloud Target |
|-----------|-------------|--------------|
| Concurrent jobs | 1 (single GPU) | N (N GPU worker instances) |
| Storage | 300GB (SeaweedFS local disk) | Unlimited (S3/R2) |
| Orgs | Single (dev) | Multi-tenant (org_id isolation) |
| API instances | 1 | 2–10 (ECS auto-scaling) |

---

## 9. Infrastructure & DevOps

### 9.1 Current Local Stack

```yaml
services:
  api:       NestJS + React SPA, port 3000
  worker:    Python GPU worker, Docker socket mounted
  seaweedfs: S3-compatible object store, port 8888
  titiler:   COG tile server, port 8000 (internal)

external:
  mongodb:   MongoDB Atlas (free M0 tier)
  rabbitmq:  CloudAMQP Little Lemur (free)
```

### 9.2 Deployment Process (Current)

1. Make code change locally
2. `rsync` changed source files to GPU machine
3. `docker compose build <service>` on GPU machine
4. `docker compose up -d <service>`

### 9.3 Target CI/CD

- GitHub Actions pipeline:
  - PR: lint + typecheck + unit tests
  - Merge to main: build Docker images → push to ECR → deploy to ECS (API) + update worker AMI
- Blue/green deployment for zero-downtime API updates
- Worker: rolling replacement of EC2 ASG instances

### 9.4 Monitoring & Observability

- CloudWatch metrics: ECS CPU/memory, SQS queue depth, EC2 GPU utilization
- Application logs: CloudWatch Logs (structured JSON)
- Alerts: queue depth > 5 jobs → scale out worker, API 5xx rate > 1% → PagerDuty
- ODM logs stored per job in S3 (`{org_id}/{project_id}/jobs/{job_id}/odm.log`) for debugging

---

## 10. Open Questions & Future Work

### Open Questions

1. **Output retention policy**: How long are processing outputs stored? Per-org quota or global limit?
2. **FlytBase integration depth**: Should Mapper write back to FlytBase (e.g., attach orthomosaic to a site)? Or is it a separate product?
3. **Billing model**: Per-job pricing? Per-org subscription? GPU cost pass-through?
4. **Direct upload**: Should users be able to upload images directly (not via FlytBase)? Needed for users with images from other drones.
5. **ODM version pinning**: ODM 3.6 is current — flag changes between versions broke flags in this project already.

### Planned Future Features

| Feature | Priority | Notes |
|---------|----------|-------|
| Output sharing (public links) | High | Presigned URLs with longer TTL or public bucket |
| Re-processing with different quality | High | Create new job on same project, archive old outputs |
| Progress email notification | Medium | SES email on job:completed |
| Volume measurement tools | Medium | In-browser measurement on 3D mesh or DSM |
| Annotation layer | Medium | User-drawn annotations saved as GeoJSON overlay |
| Output comparison (before/after) | Medium | Swipe tool between two jobs on same project |
| Multi-GPU parallel job processing | Medium | Auto-scaling worker pool via SQS + ASG |
| Direct image upload | Low | S3 multipart upload, bypass FlytBase requirement |
| AI analysis on outputs | Low | Anomaly detection, change detection, plant health index |
| Mobile viewer | Low | PWA or native app for field use |
