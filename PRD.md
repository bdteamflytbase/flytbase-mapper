# FlytBase Mapper — Product Requirements Document

**Version**: 2.0
**Author**: Deep Gupta
**Date**: March 26, 2026
**Status**: M1-M5 Complete, M4 Deployment In Progress

**Architecture**: See [ARCHITECTURE.md](ARCHITECTURE.md) for full system architecture and FlytBase integration details.

---

## Vision

FlytBase Mapper is a site intelligence platform that transforms drone imagery into actionable 2D/3D maps, with full historical context — like Google Earth, but owned by the enterprise, updated by their drones, and integrated into their operational workflow.

**One-liner**: Every site, every flight, every change — mapped, measured, and tracked over time.

---

## Core Concepts

### Hierarchy

```
Organization (FlytBase account)
└── Site (physical location — a refinery, mine, solar farm, construction site)
    └── Project (a specific survey/flight mission at that site)
        └── Outputs (orthomosaic, 3D model, DSM, DTM, point cloud)
            └── Versions (historical snapshots — compare over time)
```

### Site
A **Site** is a fixed geographic location that gets surveyed repeatedly.

| Field | Description |
|---|---|
| Name | "Shell Deer Park Refinery" |
| Location | GPS coordinates + address |
| Boundary | GeoJSON polygon defining the site perimeter |
| Thumbnail | Auto-generated from latest orthomosaic |
| Status | Active / Archived |
| Tags | Industry vertical, region, client name |

### Project
A **Project** is a single survey/flight at a site. Each flight creates a new project.

| Field | Description |
|---|---|
| Name | Auto: "Survey — Mar 26, 2026" or custom |
| Site | Parent site |
| Flight ID | FlytBase mission/flight ID |
| Date | When the flight occurred |
| Drone | DJI Mavic 3D, etc. |
| Images | Count + total size |
| Status | Uploading → Processing → Completed → Failed |
| Processing Config | Quality preset, custom params |
| Outputs | Links to all generated assets |

### Outputs
Each project generates:

| Output | Format | Description |
|---|---|---|
| Orthomosaic | GeoTIFF + JPG | Georeferenced 2D aerial map |
| 3D Mesh | OBJ + textures | Textured 3D model |
| Point Cloud | LAZ/LAS | Dense 3D point cloud |
| DSM | GeoTIFF | Digital Surface Model (everything) |
| DTM | GeoTIFF | Digital Terrain Model (bare earth) |
| Contours | GeoJSON/DXF | Elevation contour lines |
| Report | PDF | Auto-generated processing report |

### Historical Timeline (Google Earth-style)
The killer feature. For each site:

- **Timeline slider** — scrub through all surveys chronologically
- **Side-by-side compare** — two dates, swipe to compare
- **Change detection** — auto-highlight what changed between surveys
- **Timelapse** — animate all surveys as a video
- **Annotations** — pin notes to specific locations, persist across surveys
- **Measurements** — distance, area, volume tracked over time (stockpile growth, excavation progress)

---

## Information Architecture

### Pages

```
/                           → Dashboard (all sites grid)
/sites                      → Sites list/grid
/sites/:id                  → Site detail (map + project timeline)
/sites/:id/compare          → Side-by-side comparison view
/sites/:id/timelapse        → Timelapse animation
/projects/:id               → Project detail (viewer — current page)
/projects/:id/gallery       → Image gallery for this project
/projects/:id/export        → Export center
/import                     → Import wizard (upload or FlytBase API)
/settings                   → Account, API keys, processing defaults
```

### Dashboard
Grid of site cards showing:
- Site name + location
- Latest orthomosaic thumbnail
- Last survey date
- Number of projects
- Quick actions: View, New Survey, Compare

### Site Detail
- Full-width map (latest orthomosaic)
- Timeline bar at bottom (all projects as dots on a timeline)
- Click any dot → loads that project's map
- Sidebar: site info, project list, annotations
- Toolbar: Compare, Timelapse, Measure, Export

### Gallery
- Grid of all source images for a project
- Metadata overlay: GPS, altitude, timestamp, camera settings
- Click to view full-res
- Map view: thumbnails plotted on their GPS positions
- Filter: by date, altitude, overlap status

---

## User Flows

### Flow 1: New Site from FlytBase API
```
1. User clicks "New Site"
2. Enters site name + location (or auto-detect from GPS)
3. Connects FlytBase API (API key + endpoint)
4. Selects mission/gallery from FlytBase
5. Images auto-download in background
6. Processing starts automatically
7. User sees real-time progress
8. Map appears when done
```

### Flow 2: Upload Images Manually
```
1. User clicks "New Project" on existing site
2. Drag-and-drop images (or folder)
3. System reads GPS EXIF → auto-assigns to site
4. Processing starts
5. Map appears when done
```

### Flow 3: Historical Comparison
```
1. User opens a site with 5+ surveys
2. Timeline bar shows all survey dates
3. User clicks "Compare"
4. Selects two dates
5. Side-by-side view with swipe slider
6. Change detection highlights differences
7. User annotates changes
```

### Flow 4: Automated Recurring Survey
```
1. User sets up a scheduled FlytBase mission
2. Mapper auto-ingests media after each flight
3. Processing runs automatically
4. New project added to timeline
5. Change detection runs vs previous survey
6. Alert sent if significant changes detected
```

---

## Technical Architecture

### Frontend
- **Framework**: React + TypeScript (align with FlytForce stack)
- **Styling**: Tailwind CSS + FlytBase Design System
- **Map Engine**: Leaflet (2D) + Three.js (3D) + Deck.gl (point clouds)
- **State**: Zustand or React Context
- **Build**: Vite

### Backend
- **API**: FastAPI (Python) — photogrammetry tools are Python-native
- **Auth**: FlytBase SSO / API key auth
- **Queue**: Redis + Celery (job management)
- **Storage**: S3-compatible (AWS S3, MinIO for on-prem)
- **Database**: PostgreSQL (Supabase for managed)
- **Processing**: OpenDroneMap via Docker
- **WebSocket**: For real-time processing updates

### Infrastructure
```
┌──────────────────────────────────────────────────┐
│                  mapper.flytbase.com               │
├──────────────────────────────────────────────────┤
│                                                    │
│  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
│  │ Cloudflare│  │ Vercel/  │  │ AWS ECS / GCP  │  │
│  │ DNS + CDN │  │ S3 Static│  │ Cloud Run      │  │
│  │           │  │ (Frontend)│  │ (API + Workers)│  │
│  └──────────┘  └──────────┘  └────────────────┘  │
│                                     │              │
│                    ┌────────────────┤              │
│                    ▼                ▼              │
│              ┌──────────┐   ┌──────────────┐      │
│              │ PostgreSQL│   │ S3 / MinIO   │      │
│              │ (metadata)│   │ (images +    │      │
│              │           │   │  outputs)    │      │
│              └──────────┘   └──────────────┘      │
│                                     │              │
│                              ┌──────────────┐      │
│                              │ ODM Workers  │      │
│                              │ (GPU spot    │      │
│                              │  instances)  │      │
│                              └──────────────┘      │
└──────────────────────────────────────────────────┘
```

### Processing Pipeline
```
Images arrive (upload or API fetch)
    │
    ▼
┌─────────────────┐
│ Pre-processing   │  Validate EXIF, check GPS, estimate overlap
│                  │  Auto-detect site from GPS coordinates
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ODM Processing   │  Docker container on GPU instance
│                  │  Config based on quality preset
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Post-processing  │  Generate thumbnails, tile orthomosaic
│                  │  Convert formats (COG, 3D Tiles)
│                  │  Run change detection vs previous survey
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Storage + Index  │  Upload to S3, update database
│                  │  Generate processing report
│                  │  Notify user (WebSocket + email)
└─────────────────┘
```

---

## Data Model

### sites
| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| name | VARCHAR | Site name |
| location | POINT | GPS center |
| boundary | GEOMETRY | GeoJSON polygon |
| thumbnail_url | VARCHAR | Latest ortho thumbnail |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |
| org_id | UUID | Organization |
| tags | JSONB | Metadata tags |
| status | ENUM | active, archived |

### projects
| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| site_id | UUID | FK to sites |
| name | VARCHAR | Project name |
| flight_id | VARCHAR | FlytBase mission ID |
| drone_model | VARCHAR | DJI Mavic 3D, etc. |
| captured_at | TIMESTAMP | When images were captured |
| image_count | INT | Number of source images |
| status | ENUM | uploading, processing, completed, failed |
| quality | ENUM | preview, medium, high |
| processing_time_s | INT | How long processing took |
| created_at | TIMESTAMP | |

### outputs
| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| project_id | UUID | FK to projects |
| type | ENUM | orthomosaic, mesh, pointcloud, dsm, dtm |
| format | VARCHAR | tif, obj, laz, jpg |
| storage_url | VARCHAR | S3 path |
| size_bytes | BIGINT | File size |
| metadata | JSONB | Resolution, dimensions, CRS, etc. |
| created_at | TIMESTAMP | |

### annotations
| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| site_id | UUID | FK to sites |
| project_id | UUID | Optional — specific to one survey |
| location | POINT | GPS position |
| type | ENUM | note, measurement, issue, marker |
| content | JSONB | Text, measurement data, etc. |
| created_by | UUID | User |
| created_at | TIMESTAMP | |

### jobs
| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| project_id | UUID | FK to projects |
| type | ENUM | import, process, export, change_detect |
| status | ENUM | queued, running, completed, failed |
| progress | INT | 0-100 |
| message | VARCHAR | Current stage description |
| started_at | TIMESTAMP | |
| completed_at | TIMESTAMP | |
| error | TEXT | Error message if failed |

---

## API Endpoints

### Sites
```
GET    /api/sites                    List all sites
POST   /api/sites                    Create site
GET    /api/sites/:id                Get site detail
PUT    /api/sites/:id                Update site
DELETE /api/sites/:id                Archive site
GET    /api/sites/:id/timeline       Get all projects as timeline
GET    /api/sites/:id/compare        Compare two project outputs
```

### Projects
```
GET    /api/projects                 List projects (filterable by site)
POST   /api/projects                 Create project
GET    /api/projects/:id             Get project detail
POST   /api/projects/:id/upload      Upload images
POST   /api/projects/:id/import      Import from FlytBase API
POST   /api/projects/:id/process     Start processing
GET    /api/projects/:id/gallery     Get image gallery
GET    /api/projects/:id/outputs     List outputs
```

### Outputs & Export
```
GET    /api/outputs/:id              Get output metadata
GET    /api/outputs/:id/download     Download file
GET    /api/projects/:id/export      Export all outputs as ZIP
GET    /api/export/formats           List available formats
```

### Jobs
```
GET    /api/jobs                     List jobs
GET    /api/jobs/:id                 Get job status
WS     /ws/jobs/:id                  WebSocket for real-time updates
```

---

## Milestones

### M1: Foundation (Current — Week 1)
- [x] COLMAP + ODM processing pipeline
- [x] 2D orthomosaic viewer (Leaflet)
- [x] 3D mesh viewer (Three.js)
- [x] Point cloud viewer
- [x] Export API (multi-format)
- [x] FlytBase design system UI
- [ ] Collapsible sidebar + gallery
- [ ] PRD complete

### M2: Sites & Projects (Week 2-3)
- [ ] Database schema (PostgreSQL/Supabase)
- [ ] Sites CRUD + dashboard grid
- [ ] Projects CRUD + upload flow
- [ ] FlytBase API integration (media fetch)
- [ ] Background processing with progress
- [ ] Gallery view (grid + map mode)

### M3: Historical Timeline (Week 4-5)
- [ ] Timeline bar component
- [ ] Side-by-side compare view
- [ ] Swipe slider for comparison
- [ ] Basic change detection (image diff)
- [ ] Annotations system

### M4: Production Deployment (Week 6)
- [ ] Dockerize everything
- [ ] Deploy to AWS/GCP
- [ ] mapper.flytbase.com DNS + SSL
- [ ] FlytBase SSO integration
- [ ] Monitoring + logging

### M5: Advanced Features (Week 7-8)
- [ ] Timelapse animation
- [ ] Measurement tools (distance, area, volume)
- [ ] AI change detection
- [ ] Automated survey ingestion
- [ ] PDF report generation
- [ ] Notifications (email + Slack)

---

## Competitive Positioning

| Feature | DroneDeploy | Pix4D | SiteScan | **FlytBase Mapper** |
|---|---|---|---|---|
| Flight Planning | Yes | No | Yes | **Yes (FlytBase native)** |
| Processing | Cloud only | Desktop + Cloud | Cloud | **Cloud + Self-hosted** |
| Orthomosaic | Yes | Yes | Yes | **Yes** |
| 3D Model | Yes | Yes | Yes | **Yes (textured)** |
| Point Cloud | Yes | Yes | Yes | **Yes** |
| DSM/DTM | Yes | Yes | Yes | **Yes** |
| Historical Compare | Basic | Basic | Via ArcGIS | **Native timeline + AI** |
| API Integration | Limited | Limited | Esri only | **FlytBase API native** |
| Self-hosted | No | Desktop only | No | **Yes (Docker)** |
| Pricing | $300+/mo | $300+/mo | Esri license | **Included with FlytBase** |

**Key differentiators:**
1. **Native FlytBase integration** — flight to map in one platform
2. **Self-hosted option** — air-gapped, on-prem for defense/energy
3. **Historical timeline** — Google Earth-style temporal navigation
4. **No per-image pricing** — unlimited processing
5. **Open-source core** — ODM-based, no vendor lock-in

---

## Success Metrics

| Metric | Target (M1-M3) | Target (M4-M5) |
|---|---|---|
| Processing success rate | >95% | >99% |
| Processing time (100 images) | <15 min (GPU) | <8 min |
| Orthomosaic quality | Comparable to Pix4D | Match or exceed |
| User activation | Internal testing | 10 enterprise pilots |
| Sites created | 5 test sites | 50+ across clients |
| Survey comparisons | Manual | Automated weekly |

---

*This is a living document. Update as the product evolves.*
