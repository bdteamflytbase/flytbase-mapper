# Mapper Dashboard — Complete UI Plan

> Tech Stack: React 18 + Vite, Tailwind CSS, Lucide React, dark theme (`#080d16` base)
> Reference: DroneDeploy (site cards), FlytBase Web (media gallery, sidebar)
> Design tokens: already in `apps/web/src/index.css`

---

## Page Map (7 pages + 4 modals)

```
/ ─────────────────────────── DashboardPage       (Sites Overview)
  /sites/:siteId ──────────── SitePage            (Projects in site)
    /sites/:siteId/projects/new ── (inline wizard, no separate route)
    /sites/:siteId/projects/:projectId ── ProjectPage  (Flights + Processing)
      /sites/:siteId/projects/:projectId/view ── ViewerPage (2D/3D/Elev)
/gallery ──────────────────── GalleryPage         (Media gallery)
/settings ─────────────────── SettingsPage        (Org config)

Modals (rendered in-place, no route change):
  • CreateProjectModal   (inside SitePage)
  • AssignMissionModal   (inside CreateProjectModal, step 2a)
  • GalleryPickerModal   (inside CreateProjectModal, step 2b)
  • ProcessingModal      (inside ProjectPage — already exists)
```

---

## 1. DashboardPage `/`

### Purpose
Landing page — shows all FlytBase sites assigned to the org, mirroring the DroneDeploy site grid.

### Layout
```
┌─────────────────────────────────────────────────────────────────┐
│ SIDEBAR (64px collapsed / 220px expanded)                       │
│  Logo  ·  Sites  ·  Gallery  ·  Settings                       │
├─────────────────────────────────────────────────────────────────┤
│ TOP BAR                                                         │
│  "My Sites"  [search input]  [grid/list toggle]  [sort: name▾] │
├─────────────────────────────────────────────────────────────────┤
│ STATS ROW (4 stat pills)                                        │
│  [Total Sites]  [Active Projects]  [Processing Jobs]  [Outputs] │
├─────────────────────────────────────────────────────────────────┤
│ SITE GRID  (3-col → 2-col → 1-col responsive)                  │
│  ┌──────────────────┐  ┌──────────────────┐  ...               │
│  │ thumbnail/map    │  │ thumbnail/map    │                     │
│  │ Site Name        │  │ Site Name        │                     │
│  │ 📍 Location      │  │ 📍 Location      │                     │
│  │ 3 projects · 2 flights today           │                     │
│  └──────────────────┘  └──────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

### Components
| Component | Description |
|-----------|-------------|
| `SiteCard` | Thumbnail (leaflet mini-map or static polygon preview), site name, location, project count badge, last flight date |
| `StatsBar` | 4 metric pills: total sites, active projects, queued jobs, outputs ready |
| `SearchBar` | Debounced filter input |
| `ViewToggle` | Grid ↔ List switch (icon buttons) |
| `SortDropdown` | Name A-Z / Last Modified / Most Projects |
| `EmptyState` | When no FlytBase API key configured — prompt to go to Settings |

### Data
- `GET /api/flytbase/sites` → `FBSite[]`
- `GET /api/projects?site_id=all` → project counts per site
- `GET /api/jobs?status=queued,processing` → active jobs count

---

## 2. SitePage `/sites/:siteId`

### Purpose
Shows all projects within a site + button to create a new project.

### Layout
```
┌─────────────────────────────────────────────────────────────────┐
│ BREADCRUMB: Sites > [Site Name]                                 │
│ SITE HEADER: name, 📍 location, [# missions] [# flights]       │
├─────────────────────────────────────────────────────────────────┤
│ ACTIONS ROW                                                     │
│  [search projects]              [+ New Project]  [⚙ filter]    │
├─────────────────────────────────────────────────────────────────┤
│ PROJECT GRID  (2-col)                                           │
│  ┌────────────────────────┐  ┌────────────────────────┐         │
│  │ [thumbnail or map]     │  │ [thumbnail or map]     │         │
│  │ ● Mission: Grid-A      │  │ ● Custom               │         │
│  │ Project Alpha          │  │ Survey May 12          │         │
│  │ Last processed: 2d ago │  │ No outputs yet         │         │
│  │ 4 outputs  3 flights   │  │ 2 flights              │         │
│  │ [Open] [⋯ more]        │  │ [Open] [⋯ more]        │         │
│  └────────────────────────┘  └────────────────────────┘         │
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐       │
│  │  + Create New Project                               │       │
│  │    (dashed card — always last in grid)              │       │
│  └──────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

### Components
| Component | Description |
|-----------|-------------|
| `ProjectCard` | Thumbnail, project name, type badge (Mission/Custom), last processed date, output count, flight count, Open + ellipsis menu |
| `CreateProjectCard` | Dashed border card at end of grid, click opens `CreateProjectModal` |
| `SiteHeader` | Site name, coordinates, stats (mission count, flight count) |
| `ProjectContextMenu` | Rename, Archive, Delete |

### Data
- `GET /api/projects?site_id=:siteId` → `Project[]`
- `GET /api/outputs?project_id=X` for thumbnails (first output thumbnail per project)

---

## 3. CreateProjectModal (inside SitePage)

### Purpose
2-step wizard launched by "New Project" or the dashed card.

### Step 1 — Name & Type
```
┌─────────────────────────────────────────────┐
│  Create New Project                    [✕]  │
│  ─────────────────────────────────────────  │
│  Project Name                               │
│  [________________________________]         │
│                                             │
│  Project Type                               │
│  ┌──────────────────┐  ┌──────────────────┐ │
│  │  🎯 Mission       │  │  📁 Custom        │ │
│  │  Link a grid     │  │  Pick from       │ │
│  │  mission from    │  │  media gallery   │ │
│  │  FlytBase        │  │                  │ │
│  └──────────────────┘  └──────────────────┘ │
│                                             │
│  [Cancel]                       [Next →]   │
└─────────────────────────────────────────────┘
```

### Step 2a — Mission Type: Assign Mission
```
┌─────────────────────────────────────────────┐
│  Assign Mission                        [✕]  │
│  ─────────────────────────────────────────  │
│  Select a Grid Mission from this site       │
│  [search missions...]                       │
│                                             │
│  ● Grid Mission Alpha    Last flight: 2d   │
│    400m × 300m  GSD: 2.1cm               [✓]│
│  ○ Grid Mission Beta     Last flight: 1w   │
│    600m × 450m  GSD: 3.0cm                  │
│  ○ Grid Mission Gamma    No flights yet     │
│                                             │
│  [← Back]                   [Create Project]│
└─────────────────────────────────────────────┘
```

### Step 2b — Custom Type: Opens GalleryPickerModal
(see Section 7 — GalleryPickerModal)

---

## 4. ProjectPage `/sites/:siteId/projects/:projectId`

### Purpose
Core workspace — shows flights linked to the project, processed outputs, and processing controls.

### Layout (Mission project)
```
┌─────────────────────────────────────────────────────────────────┐
│ BREADCRUMB: Sites > [Site] > [Project Name]      [⋯] [🗑 Archive]│
│ PROJECT HEADER: name, mission badge, last processed date        │
├──────────────────────────────┬──────────────────────────────────┤
│ LEFT PANEL (360px)           │ RIGHT PANEL (flex-1)             │
│ ─────────────────────────── │ ─────────────────────────────── │
│ FLIGHTS                      │ PROCESSED OUTPUTS               │
│                              │                                  │
│ [Mission: Grid-A ▾]         │ ┌──────────────────────────────┐ │
│ ─ 2024-05-15 ─────────────  │ │ 📸 Orthomosaic  · May 15    │ │
│   ✓ Flight #1  200 imgs      │ │ [2D View] [Download]         │ │
│   ✓ Flight #2  180 imgs      │ └──────────────────────────────┘ │
│ ─ 2024-05-08 ─────────────  │ ┌──────────────────────────────┐ │
│   ✓ Flight #3  220 imgs      │ │ 🧊 3D Mesh     · May 15     │ │
│ ─ 2024-04-30 ─────────────  │ │ [3D View] [Download]         │ │
│   Flight #4  195 imgs        │ └──────────────────────────────┘ │
│                              │                                  │
│ ─ NEW FLIGHTS ─────────────  │ ┌──────────────────────────────┐ │
│   Flight #5  210 imgs  🆕    │ │ 📊 Elevation   · May 15     │ │
│   Flight #6  198 imgs  🆕    │ │ [Elev View] [Download]       │ │
│                              │ └──────────────────────────────┘ │
│ [Send for Processing ▶]      │                                  │
│  (appears when new flights   │ [+ Process New Flights →]       │
│   are selected)              │  (same CTA, alternative spot)   │
└──────────────────────────────┴──────────────────────────────────┘
```

### Layout (Custom project)
```
┌─────────────────────────────────────────────────────────────────┐
│ PROJECT HEADER: name, "Custom" badge                            │
├──────────────────────────────┬──────────────────────────────────┤
│ LEFT PANEL                   │ RIGHT PANEL (same as above)     │
│                              │                                  │
│ MEDIA SETS                   │                                  │
│  (grouped by date added      │                                  │
│   from gallery)              │                                  │
│                              │                                  │
│ ─ Added May 15 ──────────    │                                  │
│   82 images selected         │                                  │
│   from Gallery               │                                  │
│   [View selection]           │                                  │
│                              │                                  │
│ [+ Add from Gallery]         │                                  │
└──────────────────────────────┴──────────────────────────────────┘
```

### Components
| Component | Description |
|-----------|-------------|
| `FlightAccordion` | Date-grouped collapsible list of flights (existing `DateAccordion` extended) |
| `FlightRow` | Checkbox, flight ID, image count, capture time, status badge |
| `NewFlightBadge` | "New" pill for unprocessed flights |
| `OutputCard` | Output type icon + type name + date + action buttons |
| `ProcessCTA` | "Send for Processing" floating button (appears on flight selection) |
| `ProcessingModal` | Existing component — quality & output type selection |
| `JobProgressBar` | Existing component — shows active job progress |

### Data
- `GET /api/projects/:id` → `Project`
- `GET /api/projects/:id/flights` → `DateGroup[]`
- `GET /api/projects/:id/outputs` → `Output[]`
- `GET /api/jobs?project_id=:id` → `Job[]`
- `POST /api/projects/:id/process` → submit job

---

## 5. ViewerPage `/sites/:siteId/projects/:projectId/view`

### Purpose
2D/3D/Elevation visualization of processed outputs. (Already exists — enhance only.)

### Enhancements
```
┌─────────────────────────────────────────────────────────────────┐
│ VIEWER HEADER                                                   │
│  ← Back to Project   [2D Map] [3D Mesh] [Elevation]  [Export ▾]│
├────────────────────────────────────┬────────────────────────────┤
│ MAP / VIEWER (full height)         │ LAYERS PANEL (280px)       │
│                                    │ ─────────────────────────  │
│  (Leaflet / Three.js / DSM)        │ OUTPUTS                    │
│                                    │ ● Orthomosaic  May 15  👁  │
│                                    │ ○ DSM          May 15  👁  │
│                                    │ ○ DTM          May 15  👁  │
│                                    │                            │
│                                    │ INFO                       │
│                                    │ Area: 2.4 ha               │
│                                    │ GSD: 2.1 cm/px             │
│                                    │ Points: 14.2M              │
│                                    │ Bounds: 18.5°N, 73.8°E     │
│                                    │                            │
│                                    │ [Download All ▾]           │
└────────────────────────────────────┴────────────────────────────┘
```

---

## 6. GalleryPage `/gallery`

### Purpose
Standalone FlytBase media gallery — browse all drone images across all sites, apply filters, and send selections for processing.

### Layout
```
┌─────────────────────────────────────────────────────────────────┐
│ PAGE HEADER: "Media Gallery"   [Select Mode]  [Upload ▾]       │
├─────────────────┬───────────────────────────────────────────────┤
│ FILTER SIDEBAR  │ GALLERY AREA                                  │
│ (240px)         │                                               │
│ ─────────────── │  TOOLBAR                                      │
│ SITE            │  [search...]  [Sort: Date ▾]  [Grid ▾] [🔽]  │
│ ○ All Sites     │  Selected: 42 images  [Clear] [Send →]        │
│ ● Site Alpha    │  ────────────────────────────────────────     │
│ ○ Site Beta     │  GROUP: May 15, 2024 · Flight #5 · 210 imgs  │
│                 │  ┌───┐┌───┐┌───┐┌───┐┌───┐┌───┐┌───┐┌───┐   │
│ MISSION         │  │img││img││img││img││img││img││img││img│   │
│ ○ All           │  └───┘└───┘└───┘└───┘└───┘└───┘└───┘└───┘   │
│ ● Grid-A        │                                               │
│ ○ Grid-B        │  GROUP: May 8, 2024 · Flight #3 · 220 imgs   │
│                 │  ┌───┐┌───┐┌───┐  ...                        │
│ DATE RANGE      │                                               │
│ From: [──────]  │                                               │
│ To:   [──────]  │                                               │
│                 │                                               │
│ FILE TYPE       │                                               │
│ ☑ JPEG          │                                               │
│ ☑ DNG (RAW)     │                                               │
│ ☑ MP4           │                                               │
│                 │                                               │
│ [Apply Filters] │                                               │
│ [Reset]         │                                               │
└─────────────────┴───────────────────────────────────────────────┘
```

### Components
| Component | Description |
|-----------|-------------|
| `FilterSidebar` | Site, mission, date range, file type filters |
| `GalleryGrid` | Virtualized image grid (react-window or CSS grid) |
| `ImageThumbnail` | Thumbnail + checkbox overlay on hover/select mode, GPS dot overlay |
| `FlightGroupHeader` | Date + flight name + image count + "Select All" toggle |
| `GalleryToolbar` | Search, sort dropdown, grid/list view, selection count, Send CTA |
| `SelectionBar` | Sticky bottom bar showing selection count + "Send for Processing" |
| `SendToProjectModal` | Choose which project to attach selected images to |

### Data
- `GET /api/flytbase/sites` + `GET /api/flytbase/missions` → filter options
- `POST /api/flytbase/media/search` with filter params → `FBMediaFile[]`
- Pagination: infinite scroll or page-based

---

## 7. GalleryPickerModal (inside CreateProjectModal step 2b)

### Purpose
Embedded gallery inside the project creation wizard — same UI as GalleryPage but modal-sized.

### Layout
```
┌────────────────────────────────────────────────────────┐
│  Select Media for Project              [✕]             │
│  ──────────────────────────────────────────────────    │
│  [Site ▾] [Mission ▾] [From──] [To──] [Type ▾]  [↺]  │
│  ──────────────────────────────────────────────────    │
│  ┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐    │
│  │img ││img ││img ││img ││img ││img ││img ││img │    │
│  └────┘└────┘└────┘└────┘└────┘└────┘└────┘└────┘    │
│  ┌────┐┌────┐┌────┐┌────┐  ...                        │
│  └────┘└────┘└────┘└────┘                             │
│                                                        │
│  ──────────────────────────────────────────────────    │
│  42 images selected   [← Back]   [Create Project →]   │
└────────────────────────────────────────────────────────┘
```

---

## 8. SettingsPage `/settings`

### Purpose
Org-level configuration: FlytBase API key, org ID, storage settings. (Exists as OrgSetup — rebuild with tabs.)

### Layout
```
┌─────────────────────────────────────────────────────────────────┐
│ Settings                                                        │
├─────────────────────────────────────────────────────────────────┤
│ [FlytBase API]  [Storage]  [Processing]  [Team]                │
├─────────────────────────────────────────────────────────────────┤
│ TAB: FlytBase API                                               │
│                                                                 │
│ Org ID                    [____________________________]        │
│ API Key                   [____________________________] [👁]   │
│ API Base URL              [____________________________]        │
│                                                                 │
│ Connection Status:  ● Connected  (last verified 2m ago)        │
│                                                                 │
│ [Test Connection]                         [Save Changes]        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Sidebar Navigation (Global Layout)

```
┌──────────────────┐
│  🗺 MAPPER        │  ← logo + wordmark
│  ────────────     │
│  🏢 Sites        │  → /
│  🖼 Gallery      │  → /gallery
│  ⚙ Settings     │  → /settings
│                   │
│  ─── BOTTOM ───   │
│  👤 Org: Acme    │  org name / avatar
│  [Collapse ◀]    │
└──────────────────┘
```

- **Collapsed state**: 64px wide, icons only with tooltips
- **Expanded state**: 220px wide, icons + labels
- **Active route**: left border accent `--fb-primary` + bg highlight

---

## New Routes to Add

| Route | Page | Status |
|-------|------|--------|
| `/` | DashboardPage | Needs redesign (site cards) |
| `/sites/:siteId` | SitePage | Needs redesign (project cards + create) |
| `/sites/:siteId/projects/:projectId` | ProjectPage | Needs redesign (split panel) |
| `/sites/:siteId/projects/:projectId/view` | ViewerPage | Exists — enhance |
| `/gallery` | GalleryPage | **New page** |
| `/settings` | SettingsPage | Exists — tabbed rebuild |

---

## Component Inventory (New/Modified)

### New Components
```
src/components/
├── sites/
│   ├── SiteCard.tsx           # DroneDeploy-style site card
│   └── SiteHeader.tsx
├── projects/
│   ├── ProjectCard.tsx        # Project card with thumbnail + meta
│   ├── CreateProjectCard.tsx  # Dashed "+" card
│   └── OutputCard.tsx         # Output type + actions
├── modals/
│   ├── CreateProjectModal.tsx # 2-step wizard
│   ├── AssignMissionModal.tsx # Mission selection list
│   └── GalleryPickerModal.tsx # Embedded gallery picker
├── gallery/
│   ├── GalleryGrid.tsx        # Virtualized image grid
│   ├── ImageThumbnail.tsx     # Single image tile with checkbox
│   ├── FlightGroupHeader.tsx  # Date/flight group header
│   ├── FilterSidebar.tsx      # Left filter panel
│   ├── GalleryToolbar.tsx     # Sort, search, view toggle
│   └── SelectionBar.tsx       # Sticky bottom send bar
└── common/
    ├── Breadcrumb.tsx
    ├── StatsBar.tsx
    └── TabBar.tsx
```

### Modified Components
- `Layout.tsx` — add Gallery nav item, collapse behavior
- `DashboardPage.tsx` — full rebuild as site cards
- `SitePage.tsx` — full rebuild as project grid
- `ProjectPage.tsx` — split-panel layout
- `ViewerPage.tsx` — add layers panel
- `SettingsPage.tsx` — tabbed layout

---

## Design Tokens to Add

```css
/* in index.css */
--fb-card-hover: #151f2e;
--fb-badge-mission: rgba(44, 123, 242, 0.15);
--fb-badge-custom: rgba(255, 171, 73, 0.15);
--fb-dashed-border: rgba(255, 255, 255, 0.15);
--fb-sidebar-width: 220px;
--fb-sidebar-width-collapsed: 64px;
--fb-panel-width: 360px;
```

---

## Stitch Prompt

> Copy-paste this entire block into Stitch to generate the UI screens.

---

```
Design a dark-themed drone mapping platform dashboard called "Mapper" using these exact specs:

DESIGN SYSTEM:
- Background: #080d16 (dark navy)
- Surface cards: #111827
- Card hover: #151f2e
- Primary accent: #2C7BF2 (blue)
- Secondary accent: #FFAB49 (orange)
- Text primary: #F0F0F0
- Text secondary: #8B95A5
- Borders: rgba(255,255,255,0.06)
- Border radius: 8px (cards), 12px (modals)
- Font: DM Sans
- Icons: Lucide style (outline, 18-20px)

SIDEBAR (left, 220px wide, collapsible to 64px):
- Logo: map icon + "Mapper" wordmark in #2C7BF2
- Nav items: Sites (map-pin icon), Gallery (images icon), Settings (gear icon)
- Active state: 3px left border in #2C7BF2, background #151f2e
- Bottom: org name + avatar chip
- Collapse toggle button at bottom

SCREEN 1 — SITES OVERVIEW (Dashboard):
- Top bar: "My Sites" heading, search input, grid/list toggle, sort dropdown
- Stats row: 4 pills showing "12 Sites", "8 Active Projects", "2 Processing", "24 Outputs" with subtle icon
- 3-column card grid:
  Each card:
  - Top half: dark map preview area with subtle grid lines and a polygon outline in #2C7BF2
  - Bottom half: Site name (16px bold), location pin + "Maharashtra, India" (12px #8B95A5)
  - Footer: "3 projects" badge + "Last flight 2d ago" text
  - Hover state: card border becomes #2C7BF2, slight scale 1.02

SCREEN 2 — SITE PAGE (Projects inside a site):
- Breadcrumb: Sites > Site Alpha (with back arrow)
- Site header: large site name, location, "4 missions · 18 flights" meta badges
- Action row: search input (left), "+ New Project" button (right, #2C7BF2 filled)
- 2-column project grid:
  Each card:
  - Thumbnail area (top, 160px): map preview or output thumbnail
  - Project type badge: blue pill "Mission" or orange pill "Custom"
  - Project name (15px bold white)
  - "Last processed: 2 days ago" in #8B95A5
  - Footer: "4 outputs" + "6 flights" with icon badges
  - Two buttons: "Open" (primary small) + "⋯" (icon)
- Last card in grid: dashed border card with "+ Create New Project" centered

SCREEN 3 — CREATE PROJECT MODAL (Step 1):
- Modal: 480px wide, 12px radius, surface background
- Header: "Create New Project" + X close
- "Project Name" label + text input (full width)
- "Project Type" label + two option cards side by side:
  Left card: target icon, "Mission Project", "Auto-links new flights from a grid mission" — selected state has #2C7BF2 border
  Right card: folder icon, "Custom Project", "Manually select images from gallery" — orange accent
- Cancel + Next buttons at bottom

SCREEN 4 — ASSIGN MISSION MODAL (Step 2a):
- "Assign Mission" header
- Search missions input
- Scrollable list of mission rows:
  Each row: radio button + mission name (bold) + dimensions text + "Last flight: Xd ago" right-aligned
  Selected row: subtle blue background highlight
- Back + "Create Project" buttons

SCREEN 5 — PROJECT PAGE (split panel, mission type):
- Left panel (360px, border-right):
  - "Flights" heading + mission selector dropdown
  - Date accordion sections:
    Each section: date header (divider line + date label + chevron)
    Each flight row: checkbox + "Flight #N" + "200 imgs" badge + timestamp
    "New" flights have a small #FFAB49 "NEW" pill badge
  - Sticky bottom: "Send for Processing" #2C7BF2 button (appears only when flights selected)
- Right panel (flex):
  - "Processed Outputs" heading
  - Output cards stacked vertically:
    Each card: output type icon (colored) + type name + date + "[2D View]" or "[3D View]" + Download icon
    Types: Orthomosaic (blue map icon), 3D Mesh (orange cube), Elevation DSM (green mountain), Point Cloud (purple dots)
  - Active job card: progress bar with stage label and % inside output list

SCREEN 6 — GALLERY PAGE (media gallery):
- Left filter sidebar (240px):
  - "Filters" heading + Reset link
  - "Site" section: radio list of sites
  - "Mission" section: radio list
  - "Date Range" section: from/to date inputs
  - "File Type" section: checkboxes for JPEG, DNG, MP4
  - "Apply Filters" #2C7BF2 button
- Right content area:
  - Toolbar: search, Sort dropdown, Grid/List toggle, selection count "42 selected"
  - Sticky "Send for Processing →" bar (shows when items selected, orange/blue CTA)
  - Image grid (7 columns):
    - Flight group header: bold date + "Flight #5 · 210 images" + "Select All" link
    - Image thumbnails: square, on hover show checkbox overlay + GPS coordinates overlay
    - Selected state: checkbox filled + #2C7BF2 border ring
  - Infinite scroll / load more

SCREEN 7 — GALLERY PICKER MODAL (inside create project):
- Full-width modal (800px), same gallery UI but compact
- Filter chips row at top (horizontal, not sidebar)
- 8-column thumbnail grid
- Selected count bottom bar with "Back" and "Create Project →" buttons

SCREEN 8 — VIEWER PAGE (2D map with layers panel):
- Full height layout
- Header: back button, project name, tab switcher [2D Map | 3D Mesh | Elevation], Export dropdown
- Left: full map (Leaflet style, dark tiles, polygon overlay in blue)
- Right panel (280px):
  - "Layers" section: toggle rows for each output (eye icon toggle)
  - "Metadata" section: Area, GSD, Point Count, Bounds values in key-value rows
  - "Download" section: list of downloadable outputs with file size

Make all screens pixel-perfect with consistent spacing (4px base grid), hover states, focus rings on inputs in #2C7BF2, and smooth 200ms transitions. Use subtle card shadows: 0 1px 3px rgba(0,0,0,0.4). Do not use any bright backgrounds — keep everything in the dark navy palette.
```

---

## Implementation Order

1. **Sidebar + Layout** — update nav, add Gallery route, collapse behavior
2. **DashboardPage** — rebuild as SiteCard grid
3. **SitePage** — rebuild as ProjectCard grid + CreateProjectCard
4. **CreateProjectModal** — 2-step wizard with Mission/Custom split
5. **AssignMissionModal** — mission list from FlytBase API
6. **ProjectPage** — split panel with FlightAccordion + OutputCards
7. **GalleryPage** — new page with filter sidebar + virtualized grid
8. **GalleryPickerModal** — reuse GalleryPage components in modal
9. **ViewerPage** — add layers panel (existing viewer components intact)
10. **SettingsPage** — tabbed rebuild
