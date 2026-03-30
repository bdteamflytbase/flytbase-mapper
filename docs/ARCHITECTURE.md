# FlytBase Mapper — Architecture

## Overview
Standalone photogrammetry platform that sits on top of FlytBase. Users draw an AOI polygon on a map → the platform discovers all drone media captured in that area via FlytBase v3 geoFilter API → user selects images → jobs submitted to OpenDroneMap GPU processing → results visualized as 2D orthomosaic (Leaflet + TiTiler COG) and 3D mesh (Three.js OBJLoader).

**No login page** — auth is `org-id` header (from SuperTokens session context).

## Key Design Decisions

### 1. AOI-Based (not mission-based)
Projects are defined by a GeoJSON Polygon drawn on the map. Media discovery calls:
```
POST /v3/objects/files { geoFilter: { intersects: { type: "Polygon", coordinates: [...] } } }
```
Response is grouped by `flight_id`, with `mission_name`, `flight_date` included — no extra calls needed.

### 2. Docker-in-Docker for ODM
Worker is `python:3.12-slim` with `/var/run/docker.sock` mounted. ODM runs as:
```bash
docker run --rm --gpus all -v /tmp/worker/{job_id}:/datasets/code opendronemap/odm:latest
```

### 3. Pre-fetched Download URLs
NestJS fetches file download URLs from FlytBase BEFORE publishing to RabbitMQ. Worker receives ready-to-use URLs. No FlytBase token ever in the queue.

### 4. MongoDB Change Streams → WebSocket
Worker writes progress directly to MongoDB via Motor. NestJS watches `jobs` collection via Change Stream and emits `job:update` via Socket.io. Browser receives real-time progress without polling.

### 5. COG + TiTiler for 2D Raster Serving
Worker converts orthomosaic and DSM/DTM to Cloud Optimized GeoTIFF (COG). TiTiler reads COG from SeaweedFS on demand, serves XYZ tile layers. No pre-tiling storage needed.

## Data Flow

```
User draws AOI polygon
        ↓
POST /v3/objects/files/count (live count as user draws)
        ↓
Project saved with aoi: GeoJSON.Polygon
        ↓
GET /api/projects/:id/flights
  → NestJS calls POST /v3/objects/files (paginates all pages)
  → Groups by date (newest first)
  → Marks processed flights (flight_id in any outputs record)
  → Returns DateGroup[]
        ↓
User selects flights + deselects bad images
        ↓
POST /api/projects/:id/process
  → Creates Job record (status: queued)
  → Publishes to RabbitMQ with pre-fetched file URLs
        ↓
Worker picks message
  → Downloads images (httpx, concurrency=5)
  → docker run odm (stdout parsed for stage progress)
  → Motor writes progress → Change Stream → Socket.io → browser
  → rasterio converts to COG
  → Pillow generates thumbnail
  → boto3 uploads to SeaweedFS
  → Motor registers outputs + updates project thumbnail
        ↓
User opens ViewerPage
  → GET /api/projects/:id/outputs
  → tile_url: s3://mapper/{prefix}/orthomosaic_cog.tif (TiTiler reads this)
  → download_url: presigned SeaweedFS URL (15 min)
  → Leaflet renders orthomosaic tiles
  → Three.js OBJLoader renders 3D mesh
```

## Storage Layout (SeaweedFS)
```
bucket: mapper
{orgId}/{projectId}/
  orthomosaic_cog.tif    ← COG, served by TiTiler
  dsm_cog.tif            ← COG, TiTiler colormap=terrain
  dtm_cog.tif            ← COG
  mesh.obj               ← Three.js OBJLoader
  mesh.mtl               ← MTL material
  texture_*.jpg          ← OBJ textures
  pointcloud.laz         ← download only (v1)
  thumbnail.jpg          ← project card preview
```

## API Endpoints
See `apps/api/src/` for full implementation. Key endpoints:
- `POST /api/flytbase/media/in-aoi/count` — live AOI count
- `GET /api/projects/:id/flights` — date→flight→files
- `POST /api/projects/:id/process` — submit job
- `GET /api/projects/:id/outputs` — outputs with URLs

## Environment Variables
See `.env` for all values. Key:
- `MONGODB_URI` — Atlas connection string
- `RABBITMQ_URL` — CloudAMQP connection string
- `SEAWEEDFS_ENDPOINT` — `http://seaweedfs:8888` (internal Docker)
- `TITILER_URL` — `http://titiler:8000` (internal Docker)
