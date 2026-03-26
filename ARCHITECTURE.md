# FlytBase Mapper — System Architecture

**Version**: 2.0
**Last Updated**: March 26, 2026

---

## Current Architecture (Local)

```
┌─────────────────────────────────────────────────────────────┐
│                     localhost:4000                            │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐   │
│  │                    FastAPI Server                      │   │
│  │                    (scripts/api.py)                    │   │
│  │                                                        │   │
│  │  Routes:                                               │   │
│  │  /                    → Dashboard (HTML)               │   │
│  │  /project/:id         → Viewer (HTML)                  │   │
│  │  /api/sites/*         → Sites CRUD                     │   │
│  │  /api/projects/*      → Projects CRUD                  │   │
│  │  /api/jobs/*          → Job tracking                   │   │
│  │  /api/export/*        → File downloads                 │   │
│  │  /api/webhooks/*      → Automated ingestion            │   │
│  │  /assets/*            → Images, models, maps           │   │
│  └──────────┬───────────────────────────┬────────────────┘   │
│             │                           │                     │
│  ┌──────────▼──────────┐   ┌───────────▼───────────────┐    │
│  │  SQLite Database     │   │  OpenDroneMap (Docker)     │    │
│  │  (mapper.db)         │   │                            │    │
│  │                      │   │  Input: drone images       │    │
│  │  Tables:             │   │  Output:                   │    │
│  │  - sites             │   │   - Orthomosaic (.tif)     │    │
│  │  - projects          │   │   - 3D Mesh (.obj)         │    │
│  │  - outputs           │   │   - Point Cloud (.laz)     │    │
│  │  - jobs              │   │   - DSM/DTM (.tif)         │    │
│  │  - annotations       │   │                            │    │
│  └──────────────────────┘   └────────────────────────────┘    │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐   │
│  │                    Viewer (HTML/JS)                     │   │
│  │                                                        │   │
│  │  Leaflet.js  → 2D orthomosaic, DSM, DTM, annotations │   │
│  │  Three.js    → 3D mesh, point cloud, 3D measurements  │   │
│  │  Custom JS   → Compare slider, timelapse, gallery     │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐   │
│  │                    File System                         │   │
│  │                                                        │   │
│  │  /images/          → Source drone images                │   │
│  │  /output/          → Processed outputs                  │   │
│  │  /odm_project/     → ODM working directory             │   │
│  │  /data/            → New project uploads                │   │
│  └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Production Architecture (mapper.flytbase.com)

```
┌─────────────────────────────────────────────────────────────┐
│                    mapper.flytbase.com                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐     ┌──────────────────┐                    │
│  │ Cloudflare   │────▶│ Load Balancer     │                    │
│  │ CDN + WAF    │     │ (ALB / Nginx)     │                    │
│  └─────────────┘     └────────┬─────────┘                    │
│                               │                               │
│              ┌────────────────┼────────────────┐              │
│              ▼                ▼                ▼              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ API Server 1  │  │ API Server 2  │  │ API Server N  │       │
│  │ (FastAPI)     │  │ (FastAPI)     │  │ (FastAPI)     │       │
│  │ ECS/Cloud Run │  │ ECS/Cloud Run │  │ ECS/Cloud Run │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         └──────────────────┼──────────────────┘              │
│                            ▼                                  │
│              ┌──────────────────────────┐                     │
│              │  Redis (Job Queue)        │                     │
│              │  - Import jobs            │                     │
│              │  - Processing jobs        │                     │
│              │  - WebSocket pub/sub      │                     │
│              └────────────┬─────────────┘                     │
│                           ▼                                   │
│         ┌─────────────────────────────────┐                   │
│         │  Worker Pool (Auto-scaling)      │                   │
│         │                                  │                   │
│         │  ┌────────┐ ┌────────┐ ┌──────┐ │                   │
│         │  │Worker 1 │ │Worker 2 │ │Wkr N │ │                   │
│         │  │GPU Spot │ │GPU Spot │ │GPU   │ │                   │
│         │  │Instance │ │Instance │ │Spot  │ │                   │
│         │  │(ODM)    │ │(ODM)    │ │(ODM) │ │                   │
│         │  └────────┘ └────────┘ └──────┘ │                   │
│         │  Auto-scales 0→50 based on queue │                   │
│         └─────────────────────────────────┘                   │
│                           │                                   │
│              ┌────────────┼────────────┐                      │
│              ▼            ▼            ▼                      │
│  ┌──────────────┐  ┌──────────┐  ┌──────────────┐           │
│  │ S3 / GCS     │  │PostgreSQL│  │ Redis Cache   │           │
│  │ (Images +    │  │ (Metadata│  │ (Sessions +   │           │
│  │  Outputs)    │  │  + Users)│  │  Hot data)    │           │
│  │  ~50TB       │  │          │  │               │           │
│  └──────────────┘  └──────────┘  └──────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow

```
Drone captures images
       │
       ▼
┌─────────────────┐     Three entry points:
│                  │
│  ① Manual Upload │     User drags images into dashboard
│     POST /api/   │     → stored in /data/{project_id}/images/
│     projects/    │
│     {id}/upload  │
│                  │
│  ② FlytBase API  │     Mapper calls FlytBase to fetch media
│     POST /api/   │     → downloads to /data/{project_id}/images/
│     projects/    │
│     {id}/import  │
│                  │
│  ③ Webhook       │     FlytBase sends event on flight complete
│     POST /api/   │     → auto-creates project, imports, processes
│     webhooks/    │
│     flytbase     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  ODM Processing  │     Docker container runs photogrammetry
│  (Background)    │     SfM → Dense → Mesh → Texture → Ortho
│                  │     Progress tracked via Job table
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Post-Processing │     Generate thumbnails, previews
│                  │     Run change detection (OpenCV)
│                  │     Send notifications
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Viewer          │     User sees orthomosaic, 3D model,
│                  │     elevation maps, measurements,
│                  │     compare surveys, annotations
└─────────────────┘
```

---

## FlytBase Integration

### APIs We CONSUME from FlytBase

| # | API | Method | Purpose |
|---|---|---|---|
| 1 | List Missions/Flights | `GET /v3/missions` | Browse available flights |
| 2 | Get Mission Media | `GET /v3/missions/{id}/media` | Get image URLs |
| 3 | Download Image | `GET {image_url}` | Download drone image |
| 4 | Get Flight Metadata | `GET /v3/missions/{id}` | Drone model, altitude, GPS |
| 5 | Auth / Token | `POST /v3/auth/token` | Validate API key |
| 6 | List Galleries | `GET /v3/galleries` | Browse media galleries |

### APIs We EXPOSE to FlytBase

| # | API | Method | Purpose |
|---|---|---|---|
| 1 | Webhook Receiver | `POST /api/webhooks/flytbase` | Flight completion event |
| 2 | Processing Status | `GET /api/jobs/{id}` | Check if map is ready |
| 3 | Get Map Outputs | `GET /api/projects/{id}/outputs` | List generated outputs |
| 4 | Download Output | `GET /api/outputs/{id}/download` | Download specific file |
| 5 | Site Overview | `GET /api/sites/{id}` | Site metadata + timeline |
| 6 | Change Detection | `GET /api/projects/{id}/change-detection` | AI analysis results |
| 7 | Volume Measurement | `POST /api/projects/{id}/volume` | Stockpile volume calc |
| 8 | Annotations Export | `GET /api/projects/{id}/annotations/export` | GeoJSON annotations |
| 9 | Report | `GET /api/projects/{id}/report` | Processing report |
| 10 | Notifications | `POST /api/projects/{id}/notify` | Alert on events |

### Integration Flow

```
┌─────────────────┐                    ┌─────────────────┐
│   FlytBase       │                    │   Mapper         │
│   Platform       │                    │                  │
│                  │   1. Flight done   │                  │
│  Flight Mgmt  ──┼──── webhook ─────▶│  Webhook Recv   │
│                  │                    │       │          │
│  Media API    ◀──┼──── GET media ────┤  Importer       │
│  (images)     ──┼──── download ────▶│       │          │
│                  │                    │  ODM Processing  │
│                  │   3. Poll status   │       │          │
│  Dashboard    ◀──┼──── GET job ───────┤       │          │
│                  │   4. Get outputs   │  Outputs        │
│  [iframe]     ◀──┼──── GET outputs ──┤  Storage        │
│  mapper.      ◀──┼──── /project/id ──┤                  │
│  flytbase.com    │   6. Notify user   │  Notifier       │
│  Slack/Email  ◀──┼──── POST notify ──┤                  │
└─────────────────┘                    └─────────────────┘
```

### Authentication

- **FlytBase → Mapper**: HMAC-signed webhook payloads + JWT tokens for embed
- **Mapper → FlytBase**: Bearer API key in Authorization header
- **Embed mode**: `mapper.flytbase.com/project/{id}?token={jwt}&embed=true`

### What FlytBase Engineering Needs to Build

| Item | Their Side | Our Side | Effort |
|---|---|---|---|
| Webhook on flight complete | Add webhook config, fire POST | Already built | Low |
| Media download API | Already exists | Already consuming | Done |
| Embed viewer iframe | Add iframe component | Add ?embed=true mode | Low |
| SSO integration | Pass JWT token | Validate JWT | Medium |
| Shared billing | Track per-org usage | Expose usage metrics | Medium |

---

## Cost at Scale (100 customers/month)

| Component | Monthly Cost |
|---|---|
| 3x API servers (Fargate) | $150 |
| 10x GPU spot workers (avg) | $800 |
| S3 storage (10TB) | $230 |
| CloudFront CDN | $50 |
| PostgreSQL (RDS) | $65 |
| Redis (ElastiCache) | $50 |
| **Total** | **~$1,350/mo** |
| **Per customer** | **~$13.50/mo** |

---

## Tech Stack Summary

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML/CSS/JS (Leaflet, Three.js) |
| Backend API | FastAPI (Python) |
| Database | SQLite (local) → PostgreSQL (production) |
| Processing | OpenDroneMap via Docker |
| Computer Vision | OpenCV (change detection, volume) |
| File Storage | Local FS → S3/GCS (production) |
| Job Queue | Background tasks → Redis/Celery (production) |
| Auth | API keys → FlytBase SSO/JWT (production) |
