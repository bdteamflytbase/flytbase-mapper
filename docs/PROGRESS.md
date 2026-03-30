# FlytBase Mapper — Implementation Progress

## Status: Phase 1–4 COMPLETE (code written, not yet deployed)

---

## Phase 1 — Scaffold ✅
- [x] Nx-style monorepo at `/home/rushikesh/mapper-platform/`
- [x] `apps/api/` — NestJS 10
- [x] `apps/web/` — React 18 + Vite
- [x] `packages/shared-types/` — shared TypeScript interfaces
- [x] `worker/` — Python 3.12 worker
- [x] `infra/` — docker-compose.yml, SeaweedFS config
- [x] `.env` with real MongoDB + RabbitMQ credentials

## Phase 2 — NestJS API ✅
Modules implemented:
- [x] `org-settings` — FlytBase service token config (GET/PUT)
- [x] `flytbase` — proxy to FlytBase v2/v3 APIs (sites, `POST /v3/objects/files`)
- [x] `projects` — CRUD + AOI field + `GET /flights` (date→flight→files)
- [x] `jobs` — status queries + cancel
- [x] `outputs` — presigned URLs + TiTiler tile URLs
- [x] `queue` — RabbitMQ publisher + `POST /projects/:id/process`
- [x] `storage` — SeaweedFS S3 client (aws-sdk v3)
- [x] `change-stream` — MongoDB Change Stream → Socket.io WebSocket
- [x] `health` — `GET /api/health`

Auth: SuperTokens session cookie (`withCredentials: true`) + `org-id` header. No login page.

## Phase 3 — React Frontend ✅
Pages:
- [x] `DashboardPage` — FlytBase sites grid
- [x] `SitePage` — project cards per site
- [x] `ProjectPage` — date accordion + flight cards + image grid + selection state
- [x] `ViewerPage` — 2D (Leaflet/TiTiler) + 3D (Three.js OBJLoader) + Elevation (Leaflet/TiTiler colormap)
- [x] `SettingsPage` — org-id + FlytBase service token config

Components:
- [x] `AOIDrawer` — Maplibre GL map with click-to-draw polygon + live media count preview
- [x] `DateAccordion` — collapsible date sections
- [x] `FlightCard` — flight row with checkbox + expand preview
- [x] `ImageGrid` — thumbnail grid with per-image checkboxes + lightbox
- [x] `ProcessingModal` — quality + output options
- [x] `JobProgressBar` — real-time Socket.io-driven progress
- [x] `OrgSetup` — simple org-id entry (no login page)
- [x] `Viewer2D` / `Viewer3D` / `ElevationView`

State: Zustand `selectionStore` manages selected/deselected file state.

## Phase 4 — Python Worker ✅
Files:
- [x] `main.py` — asyncio entry point
- [x] `consumer.py` — aio-pika RabbitMQ consumer (prefetch=1)
- [x] `handler.py` — full pipeline orchestration
- [x] `db.py` — Motor client, job updates, output registration
- [x] `downloader.py` — httpx parallel download (semaphore=5)
- [x] `odm_runner.py` — docker subprocess + stdout stage parsing
- [x] `post_processor.py` — rasterio COG conversion + thumbnail + metadata
- [x] `uploader.py` — boto3 SeaweedFS upload + MongoDB registration

Pipeline: Download → ODM (Docker-in-Docker, GPU) → COG → Thumbnail → Upload → Register

## Phase 5 — GPU Machine Setup (PENDING)
- [ ] SSH access to `root-deair@100.76.65.86`
- [ ] Create storage directories: `/data/mapper/seaweedfs`, `/data/mapper/worker_tmp`
- [ ] `docker pull opendronemap/odm:latest`
- [ ] Create `.env` on GPU machine
- [ ] `docker compose up -d`
- [ ] Run SeaweedFS bucket setup: `bash infra/seaweedfs/setup.sh`
- [ ] Verify: `docker exec mapper_worker_1 docker run --rm --gpus all nvidia/cuda:12.0-base nvidia-smi`

---

## Known Gaps / Next Steps
1. Tailwind CSS config not yet created (`tailwind.config.js`)
2. `apps/api/Dockerfile` — multi-stage build needs `npm run build` to work first
3. Shared-types imports use relative paths (should use npm workspace links)
4. MapLibre GL Draw package needs verifying (actual npm package name: `@mapbox/mapbox-gl-draw` or custom)
5. Worker `.env` file needed on GPU machine (copy from repo `.env`)

---

## File Count
- NestJS API: 23 files
- React Web: 16 files
- Python Worker: 7 files
- Infrastructure: 4 files
- Docs: 3 files
