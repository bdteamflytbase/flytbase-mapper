# Mapper Dashboard — UI Plan V2 (FlytBase-Native)
> Based on: Stitch screen analysis + FlytBase reference (dashboard.html + index.html)
> Design system: EXACTLY matches FlytBase (DM Sans + JetBrains Mono, #080d16 base, #3b8df5 primary)

---

## STITCH SCREEN CRITIQUE — What's Wrong

### Screen 1 — Site Dashboard
| Issue | Fix |
|-------|-----|
| Top nav has "PROJECTS" and "MISSION CONTROL" tabs | Remove — this is a site-level nav, not needed |
| "+ NEW PROJECT" button in topbar | Remove — projects are created inside a site, not from dashboard |
| 4 stats: Total Sites, Active Projects, Processing, Data Outputs | Remove "Data Outputs" — user wants ONLY 3 stats |
| "Create New Site" dashed card in grid | Remove entirely — sites come from FlytBase API, user can't create sites |
| "PROJECT DIRECTORY" section label | Change to "My Sites" or just the grid directly |
| Card status badges styling doesn't match FlytBase | Use FlytBase token colors exactly |
| Too military/game-like aesthetic | FlytBase is professional/clean, not tactical/dark-ops |

### Screen 2 — Site Page
| Issue | Fix |
|-------|-----|
| "SYSTEM STATUS: TACTICAL OPTIMAL" widget at bottom-right | Remove completely — doesn't belong |
| Only card grid — no list view | User said "list of project" — default to list layout |
| No quick "Send for Processing" action on cards | Add quick action to each project card |
| "Create New Project" modal card feels like a placeholder | Make it a proper "+ New Project" button in the header action row |

### Screen 3 — Project Page
| Issue | Fix |
|-------|-----|
| Flights listed as simple items | Flights should be DATE FOLDERS — grouped by date, collapsible |
| No visual difference between processed and unprocessed flights | Processed folder: green "PROCESSED" tag; unprocessed: no tag / "NEW" orange pill |
| Clicking any flight does the same thing | Processed flight → opens viewer; Unprocessed flight → opens gallery media selector |
| Left panel mission dropdown label unclear | Show mission name prominently at top |
| No way to discard/exclude images before processing | Gallery view for unprocessed flights must show image grid with deselect ability |

### Screen 5 — Assign Mission
| Issue | Fix |
|-------|-----|
| Shows ALL org missions regardless of site | Filter to only missions belonging to the CURRENT SITE |
| Mission metadata (300m × 200m etc.) is generic | Show actual mission data: last flight date, image count, grid dimensions |

### Screen 6 — Gallery
| Issue | Fix |
|-------|-----|
| Overall structure is correct | Needs FlytBase font/color tokens |
| "ALL MEDIA ASSETS" label in topbar | When used as picker for custom project, title should be "Select Media" |
| Bottom CTA says "READY FOR POINT CLOUD EXTRACTION" | Just say "X images selected — Send for Processing" |

### Screen 7 — Viewer
| Issue | Fix |
|-------|-----|
| Actually the best screen — closest to FlytBase | Minor: point cloud count formatting, download section needs file sizes |

---

## Correct Page Architecture (5 Pages + 2 Modals)

```
/                               → SiteDashboard
/sites/:siteId                  → SitePage
/sites/:siteId/projects/:id     → ProjectPage  (mission OR custom — same route, different view)
/sites/:siteId/projects/:id/view → ViewerPage
/settings                       → SettingsPage

Modals (no route change):
  CreateProjectModal  (opens from SitePage)
  └─ Step 1: Name + Type choice (Mission / Custom)
  └─ Step 2a [Mission]: AssignMissionStep (mission list for this site)
  └─ Step 2b [Custom]: GalleryPickerStep (media gallery embedded in modal)
```

---

## FlytBase Design Tokens (EXACT — from reference files)

```css
:root {
  /* Backgrounds — tonal layering, NO harsh blacks */
  --fb-bg:               #080d16;          /* page background */
  --fb-surface:          rgba(16,22,36,0.85); /* panels, cards */
  --fb-surface-solid:    #111827;          /* modal backgrounds */
  --fb-surface-hover:    rgba(30,42,65,0.6);
  --fb-surface-active:   #1e2d44;

  /* Borders — "Ghost Border" rule, never solid lines for sections */
  --fb-border:           rgba(255,255,255,0.07);
  --fb-border-active:    rgba(44,123,242,0.5);

  /* Brand colors */
  --fb-primary:          #3b8df5;          /* blue — actions, links, active states */
  --fb-primary-hover:    #2570d4;
  --fb-primary-subtle:   rgba(59,141,245,0.1);
  --fb-accent:           #f59e0b;          /* orange — custom project, warnings */
  --fb-accent-deep:      #d97706;

  /* Text */
  --fb-text:             #eef1f6;          /* primary text */
  --fb-text-secondary:   #8899af;          /* labels, meta */
  --fb-text-tertiary:    #4a5568;          /* hints, placeholders */

  /* Status */
  --fb-success:          #34d399;          /* processed/active — used SPARINGLY */
  --fb-destructive:      #f87171;

  /* Radii */
  --fb-radius:           10px;
  --fb-radius-lg:        14px;
  --fb-radius-xl:        18px;

  /* Typography */
  --fb-font:    'DM Sans', -apple-system, sans-serif;
  --fb-mono:    'JetBrains Mono', 'SF Mono', monospace;  /* coordinates, file sizes, GSD */

  /* Motion */
  --fb-transition: 220ms cubic-bezier(0.16, 1, 0.3, 1);

  /* Shadows — ambient only, no hard shadows */
  --fb-shadow:    0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.05);
  --fb-shadow-lg: 0 8px 32px rgba(0,0,0,0.1);

  /* Signature gradients */
  --grad-teal:   linear-gradient(135deg, #11998e, #38ef7d);
  --grad-blue:   linear-gradient(135deg, #1e83ec, #00cdff);
  --grad-orange: linear-gradient(135deg, #ffc837, #ff6a08);
  --grad-mixed:  linear-gradient(135deg, #11998e 0%, #1e83ec 50%, #2C7BF2 100%);
}
```

### Global Body Effects (apply to every page)
```css
/* Subtle dot grid — technical feel */
body::before {
  background-image: radial-gradient(circle, rgba(59,141,245,0.035) 1px, transparent 1px);
  background-size: 28px 28px;
}
/* Film grain — depth and premium feel */
body::after {
  opacity: 0.035;
  background: SVG fractalNoise filter;
  background-size: 200px;
}
```

### Topbar Signature (applies to EVERY page)
```css
/* Rainbow gradient underline — FlytBase brand mark */
.topbar::after {
  background: linear-gradient(90deg, #11998e, #1e83ec, #3b8df5, #f59e0b);
  opacity: 0.6;
  height: 1px;
  bottom: -1px;
}
```

---

## Page 1 — Site Dashboard `/`

### What It Shows
- 3 stat cards only: **Total Sites** | **Active Projects** | **Currently Processing**
- Site cards grid — one card per FlytBase site assigned to this org
- NO "Create New Site" — sites come from FlytBase

### Layout Anatomy
```
┌─────────────────────────────────────────────────────────────────────┐
│ TOPBAR (56px, sticky, blur backdrop)                               │
│  [FlytBase Logo SVG] [MAPPER badge]    [search] [🔔] [user avatar] │
│  ─────────────────────────────────────────────────── gradient line │
├──────┬──────────────────────────────────────────────────────────────┤
│ SIDE │ CONTENT AREA                                                │
│ BAR  │                                                              │
│      │  Sites                                    [grid▾] [sort▾]  │
│  🗺  │  ─────────────────────────────────────────────────────────  │
│  Sites│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│      │  │ 12          │ │ 8 Active    │ │ 2           │          │
│  ⚙  │  │ Total Sites │ │ Projects    │ │ Processing  │          │
│  Settings│ └─────────────┘ └─────────────┘ └─────────────┘         │
│      │  ─────────────────────────────────────────────────────────  │
│      │  SITE CARDS GRID (3 col → 2 col → 1 col)                   │
│      │  ┌───────────────────┐  ┌───────────────────┐              │
│      │  │ [aerial map img]  │  │ [aerial map img]  │              │
│      │  │ ● ACTIVE          │  │ ◌ PROCESSING      │              │
│      │  │ Pune Solar Array  │  │ Mumbai Hub        │              │
│      │  │ Maharashtra, India│  │ Maharashtra, India│              │
│      │  │ ──────────────────│  │ ──────────────────│              │
│      │  │ 3 projects  2d ago│  │ 8 projects  4h ago│              │
│      │  └───────────────────┘  └───────────────────┘              │
└──────┴──────────────────────────────────────────────────────────────┘
```

### Stat Card Design
```
Background: var(--fb-surface-solid)
Border: 1px solid var(--fb-border)
Border-radius: var(--fb-radius-lg)
Padding: 20px 24px

Layout:
  [left: icon in primary-subtle circle 40px]
  [right: number (28px bold, colored) + label (11px, tertiary, uppercase)]

Colors:
  Total Sites    → number in var(--fb-text), icon in --fb-primary
  Active Projects → number in var(--fb-primary), icon in --fb-primary
  Processing     → number in var(--fb-accent), icon in --fb-accent (pulse animation)
```

### Site Card Design
```
Size: minmax(320px, 1fr) in auto-fill grid
Background: var(--fb-surface)
Border: 1px solid var(--fb-border)
Border-radius: var(--fb-radius-lg)
Overflow: hidden

THUMBNAIL (180px height):
  - Aerial drone imagery OR a dark placeholder with site polygon outline
  - Gradient overlay: linear-gradient(to bottom, transparent 50%, rgba(8,13,22,0.8) 100%)
  - STATUS BADGE (top-left, 8px from corner):
    · ACTIVE: background rgba(52,211,153,0.15), text #34d399, dot pulses green
    · PROCESSING: background rgba(245,158,11,0.15), text #f59e0b, dot pulses orange
    · IDLE: omit badge entirely

BODY (padding: 16px):
  - Site name: 15px, weight 600, --fb-text
  - Location: 12px, --fb-text-secondary, map-pin icon (14px) + "Maharashtra, India"

FOOTER (padding: 10px 16px, border-top 1px solid --fb-border):
  - Left: "N projects" with folder icon (12px, --fb-text-tertiary)
  - Right: "Last flight Xd ago" (12px, --fb-text-tertiary)

HOVER STATE:
  border-color: var(--fb-border-active)
  transform: translateY(-2px)
  box-shadow: 0 8px 32px rgba(59,141,245,0.08)
  transition: var(--fb-transition)
```

### Sidebar Design (Collapsible, matches index.html exactly)
```
Width: 260px (expanded) → 56px (collapsed)
Background: rgba(8,13,22,0.92), backdrop-filter: blur(20px)
Border-right: 1px solid var(--fb-border)

HEADER (padding: 20px 20px 16px):
  - FlytBase logo SVG (22px height)
  - "MAPPER" badge: font-size 10px, --fb-primary color, --fb-primary-subtle bg, uppercase

NAV ITEMS (two only):
  1. Sites (map-pin icon) — active on /
  2. Settings (gear icon) — active on /settings

Nav item styling:
  padding: 9px 12px
  border-radius: 8px
  margin: 2px 8px
  font-size: 13px, font-weight 500

  Default: color --fb-text-secondary, background transparent
  Hover: background --fb-surface-hover, color --fb-text
  Active: background --fb-primary-subtle, color --fb-primary,
          left border: 2px solid --fb-primary (inside the 8px margin)

BOTTOM:
  - Collapse toggle button: 24px circle, fixed positioned at sidebar edge
  - User avatar chip: 32px circle, org name label (hidden when collapsed)
```

---

## Page 2 — Site Detail `/sites/:siteId`

### What It Shows
- Site name + coordinates + mission/flight counts
- Project LIST (default list view, not cards) + card view toggle
- Breadcrumb: Sites > [Site Name]
- "+ New Project" button in header

### Layout Anatomy
```
┌─────────────────────────────────────────────────────────────────────┐
│ TOPBAR                                                              │
├──────┬──────────────────────────────────────────────────────────────┤
│ SIDE │                                                              │
│ BAR  │  ← Sites   /   Pune Solar Array Site                        │
│      │  ─────────────────────────────────────────────────────────  │
│      │  Pune Solar Array Site                                       │
│      │  18.5204°N, 73.8567°E  ·  4 Missions  ·  18 Flights        │
│      │  ─────────────────────────────────────────────────────────  │
│      │  Projects                              [+ New Project]      │
│      │  [search...]                           [⊞] [☰] [filter▾]   │
│      │  ─────────────────────────────────────────────────────────  │
│      │                                                              │
│      │  LIST VIEW (default):                                        │
│      │  ┌──────────────────────────────────────────────────────┐   │
│      │  │ [thumb 64px] MISSION  Infrastructure Scan North      │   │
│      │  │              Last processed Oct 12, 2023             │   │
│      │  │              12 outputs  ·  5 flights  ·  3 new      │   │
│      │  │              [Open →]  [▶ Process (3 new)]  [⋯]      │   │
│      │  ├──────────────────────────────────────────────────────┤   │
│      │  │ [thumb 64px] CUSTOM   Volumetric Analysis Storage B  │   │
│      │  │              Last processed Sep 28, 2023             │   │
│      │  │              4 outputs  ·  1 flight                  │   │
│      │  │              [Open →]  [⋯]                           │   │
│      │  ├──────────────────────────────────────────────────────┤   │
│      │  │ [thumb 64px] MISSION  Topographic Map Valley Phase 1 │   │
│      │  └──────────────────────────────────────────────────────┘   │
└──────┴──────────────────────────────────────────────────────────────┘
```

### Project List Row Design
```
Background: var(--fb-surface)
Border: 1px solid var(--fb-border)
Border-radius: var(--fb-radius)
Padding: 14px 16px
Margin-bottom: 4px (tight list, NOT cards)

LEFT: Thumbnail 64×64px, border-radius 8px, object-fit cover
      If no output yet: dark placeholder with output-type icon

MIDDLE (flex-1):
  Row 1: [TYPE BADGE] · [Project Name 15px bold] · [date monospace 11px right-align]
  Row 2: [N outputs icon] [N flights icon] [N new pill in orange if unprocessed]
  Row 3: [Last processed: date] in --fb-text-secondary 12px

TYPE BADGE:
  MISSION: background rgba(59,141,245,0.12), text #3b8df5, text "MISSION", 10px uppercase
  CUSTOM:  background rgba(245,158,11,0.12), text #f59e0b, text "CUSTOM", 10px uppercase

RIGHT (actions, visible on hover):
  [Open →] button — ghost style, primary color on hover
  [▶ Process (N new)] button — only if mission project has unprocessed flights
                               primary filled, small, shows count of new flights
  [⋯] icon button — context menu: Rename, Archive, Delete

HOVER STATE:
  background: --fb-surface-hover
  border-color: rgba(255,255,255,0.12)
```

### Card View (toggle from list)
```
2-column grid, same card design as Stitch screen 2 but:
  - Remove "SYSTEM STATUS" widget entirely
  - Quick action buttons visible on hover
  - "Create New Project" is a BUTTON in header, not a card
```

---

## Page 3 — Project Page `/sites/:siteId/projects/:projectId`

### Split Panel Layout (MISSION project)
```
┌─────────────────────────────────────────────────────────────────────┐
│ TOPBAR: [← Site Alpha] / [Project Name]       [⋯] [🗑]            │
├──────┬──────────────────────────┬────────────────────────────────────┤
│ SIDE │ LEFT PANEL (320px)       │ RIGHT PANEL (flex-1)              │
│ BAR  │ bg: rgba(8,13,22,0.5)    │ bg: transparent (shows dot grid)  │
│      │ border-right: --fb-border│                                    │
│      │                          │                                    │
│      │ [MISSION: Grid-Alpha ▾]  │ Processed Outputs                 │
│      │ ─────────────────────    │ ─────────────────────────────────  │
│      │                          │                                    │
│      │ FLIGHTS                  │  ┌─────────────────────────────┐  │
│      │                          │  │ 🗺 Orthomosaic (2D Map)     │  │
│      │ ▼ Oct 26, 2023    [+3]  │  │    Oct 26, 2023 · 2.1cm GSD │  │
│      │   📁 Flight #12   NEW   │  │    [2D VIEW]  [↓ 12.5 GB]   │  │
│      │      210 imgs · 5.3 GB  │  └─────────────────────────────┘  │
│      │   📁 Flight #11   NEW   │                                    │
│      │      185 imgs · 4.1 GB  │  ┌─────────────────────────────┐  │
│      │                          │  │ 🧊 Textured 3D Mesh         │  │
│      │ ▶ Oct 23, 2023 PROCESSED│  │    Oct 26, 2023             │  │
│      │ ▶ Oct 22, 2023 PROCESSED│  │    [3D VIEW]  [↓ 890 MB]    │  │
│      │                          │  └─────────────────────────────┘  │
│      │                          │                                    │
│      │                          │  ┌─────────────────────────────┐  │
│      │ ──────────────────────   │  │ ⛰ Elevation (DSM/DTM)       │  │
│      │ [▶ SEND FOR PROCESSING]  │  │    Oct 26, 2023             │  │
│      │  Sticky at panel bottom  │  │    [ELEVATION VIEW] [↓]     │  │
│      │  Shows when NEW selected │  └─────────────────────────────┘  │
└──────┴──────────────────────────┴────────────────────────────────────┘
```

### Flight Folder (Left Panel) Design — CRITICAL
```
Each DATE GROUP is a collapsible section:

EXPANDED (has unprocessed flights):
  Header:
    [▼ chevron]  [Oct 26, 2023]  [NEW ×2 pill — orange]
    font: 12px, --fb-text-secondary, uppercase tracking

  Flight rows (each flight = a clickable "folder"):
    ┌─────────────────────────────────────────┐
    │ 📁  Flight #12              210 imgs    │
    │      Captured 10:30 AM · 5.3 GB        │
    │      ████ NEW ████  (orange badge)      │
    └─────────────────────────────────────────┘

    Click behavior → opens IMAGE SELECTOR VIEW inline in RIGHT PANEL
    (not a modal — replaces the outputs panel)

COLLAPSED (fully processed date group):
  Header:
    [▶ chevron]  [Oct 23, 2023]  [✓ PROCESSED pill — green]
    font: 12px, --fb-text-secondary

  Click to expand → shows flights with green processed badge
  Click a processed flight → opens VIEWER directly

FLIGHT FOLDER CLICK BEHAVIOR:
  If flight is PROCESSED:
    → Highlights corresponding output card in right panel
    → Right panel scrolls to that output

  If flight is UNPROCESSED (NEW):
    → Right panel switches to IMAGE SELECTOR mode:
      Shows: image grid from that flight
      Each image: 100×100px thumbnail, GPS overlay, checkbox on hover
      Top bar: "210 images · Select images to exclude from processing"
      Bottom bar: [X selected to exclude] [▶ Send for Processing (N images)]
      User can DESELECT images they want to exclude — default ALL selected
```

### Right Panel — Image Selector Mode (for unprocessed flight)
```
Header:
  [← Back to Outputs]  Flight #12 — Oct 26, 2023   210 images

Toolbar:
  [Select All]  [Deselect All]  [Sort: Capture Time ▾]  [Filter: Show GPS only]
  "210 of 210 selected — deselect images to exclude from processing"

Image Grid (5 columns, auto-fill):
  Each tile: 120×120px
    - Thumbnail from FlytBase media API
    - Bottom-left: GPS coordinate monospace 9px
    - Top-right checkbox (filled blue = included, empty = excluded)
    - Excluded: 40% opacity + red X overlay

Selection State Badge:
  Included: blue border ring 2px --fb-primary
  Excluded: border rgba(248,113,113,0.4), opacity 0.4

Bottom sticky bar (always visible):
  "202 of 210 selected"  [▶ Send for Processing (202 images)]
  Button: gradient background var(--grad-blue), 14px, bold
```

### Right Panel — Processed Outputs Mode
```
Output Card design:

┌──────────────────────────────────────────────────────────────┐
│  [icon 32px]  TYPE NAME (15px bold)           [↓ download]  │
│               Date · GSD value (monospace)                   │
│  ─────────────────────────────────────────────────────────   │
│  [OUTPUT THUMBNAIL — 200px height, object-fit cover]         │
│  ─────────────────────────────────────────────────────────   │
│  [VIEW BUTTON — full width, ghost primary]                   │
└──────────────────────────────────────────────────────────────┘

Output types and icon colors:
  Orthomosaic 2D Map: icon --fb-primary, "2D VIEW" button
  Textured 3D Mesh:   icon var(--grad-orange), "3D VIEW" button
  Elevation DSM/DTM:  icon --fb-success, "ELEVATION VIEW" button
  Point Cloud:        icon purple #a78bfa, "3D VIEW" button

Active Processing Job (replaces output card or shows above):
  Background: rgba(59,141,245,0.05)
  Border-color: var(--fb-border-active)
  Shows: spinning icon, stage name, progress bar (--fb-primary fill), % and ETA
  Real-time via WebSocket

File size: shown in --fb-mono font, --fb-text-tertiary color
```

### Split Panel Layout (CUSTOM project)
```
Differences from Mission project:
  - Left panel shows "Media Sets" instead of Flights
  - Each media set = a batch added from gallery, grouped by date added
  - No mission dropdown at top
  - No "NEW" flight badges
  - "CUSTOM PROJECT — No Mission Assigned" label instead of mission name
  - "+ Add More Media" button at bottom of left panel (re-opens gallery picker)

┌──────────────────────────────┬────────────────────────────────────┐
│ LEFT PANEL                   │ RIGHT PANEL                        │
│                              │                                    │
│ CUSTOM PROJECT               │ (Same output cards as mission)     │
│ ─────────────────────────    │                                    │
│                              │                                    │
│ MEDIA SETS                   │                                    │
│                              │                                    │
│ ▼ Added May 15, 2024         │                                    │
│   82 images selected         │                                    │
│   from Gallery               │                                    │
│   [View selection →]         │                                    │
│                              │                                    │
│ ─────────────────────────    │                                    │
│ [+ Add More Media]           │                                    │
│ (ghost button, full width)   │                                    │
└──────────────────────────────┴────────────────────────────────────┘

NOTE: Custom project has NO "Send for Processing" concept after initial creation
      because it's a one-time process. "Add More Media" creates a new processing run.
```

---

## Modal — Create New Project

### Step 1: Name + Type Selection
```
Modal: 520px wide, var(--fb-radius-xl) radius, var(--fb-surface-solid) bg
Overlay: rgba(0,0,0,0.7) backdrop-filter: blur(8px)

HEADER:
  "Create New Project" (16px, weight 600)
  [✕] close button (top right)

BODY:
  PROJECT NAME
  Label: "PROJECT NAME" (11px, uppercase, --fb-text-secondary, letter-spacing 0.5px)
  Input: full-width, --fb-bg background, --fb-border border, focus: --fb-border-active

  PROJECT TYPE (label same style)
  Two option cards side by side (each 50% - 6px gap):

  ┌─────────────────────────┐  ┌─────────────────────────┐
  │  [drone icon 28px]      │  │  [folder icon 28px]     │
  │  Mission Project        │  │  Custom Project         │
  │  12px --fb-text-sec     │  │  12px --fb-text-sec     │
  │  "Link a grid mission   │  │  "Select images from    │
  │  to auto-sync flights"  │  │  the media gallery"     │
  └─────────────────────────┘  └─────────────────────────┘

  UNSELECTED: border 1px --fb-border, bg --fb-bg
  SELECTED (Mission): border 2px --fb-border-active, bg --fb-primary-subtle,
                      checkmark icon top-right in --fb-primary
  SELECTED (Custom):  border 2px rgba(245,158,11,0.4), bg rgba(245,158,11,0.08),
                      checkmark icon top-right in --fb-accent

FOOTER:
  [Cancel — ghost] [Next → — primary filled]
  Padding: 16px 24px, border-top: 1px --fb-border
```

### Step 2a — Assign Mission (Mission type)
```
Modal continues (same container, content replaces):

HEADER:
  [← back arrow]  "Assign Mission"  [✕]
  "Step 2 of 2" in --fb-text-tertiary 12px

SEARCH:
  Full-width search input with search icon prefix
  Placeholder: "Search missions by name or ID..."

MISSION LIST (scrollable, max-height 360px):
  Each mission row:
  ┌──────────────────────────────────────────────────────┐
  │ [○ radio]  Perimeter Surveillance #1          [›]    │
  │            300m × 200m  ·  Last flight: 2d ago       │
  │            210 images available                      │
  └──────────────────────────────────────────────────────┘

  IMPORTANT: Only shows missions for the CURRENT SITE — not all org missions

  Selected row:
  bg: --fb-primary-subtle
  radio: filled --fb-primary
  border-left: 3px solid --fb-primary

  If mission has no flights yet:
  Show "No flights yet" in --fb-text-tertiary, radio still selectable

FOOTER:
  [← Back]  [Cancel]  [Create Project — primary filled]
```

### Step 2b — Gallery Picker (Custom type)
```
Modal expands to 860px wide for gallery picker

HEADER:
  [← back]  "Select Media"  [✕]
  "Choose images to include in this project"

FILTER ROW (horizontal, not sidebar):
  [Site: All ▾]  [Mission: All ▾]  [From: ──]  [To: ──]  [Type: JPEG ✕ DNG ✕ ▾]
  All as small filter chips, 12px

GALLERY GRID (7 columns, fixed height 400px, scrollable):
  DATE + FLIGHT GROUP HEADER:
    "Oct 26, 2023 · Flight #12 · 210 images"  [Select all →]
    12px, --fb-text-secondary, border-bottom --fb-border

  Image tiles 80×80px:
    Default: thumbnail, GPS coords overlay bottom-left (monospace 8px)
    Hover: show checkbox overlay top-left
    Selected: blue border 2px, checkbox filled --fb-primary, slight brightness boost

SELECTION FOOTER (sticky):
  "[N] images selected"  [← Back]  [Create Project →]

  Count: 14px bold --fb-primary
  Create button: --grad-blue gradient fill, only enabled when N > 0
```

---

## Page 4 — Viewer `/sites/:siteId/projects/:projectId/view`

### Layout (Stitch screen 7 is close — refine only)
```
┌─────────────────────────────────────────────────────────────────────┐
│ TOPBAR (modified for viewer):                                       │
│  [← Project Name]   Solar Farm Alpha — Sector 4                    │
│  CENTER TABS: [2D MAP] [3D MESH] [ELEVATION]                       │
│  RIGHT: [EXPORT ▾] [🔔]                                            │
├─────────────────────────────────────────────────────────────────────┤
│ VIEWER (full height, no sidebar)            │ RIGHT PANEL (280px)  │
│                                             │ glass: bg --fb-surface│
│ 2D: Leaflet dark tiles + polygon in         │ blur(16px) 85% opacity│
│     --fb-primary dashed line                │                       │
│ 3D: Three.js mesh render                   │ LAYERS                │
│ EL: DSM/DTM heatmap                        │  ● Orthomosaic  👁 ⚙  │
│                                             │  ○ DSM         👁 ⚙  │
│                                             │  ○ DTM         👁 ⚙  │
│                                             │                       │
│                                             │ METADATA             │
│                                             │ Area     2.4 ha      │
│                                             │ Avg GSD  2.1 cm/px   │
│                                             │ Points   14.2M pts   │
│                                             │ Precision ±3.2 cm    │
│ BOTTOM STATUS BAR:                          │                       │
│ LAT 30.5556°N  LON 115.5556°W  ALT 142.5m  │ DOWNLOADS            │
│ (monospace, --fb-text-tertiary, glassmorphic│ ortho_final_v2.tiff  │
│  chip bottom-left of map)                   │ 12.0 GB  [READY]    │
│                                             │ point_cloud.las      │
│                                             │ 890 MB   [READY]    │
│                                             │                       │
│                                             │ [Generate Report]    │
└─────────────────────────────────────────────┴──────────────────────┘
```

### Right Panel Details
```
Background: var(--fb-surface) with backdrop-filter: blur(16px)
Elevation: border-left 1px --fb-border

Section headers: 11px uppercase, --fb-text-tertiary, letter-spacing 0.8px
Section gap: 24px between sections

LAYERS:
  Each row: toggle switch (blue when on) + layer name + eye icon + gear icon
  Active layer: name in --fb-text, toggle on (green)
  Inactive: name in --fb-text-secondary, toggle off

METADATA:
  Two-column key-value table
  Keys: 12px --fb-text-secondary
  Values: 13px --fb-text, --fb-mono font for numbers, right-aligned

DOWNLOADS:
  Each row: filename (13px) + size (monospace 11px --fb-text-tertiary) + status pill
  Status pills:
    READY: bg rgba(52,211,153,0.12), text --fb-success
    PREPARING: bg rgba(245,158,11,0.12), text --fb-accent (animated dot)
  Download icon on right, appears on hover
```

---

## Page 5 — Settings `/settings`

```
Simple page — tabbed layout:

Tabs: [FlytBase API] [Storage] [Processing]

FlytBase API tab:
  - Org ID input
  - API Key input (masked, show/hide toggle)
  - Base URL input
  - Connection status indicator (● Connected / ✕ Failed)
  - [Test Connection] ghost button
  - [Save Changes] primary button
```

---

## Component: Processing Status (Global)

When a job is actively processing, show a **mini status bar** in topbar (right of search):

```
[spinning dot] Processing Flight #12   74%  [×]
Background: rgba(59,141,245,0.1)
Border: 1px solid rgba(59,141,245,0.2)
Border-radius: 20px
Padding: 4px 12px
Font: 12px, --fb-text-secondary
Progress: shown as text %, no bar in topbar
Click → navigates to that project page
```

---

## Interaction Flows Summary

### Flow 1: User enters → sees sites
1. Login via FlytBase SSO → redirected to `/`
2. Sees 3 stat cards + site grid
3. Clicks a site → `/sites/:id`

### Flow 2: Create Mission Project
1. On `/sites/:id` → click "+ New Project"
2. Modal Step 1: enter name, select "Mission Project" → Next
3. Modal Step 2a: see missions filtered to THIS site → select one → "Create Project"
4. Redirected to `/sites/:id/projects/:newId`
5. Flights auto-loaded from linked mission

### Flow 3: Create Custom Project
1. On `/sites/:id` → click "+ New Project"
2. Modal Step 1: enter name, select "Custom Project" → Next
3. Modal Step 2b: gallery picker expands, apply filters, select images → "Create Project"
4. Redirected to `/sites/:id/projects/:newId`
5. Project created, images queued for processing

### Flow 4: Process new flights (Mission project — from project list)
1. On `/sites/:id` → see project row with "[▶ Process (3 new)]" button
2. Click it → opens ProcessingModal with 3 new flights pre-selected
3. Choose quality → submit → progress in topbar status chip

### Flow 5: Process new flights (Mission project — from project page)
1. On project page → see NEW folders in left panel
2. Click a NEW folder → right panel shows image grid
3. Deselect unwanted images
4. Click "Send for Processing" sticky button → ProcessingModal → submit

### Flow 6: View processed output
1. On project page → processed date group collapsed in left panel
2. Click processed date → right panel shows output cards
3. Click "2D VIEW" → navigates to `/view` with 2D tab active
4. Click "3D VIEW" → navigates to `/view` with 3D tab active

---

## Spacing & Typography Rules

```
Base grid: 4px
Common spacings: 4, 8, 12, 16, 20, 24, 32, 48px

Typography:
  Page titles:     22-24px, weight 700, --fb-text
  Card titles:     15px, weight 600, --fb-text
  Section headers: 13px, weight 600, --fb-text-secondary
  Meta labels:     11-12px, weight 500, --fb-text-tertiary, UPPERCASE + tracking
  Body text:       13px, weight 400, --fb-text-secondary
  Monospace data:  --fb-mono, 11-13px (coordinates, file sizes, GSD values)
  Badges/pills:    10px, weight 600, UPPERCASE, letter-spacing 0.3px
```

---

## STITCH PROMPT (Copy-paste this entire block)

---

```
Build a complete dark-themed drone mapping platform UI called "Mapper" as a FlytBase product.
This is a professional photogrammetry platform — the aesthetic should match FlytBase's existing
web product: authoritative, data-dense, clean navy dark theme. NOT military/game-like.

═══════════════════════════════════════════════════════════════
DESIGN SYSTEM — USE THESE EXACT VALUES, NO SUBSTITUTIONS
═══════════════════════════════════════════════════════════════

FONTS:
  Primary: 'DM Sans' (body, UI, navigation)
  Monospace: 'JetBrains Mono' (coordinates, file sizes, GSD values, timestamps)
  Load both from Google Fonts

CSS VARIABLES (define in :root):
  --fb-bg:              #080d16
  --fb-surface:         rgba(16, 22, 36, 0.85)
  --fb-surface-solid:   #111827
  --fb-surface-hover:   rgba(30, 42, 65, 0.6)
  --fb-surface-active:  #1e2d44
  --fb-border:          rgba(255, 255, 255, 0.07)
  --fb-border-active:   rgba(44, 123, 242, 0.5)
  --fb-primary:         #3b8df5
  --fb-primary-hover:   #2570d4
  --fb-primary-subtle:  rgba(59, 141, 245, 0.10)
  --fb-accent:          #f59e0b
  --fb-text:            #eef1f6
  --fb-text-secondary:  #8899af
  --fb-text-tertiary:   #4a5568
  --fb-success:         #34d399
  --fb-destructive:     #f87171
  --fb-radius:          10px
  --fb-radius-lg:       14px
  --fb-radius-xl:       18px
  --fb-font:            'DM Sans', -apple-system, sans-serif
  --fb-mono:            'JetBrains Mono', monospace
  --fb-transition:      220ms cubic-bezier(0.16, 1, 0.3, 1)
  --fb-shadow:          0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.05)
  --fb-shadow-lg:       0 8px 32px rgba(0,0,0,0.10)
  --grad-blue:          linear-gradient(135deg, #1e83ec, #00cdff)
  --grad-mixed:         linear-gradient(135deg, #11998e 0%, #1e83ec 50%, #2C7BF2 100%)

GLOBAL EFFECTS (apply to body):
1. Dot grid texture: body::before { background-image: radial-gradient(circle, rgba(59,141,245,0.035) 1px, transparent 1px); background-size: 28px 28px; position: fixed; inset: 0; pointer-events: none; z-index: -1; }
2. Film grain: body::after { opacity: 0.035; background SVG fractalNoise; background-size: 200px; position: fixed; inset: 0; pointer-events: none; z-index: 9999; }
3. Topbar gradient underline: .topbar::after { content:''; position:absolute; bottom:-1px; left:0; right:0; height:1px; background:linear-gradient(90deg,#11998e,#1e83ec,#3b8df5,#f59e0b); opacity:0.6; }

SCROLLBAR STYLING:
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--fb-surface-hover); border-radius: 3px; }

═══════════════════════════════════════════════════════════════
GLOBAL LAYOUT — PERSISTENT ACROSS ALL SCREENS
═══════════════════════════════════════════════════════════════

TOPBAR (56px height, sticky, z-index 100):
  background: rgba(8,13,22,0.92)
  backdrop-filter: blur(20px)
  border-bottom: 1px solid var(--fb-border)
  position: relative (for ::after gradient line)

  LEFT: FlytBase logo SVG (map/drone icon, 22px) + "MAPPER" badge
    Badge: font-size 10px, --fb-primary color, --fb-primary-subtle background,
           uppercase, letter-spacing 0.5px, padding 2px 7px, border-radius 4px

  CENTER-LEFT: Page title (breadcrumb — see per-screen specs)

  RIGHT: Search input (200px, --fb-bg bg, icon prefix) + bell icon + user avatar circle

  Note: NO "Projects" or "Mission Control" tabs in topbar. NO extra nav items here.

SIDEBAR (left, collapsible, z-index 200):
  Expanded: 260px wide
  Collapsed: 56px wide
  background: rgba(8,13,22,0.92), backdrop-filter: blur(20px)
  border-right: 1px solid var(--fb-border)

  HEADER (padding 20px 20px 16px, border-bottom --fb-border):
    FlytBase logo + "MAPPER" wordmark
    Hidden when collapsed (opacity:0 + width:0 transition, NOT display:none)

  NAV ITEMS (only 2):
    1. [map-pin icon] "Sites" — active when on / or /sites/*
    2. [gear icon] "Settings" — active on /settings

    Nav item: padding 9px 12px, border-radius 8px, margin 2px 8px
    Default: color --fb-text-secondary
    Hover: background --fb-surface-hover, color --fb-text
    Active: background --fb-primary-subtle, color --fb-primary,
            border-left: 3px solid --fb-primary (inset, not adding width)

    Icon: 18px, stroke width 1.5px, lucide-style
    Label: 13px, font-weight 500, margin-left 10px
    Hidden when collapsed (smooth transition via opacity + translateX)

  COLLAPSE BUTTON:
    Fixed position at sidebar right edge (left: sidebar-width - 12px, top: 28px)
    24px circle, background --fb-surface-solid, border 1px rgba(255,255,255,0.1)
    Hover: background --fb-primary, color white
    Contains left-chevron SVG that rotates 180° when collapsed

  BOTTOM (above collapse area):
    User avatar 32px circle + org name 12px
    Hidden when collapsed

═══════════════════════════════════════════════════════════════
SCREEN 1 — SITE DASHBOARD (route: /)
═══════════════════════════════════════════════════════════════

Page title in topbar: "My Sites"

STATS ROW (below topbar, margin-bottom 28px, 3 cards only):
  Layout: 3 equal-width cards in a flex row, gap 16px, padding 0 32px

  Card structure:
    background: var(--fb-surface-solid)
    border: 1px solid var(--fb-border)
    border-radius: var(--fb-radius-lg)
    padding: 20px 24px
    display: flex, align-items: center, gap: 16px

    LEFT: Icon circle (40px, border-radius 50%, bg = icon-color at 10% opacity)
    RIGHT: Number (28px, weight 700) above Label (11px, --fb-text-tertiary, uppercase)

  Card 1 — Total Sites:
    Icon: grid/map icon, --fb-primary color
    Number: "12" in --fb-text (white)
    Label: "TOTAL SITES"

  Card 2 — Active Projects:
    Icon: folder-check icon, --fb-primary color
    Number: "8" in --fb-primary
    Label: "ACTIVE PROJECTS"

  Card 3 — Currently Processing:
    Icon: cpu/spinner icon, --fb-accent color, with CSS pulse animation
    Number: "2" in --fb-accent
    Label: "CURRENTLY PROCESSING"
    When 0: number in --fb-text-tertiary, no pulse

CONTENT AREA (padding 0 32px 32px):
  Header row: "Sites" label (14px, --fb-text-secondary) LEFT + [⊞ grid] [☰ list] icons RIGHT

  SITE CARDS GRID:
    display: grid, grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)), gap: 16px

    SITE CARD:
      background: var(--fb-surface)
      border: 1px solid var(--fb-border)
      border-radius: var(--fb-radius-lg)
      overflow: hidden
      cursor: pointer
      transition: var(--fb-transition)

      THUMBNAIL (height: 180px):
        Aerial drone imagery of landscape/industrial site (use landscape photos)
        OR dark placeholder with subtle polygon shape outline in --fb-primary dashed

        Gradient overlay on thumbnail:
          linear-gradient(to bottom, transparent 40%, rgba(8,13,22,0.75) 100%)
          position: absolute, inset: 0

        STATUS BADGE (absolute, top: 10px, left: 12px):
          ACTIVE state:   background rgba(52,211,153,0.18), text #34d399,
                          8px bold dot (green pulse) + "ACTIVE" text,
                          font 10px uppercase, padding 4px 8px, radius 20px
          PROCESSING:     background rgba(245,158,11,0.18), text #f59e0b, orange pulse dot
          Show badge only if ACTIVE or PROCESSING — not for idle sites

      BODY (padding: 14px 16px 10px):
        Site name: 15px, weight 600, --fb-text, margin-bottom 4px
        Location row: [map-pin icon 12px --fb-text-tertiary] "Maharashtra, India"
                      in 12px --fb-text-secondary

      FOOTER (padding: 10px 16px, border-top: 1px solid var(--fb-border)):
        Left: [folder icon 12px] "N projects" in 12px --fb-text-tertiary
        Right: "Last flight Xd ago" in 12px --fb-text-tertiary

      HOVER STATE:
        border-color: var(--fb-border-active)
        transform: translateY(-2px)
        box-shadow: 0 8px 32px rgba(59,141,245,0.08)

  Show 4 site cards: Pune Solar Array Site (ACTIVE), Mumbai Transmission Hub (PROCESSING),
  Nagpur Infrastructure (ACTIVE), Nashik Vineyard Plot (IDLE — no badge)

  NO "Create New Site" card. NO extra cards.

═══════════════════════════════════════════════════════════════
SCREEN 2 — SITE DETAIL (route: /sites/:id)
═══════════════════════════════════════════════════════════════

Topbar title: breadcrumb "Sites / Pune Solar Array Site"
              breadcrumb style: "Sites" in --fb-text-tertiary + "/" + "Pune Solar Array Site" in --fb-text

SITE HEADER (padding: 24px 32px 0):
  "Pune Solar Array Site" — 24px, weight 700
  Coordinates row: "18.5204°N, 73.8567°E" in --fb-mono 12px --fb-text-tertiary,
                   pill badges after: "4 MISSIONS" (--fb-primary-subtle, --fb-primary text)
                                      "18 FLIGHTS" (surface, --fb-text-secondary text)

PROJECT LIST SECTION (padding: 20px 32px):
  Header row:
    LEFT: "Projects" 14px --fb-text-secondary
    RIGHT: [+ New Project] primary filled button (12px, --fb-primary bg, white text,
                                                   plus icon left)

  Toolbar row (margin-top: 12px, margin-bottom: 16px):
    Search input (300px, icon prefix, placeholder "Search projects...")
    [⊞] [☰] view toggle icons on right

  PROJECT LIST (list view, default):
    Each row:
      background: var(--fb-surface)
      border: 1px solid var(--fb-border)
      border-radius: var(--fb-radius)
      padding: 14px 16px
      margin-bottom: 6px
      display: flex, align-items: center, gap: 14px
      transition: var(--fb-transition)

      THUMBNAIL (64×64px, border-radius: 8px, object-fit: cover, flex-shrink: 0):
        Show aerial image thumbnail or output preview
        Placeholder: --fb-bg background with output icon centered

      CONTENT (flex: 1):
        Row 1 (align-items: center, gap: 8px):
          TYPE BADGE:
            MISSION: "MISSION" 9px uppercase, --fb-primary color, --fb-primary-subtle bg,
                     padding 2px 7px, border-radius 4px
            CUSTOM:  "CUSTOM"  9px uppercase, --fb-accent color, rgba(245,158,11,0.1) bg
          Project name: 14px, weight 600, --fb-text
          Date: right-aligned, --fb-mono 11px, --fb-text-tertiary ("MAY-15-2024")

        Row 2 (margin-top: 4px):
          [layers icon] "12 outputs" · [zap icon] "5 flights"
          All 12px --fb-text-secondary, gap: 12px
          If has unprocessed: [orange pill] "3 NEW" — 10px, --fb-accent,
                               rgba(245,158,11,0.12) bg

        Row 3 (margin-top: 2px):
          "Last processed: Oct 12, 2023" — 12px --fb-text-tertiary

      ACTIONS (opacity: 0 on normal, opacity: 1 on row hover):
        [Open →] ghost button, 12px, --fb-primary on hover
        [▶ Process (3 new)] primary small button — ONLY if mission project AND has new flights
                             gradient fill --grad-blue, 11px, shows flight count
        [⋯] icon button, context menu on click

      ROW HOVER: background --fb-surface-hover, border-color rgba(255,255,255,0.12)

  Show 3 projects:
    1. "Infrastructure Scan North" — MISSION, last processed Oct 12 2023, 12 outputs, 5 flights, 2 new
    2. "Volumetric Analysis Storage B" — CUSTOM, last processed Sep 28 2023, 4 outputs, 1 flight, 0 new
    3. "Topographic Map Valley Phase1" — MISSION, last processed Aug 15 2023, 8 outputs, 3 flights, 0 new

═══════════════════════════════════════════════════════════════
SCREEN 3 — CREATE PROJECT MODAL (Step 1)
═══════════════════════════════════════════════════════════════

Overlays Screen 2 (dim background):
  Overlay: background rgba(0,0,0,0.7), backdrop-filter: blur(8px)

Modal:
  background: var(--fb-surface-solid)
  border: 1px solid var(--fb-border)
  border-radius: var(--fb-radius-xl)
  width: 520px
  box-shadow: 0 24px 80px rgba(0,0,0,0.5)

HEADER (padding: 20px 24px 16px, border-bottom: 1px solid --fb-border):
  "Create New Project" — 16px, weight 600
  Progress indicator: "1 OF 2" pill — 10px, --fb-text-tertiary, right-aligned
  [✕] close button: top-right, --fb-text-tertiary, hover --fb-text

BODY (padding: 24px):
  Section 1 — Project Name:
    Label: "PROJECT NAME" — 10px, uppercase, letter-spacing 0.6px, --fb-text-secondary, margin-bottom 6px
    Input: full-width, height 40px, background --fb-bg, border --fb-border,
           border-radius --fb-radius, font 13px, placeholder "e.g. North Field Survey Q2"
           Focus: border-color --fb-border-active, outline none

  Section 2 — Project Type (margin-top: 20px):
    Label: "PROJECT TYPE" (same style as above)

    Two-column card grid (gap: 12px, margin-top: 8px):

    MISSION CARD (selected by default):
      background: --fb-primary-subtle
      border: 2px solid var(--fb-border-active)
      border-radius: var(--fb-radius-lg)
      padding: 20px
      cursor: pointer
      position: relative

      Icon: drone SVG (28px, --fb-primary)
      Title: "Mission Project" — 13px, weight 600, --fb-text, margin-top: 10px
      Desc: "Auto-syncs new flights from a linked grid mission" — 11px, --fb-text-secondary, margin-top: 4px

      Selected checkmark: absolute top-10px right-10px, 16px circle, --fb-primary bg, white checkmark

    CUSTOM CARD (unselected):
      background: --fb-bg
      border: 1px solid var(--fb-border)
      border-radius: var(--fb-radius-lg)
      padding: 20px
      cursor: pointer

      Icon: folder-plus SVG (28px, --fb-text-tertiary → --fb-accent when selected)
      Title: "Custom Project" — 13px, weight 600, --fb-text-secondary
      Desc: "Manually select images from the media gallery" — 11px, --fb-text-secondary

      Selected state: border 2px solid rgba(245,158,11,0.5), bg rgba(245,158,11,0.06),
                      checkmark top-right in --fb-accent

FOOTER (padding: 16px 24px, border-top: 1px solid --fb-border):
  [Cancel] ghost button (background transparent, border --fb-border)
  [Next →] primary filled button (--fb-primary bg, white text, arrow-right icon)
  Both: 13px, height 38px, border-radius --fb-radius

═══════════════════════════════════════════════════════════════
SCREEN 4 — ASSIGN MISSION MODAL (Step 2a — Mission type)
═══════════════════════════════════════════════════════════════

Same modal container as Step 1 (content replaces):

HEADER:
  [← back icon] "Assign Mission" — 16px weight 600
  "STEP 2 OF 2" — 10px, --fb-text-tertiary, right-aligned
  [✕] close

BODY (padding: 20px 24px):
  Description: "Select a grid mission from Pune Solar Array Site"
               — 12px, --fb-text-secondary, margin-bottom 16px

  Search input (full width, search icon prefix, placeholder "Search missions..."):
    background: --fb-bg, border: --fb-border, height: 38px, radius: --fb-radius
    Focus border: --fb-border-active

  Mission list (margin-top: 12px, max-height: 340px, overflow-y: auto):
    Each mission row (padding: 14px 16px, border-radius: --fb-radius,
                      cursor: pointer, transition: --fb-transition):

      LEFT: Radio button (16px, custom styled — circle border --fb-border,
                          selected: filled --fb-primary with white dot)

      MIDDLE (flex: 1, margin-left: 12px):
        Mission name: 13px, weight 600, --fb-text
        Meta row: "300m × 200m · Last flight: 2d ago · 210 images available"
                  — 11px, --fb-text-tertiary, --fb-mono for dimensions

      RIGHT: chevron-right icon, 16px, --fb-text-tertiary

      SELECTED ROW:
        background: --fb-primary-subtle
        border-left: 3px solid --fb-primary (use negative margin-left: -3px on content to compensate)
        Radio filled

      HOVER (unselected): background rgba(30,42,65,0.4)

    Show 4 missions (first one selected):
      1. "Perimeter Surveillance #1" — 300m×200m, last 2d ago, 210 imgs (SELECTED)
      2. "Tower Inspection - North" — 400m×150m, last 1w ago, 185 imgs
      3. "Stockpile Volumetric Analysis" — 250m×250m, last 3d ago, 320 imgs
      4. "Gravel Pit 3D Scan" — 500m×400m, last 2w ago, 0 imgs (show "No flights yet")

FOOTER:
  [← Back] ghost button
  [Cancel] ghost button (text only, no border, --fb-text-secondary)
  [Create Project] primary gradient button (--grad-blue fill), disabled until selection made

═══════════════════════════════════════════════════════════════
SCREEN 5 — PROJECT PAGE — MISSION PROJECT
═══════════════════════════════════════════════════════════════

Topbar: breadcrumb "Sites / Pune Solar Array / Infrastructure Scan North"
        Show [⋯] and [archive icon] buttons on right of topbar

LAYOUT: sidebar + [left panel 320px] + [right panel flex-1]
        No padding on content area — panels go edge to edge below topbar

LEFT PANEL:
  background: rgba(8,13,22,0.6)
  border-right: 1px solid var(--fb-border)
  height: calc(100vh - 56px)
  display: flex, flex-direction: column
  overflow: hidden

  PANEL HEADER (padding: 16px 16px 12px, border-bottom: --fb-border):
    "Flights" — 13px, weight 600, --fb-text
    MISSION DROPDOWN (margin-top: 8px):
      background: --fb-surface-solid, border: --fb-border, border-radius: --fb-radius
      padding: 8px 12px, font: 12px, --fb-text-secondary
      Current value: "Mission Delta-9: Surveying Area 4"
      Chevron-down icon on right
      Full width

  FLIGHT LIST (flex: 1, overflow-y: auto, padding: 8px 0):

    DATE GROUP 1 — UNPROCESSED (has new flights):
      GROUP HEADER (padding: 10px 16px, cursor pointer):
        [▼ chevron 12px] "Oct 26, 2023" — 11px, weight 600, --fb-text-secondary, uppercase
        RIGHT: [NEW ×2] pill — 9px, --fb-accent, rgba(245,158,11,0.15) bg, border-radius 10px

      FLIGHT ROWS (padding-left: 8px):
        ┌─────────────────────────────────────────┐
        │ [📁 folder icon 14px --fb-accent]        │
        │ Flight #12          [NEW pill --fb-accent]│
        │ 210 imgs · 5.3 GB  ·  10:32 AM          │
        └─────────────────────────────────────────┘
        padding: 8px 16px 8px 28px
        border-radius: --fb-radius
        margin: 2px 8px
        cursor pointer

        Hover: background --fb-surface-hover

        Flight #12: 210 imgs · 5.3 GB (NEW pill orange)
        Flight #11: 185 imgs · 4.1 GB (NEW pill orange)

        File sizes: --fb-mono, 10px, --fb-text-tertiary

    DATE GROUP 2 — PROCESSED:
      GROUP HEADER:
        [▶ chevron 12px] "Oct 23, 2023" — 11px, --fb-text-tertiary
        RIGHT: [✓ PROCESSED] pill — 9px, --fb-success, rgba(52,211,153,0.12) bg
      (collapsed — click to expand)

    DATE GROUP 3 — PROCESSED:
      [▶] "Oct 22, 2023" — [✓ PROCESSED]
      (collapsed)

  PANEL FOOTER (padding: 12px 16px, border-top: --fb-border):
    "SEND FOR PROCESSING" button — full width, height 40px
    Gradient: --grad-blue fill (linear-gradient(135deg, #1e83ec, #3b8df5))
    [play icon] "Send for Processing (2 flights)"
    Font: 12px, weight 600, white
    Border-radius: --fb-radius

    This button is ALWAYS visible (primary CTA of left panel)
    Disabled state: background rgba(59,141,245,0.3), cursor not-allowed

RIGHT PANEL:
  background: transparent (shows body bg + dot grid)
  padding: 24px 28px
  overflow-y: auto

  PANEL HEADER (display: flex, justify-content: space-between, margin-bottom: 20px):
    LEFT:
      "Processed Outputs" — 16px, weight 600, --fb-text
      "Workspace: San Francisco Terminal Expansion" — 12px, --fb-text-tertiary
    RIGHT:
      [filter icon] [refresh icon] — ghost icon buttons, 32px

  ACTIVE JOB CARD (shows at top when processing):
    background: rgba(59,141,245,0.04)
    border: 1px solid rgba(59,141,245,0.2)
    border-radius: var(--fb-radius-lg)
    padding: 16px 20px
    margin-bottom: 16px

    Row 1: [spinning circle 16px --fb-primary] "3D Mesh Generation" — 13px weight 600
           "Processing Flight #10 Data · High Fidelity Reconstruction" — 11px --fb-text-secondary
           "74%" — right-aligned, --fb-primary, --fb-mono 13px weight 600
    Row 2 (margin-top: 8px):
      Progress bar: height 4px, background rgba(59,141,245,0.15),
                    fill --fb-primary, border-radius 2px, width 74%
    Row 3 (margin-top: 6px):
      "EST. FINISH: 51 MIN" — 10px, --fb-text-tertiary, --fb-mono, uppercase

  OUTPUT CARDS (2 per row grid layout, gap: 12px):

    CARD STRUCTURE:
      background: var(--fb-surface)
      border: 1px solid var(--fb-border)
      border-radius: var(--fb-radius-lg)
      overflow: hidden

      CARD HEADER (padding: 12px 14px):
        LEFT: [icon circle 28px] TYPE NAME — 13px weight 600, --fb-text
        CENTER: Date — 11px --fb-text-tertiary --fb-mono
        RIGHT: [download icon 14px] --fb-text-tertiary, hover --fb-primary

      THUMBNAIL (height: 140px, width: 100%):
        For orthomosaic: aerial map thumbnail (dark satellite view)
        For 3D mesh: teal 3D wireframe render
        For elevation: colorized DSM heatmap (purple-blue-green-yellow gradient)
        object-fit: cover, background --fb-bg

      CARD FOOTER (padding: 10px 14px):
        [view button — full width]
        height: 34px, border-radius: --fb-radius
        border: 1px solid --fb-border
        background: transparent
        text: 12px, --fb-text-secondary
        hover: background --fb-primary-subtle, color --fb-primary, border-color --fb-border-active

    OUTPUT 1 — Orthomosaic (2D Map):
      Icon: map icon in --fb-primary
      Background circle: --fb-primary-subtle
      Thumbnail: dark aerial satellite view with grid overlay
      Button text: "2D VIEW"

    OUTPUT 2 — Textured 3D Mesh:
      Icon: box/cube icon in #f59e0b (amber)
      Thumbnail: teal 3D mesh visualization
      Button text: "3D VIEW"
      Badge "ARCHIVE OCT 20" top-left overlay on thumbnail (if archived version exists)

    OUTPUT 3 — Elevation DSM/DTM:
      Icon: mountain icon in --fb-success (green)
      Thumbnail: rainbow heatmap (purple-teal-green-yellow) — NOT grayscale
      Button text: "ELEVATION VIEW"
      Label "HISTORICAL DATA" top-left overlay on thumbnail (muted orange)

  LOCATION CHIP (bottom-right of right panel, sticky):
    background: rgba(8,13,22,0.8), backdrop-filter: blur(10px)
    border: 1px solid --fb-border, border-radius: 8px, padding: 8px 12px
    All text in --fb-mono 10px --fb-text-tertiary:
    "LATITUDE  37.7749°N"
    "LONGITUDE 122.4194°W"
    "ALTITUDE (AVG) 42.9m MSL"

═══════════════════════════════════════════════════════════════
SCREEN 6 — UNPROCESSED FLIGHT — IMAGE SELECTOR VIEW
═══════════════════════════════════════════════════════════════

SAME LAYOUT as Screen 5 (left panel unchanged — Flight #12 highlighted in left panel)

RIGHT PANEL changes to IMAGE SELECTOR MODE when a NEW flight is clicked:

RIGHT PANEL CONTENT:
  HEADER (padding: 20px 24px, display flex):
    LEFT: [← back to outputs icon button, 14px, --fb-text-secondary]
          "Flight #12 — Oct 26, 2023" — 14px weight 600
          "210 images · 5.3 GB" — 12px --fb-text-secondary
    RIGHT: "202 of 210 selected" — 13px --fb-primary weight 600

  TOOLBAR (margin: 0 24px 12px, display flex, gap 8px):
    [Select All] small ghost button
    [Deselect All] small ghost button
    separator
    Sort dropdown: [Capture Time ▾] 12px
    Filter chip: [GPS Only] toggle chip

    INFO TEXT: "Deselect images to exclude them from processing. Excluded images will be discarded."
               11px, --fb-text-tertiary, italic

  IMAGE GRID (padding: 0 24px, display grid,
              grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)), gap: 6px):

    Each IMAGE TILE:
      position: relative
      border-radius: 8px
      overflow: hidden
      aspect-ratio: 1
      cursor: pointer

      THUMBNAIL: object-fit cover, width/height 100%

      GPS OVERLAY (absolute, bottom: 0, left: 0, right: 0):
        background: linear-gradient(transparent, rgba(0,0,0,0.75))
        padding: 20px 5px 5px
        [location-dot icon 8px] "18.52°N 73.85°E" — 8px --fb-mono white

      CHECKBOX (absolute, top: 6px, left: 6px):
        20px circle, background rgba(0,0,0,0.5), border 1.5px rgba(255,255,255,0.4)
        Checked: --fb-primary fill, white checkmark SVG
        Shows always (not just on hover — since this is select mode)

      SELECTED state (default — included):
        Checkbox filled --fb-primary
        Border: 2px solid --fb-primary (as overlay outline)
        Normal brightness

      EXCLUDED (deselected) state:
        Opacity: 0.35
        Filter: grayscale(80%)
        Checkbox: empty circle with --fb-destructive border
        Red X overlay (absolute center): 20px circle, rgba(248,113,113,0.3) bg, × in red

  Show 18+ image tiles in the grid (3+ rows visible, scroll for more)

  BOTTOM ACTION BAR (sticky, border-top: --fb-border, padding: 14px 24px):
    display: flex, justify-content: space-between, align-items: center
    background: rgba(8,13,22,0.9), backdrop-filter: blur(10px)

    LEFT: "202 of 210 images included" — 13px, --fb-text-secondary
    RIGHT: [▶ Send for Processing (202 images)]
           height: 38px, padding: 0 20px, background: --grad-blue
           border-radius: --fb-radius, font: 13px weight 600 white
           Border: none

═══════════════════════════════════════════════════════════════
SCREEN 7 — GALLERY / CUSTOM PROJECT MEDIA PICKER
═══════════════════════════════════════════════════════════════

This screen is for CUSTOM PROJECT creation — user picking media from gallery.
Layout: sidebar + [filter sidebar 240px] + [gallery area flex-1]

Topbar: title "Select Media" with "Custom Project: [Project Name]" below in 11px --fb-text-tertiary

FILTER SIDEBAR (240px, bg rgba(8,13,22,0.6), border-right: --fb-border, padding: 20px 16px):
  "FILTERS" — 10px uppercase tracking --fb-text-tertiary, margin-bottom 16px
  [Reset] link — right-aligned, --fb-primary, 11px

  FILTER GROUP STRUCTURE (each section margin-bottom: 20px):
    Section label: 10px uppercase, --fb-text-tertiary, letter-spacing 0.6px, margin-bottom 8px

  SITE FILTER:
    Radio list: [○ All Sites] [● North Delta Refinery] [○ Pune Solar Array]
    Each: 12px --fb-text-secondary, radio 14px custom-styled
    Selected: --fb-primary color text + filled radio

  ACTIVE MISSION FILTER:
    Dropdown: "Monthly Inspection - Oct"
    background --fb-bg, border --fb-border, full-width, 12px, height 36px

  DATE RANGE:
    "FROM" label + date input (mm/dd/yyyy placeholder)
    "TO" label + date input
    Input: height 34px, background --fb-bg, border --fb-border, 12px --fb-mono

  FILE TYPE:
    Checkbox list:
    [☑] JPEG (Photography) — checked, --fb-success dot
    [☑] DNG (RAW Metadata) — checked
    [☐] MP4 (Video Logs)   — unchecked
    Each: 12px --fb-text-secondary

  [APPLY FILTERS ▼] button — full width, height 36px, --fb-primary bg, 12px, margin-top: 24px

GALLERY AREA (flex: 1, display: flex, flex-direction: column):

  TOOLBAR (padding: 16px 20px, border-bottom: --fb-border, display flex):
    LEFT: "42 ASSETS SELECTED" — badge: --fb-primary-subtle bg, --fb-primary text,
                                  10px uppercase, border-radius 20px, padding 4px 12px
    RIGHT: [⊞ grid] [☰ list] toggle + [SORT BY: Newest Flight ▾] 12px dropdown

  GALLERY CONTENT (flex: 1, overflow-y: auto, padding: 0 20px):

    FLIGHT GROUP 1:
      GROUP HEADER (padding: 16px 0 8px, border-bottom: 1px --fb-border, margin-bottom: 8px):
        LEFT: "Oct 24, 2023" — 12px weight 600 --fb-text-secondary
        CENTER: "FLIGHT INFO" label + "50 Images · 3.2 GB" — 11px --fb-mono --fb-text-tertiary
        RIGHT: "SELECT ALL FLIGHT IMAGES →" — 11px --fb-primary, cursor pointer

      IMAGE GRID (display: grid, grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)), gap: 6px):
        Show 8 images (some selected with blue ring, some unselected):

        Selected tile: 2px --fb-primary border, checkbox filled blue top-left,
                       [GPS] badge bottom-left (8px mono white on dark gradient)
        Unselected tile: no border, empty checkbox, hover shows checkbox

        One tile shows the drone icon placeholder (no GPS data): [GPS] badge in orange/warning

    FLIGHT GROUP 2 (Oct 22, 2023):
      Same structure, 5 images visible

    (Scrollable — more groups below)

  BOTTOM ACTION BAR (sticky, height: 56px, padding: 0 20px,
                     background rgba(8,13,22,0.95), backdrop-filter blur(12px),
                     border-top: --fb-border):
    display: flex, align-items: center, justify-content: space-between

    LEFT:
      [● green dot] "READY FOR PROCESSING" — 10px uppercase --fb-success tracking
      "42 images selected from 2 flights" — 12px --fb-text-secondary

    RIGHT: [SEND FOR PROCESSING →]
      background: --grad-blue, height: 38px, padding: 0 20px
      font: 12px weight 700 white, border-radius --fb-radius
      Icon: play-circle left of text

═══════════════════════════════════════════════════════════════
SCREEN 8 — VIEWER (2D Map)
═══════════════════════════════════════════════════════════════

TOPBAR (modified — no sidebar icon rail, different structure):
  LEFT: [← back icon] "Solar Farm Alpha — Sector 4" (15px weight 600)
        "PROJECT ID: PR-4560-MA" (10px --fb-mono --fb-text-tertiary below)
  CENTER: Tab switcher — [2D MAP] [3D MESH] [ELEVATION]
           Tab style: padding 6px 16px, border-radius 6px
           Active: background --fb-primary-subtle, color --fb-primary, font 12px weight 600
           Inactive: color --fb-text-tertiary, font 12px
  RIGHT: [EXPORT ▾] button (ghost, border --fb-border) + bell icon

VIEWER AREA (full remaining height, position: relative):
  FULL MAP (takes entire viewer area):
    Dark Leaflet map (dark tile theme — #080d16 background base tiles)
    AOI polygon overlay: dashed line in --fb-primary, semi-transparent fill rgba(59,141,245,0.06)
    Polygon vertices: small circles in --fb-primary
    Zoom controls: [+] [–] absolute top-left, 28px buttons, --fb-surface-solid bg, --fb-border border
    Compass: absolute top-left below zoom, 28px, --fb-surface-solid

  COORDINATE CHIP (absolute bottom-left of map, margin 16px):
    background: rgba(8,13,22,0.85), backdrop-filter: blur(12px)
    border: 1px solid --fb-border, border-radius: 8px, padding: 8px 14px
    Three rows in --fb-mono 10px --fb-text-tertiary:
      "MISSION  30.5556°N"
      "LONGITUDE  115.5556°W"
      "ALTITUDE (AVG)  142.5m MSL"
      Values right-aligned, --fb-text (slightly brighter)

  RIGHT PANEL (absolute right-0, top-0, bottom-0, width: 280px):
    background: rgba(16,22,36,0.88)
    backdrop-filter: blur(20px)
    border-left: 1px solid --fb-border
    padding: 20px 16px
    overflow-y: auto

    SECTION: LAYERS
      Header: "LAYERS" — 10px uppercase --fb-text-tertiary tracking, margin-bottom 10px

      Each layer row (padding: 8px 0, border-bottom: 1px --fb-border last-none):
        LEFT: layer name — 13px --fb-text-secondary
        RIGHT: [eye icon 14px --fb-text-tertiary] [gear icon 14px --fb-text-tertiary]
        Active layer: name in --fb-text + eye icon in --fb-primary

        Rows: Orthomosaic (active), DSM (Surface), DTM (Terrain)

    SECTION: METADATA (margin-top: 20px)
      Header: "METADATA" — same style

      Two-column table (display: grid, grid-template-columns: 1fr 1fr, gap: 4px 8px):
        Key: 10px --fb-text-tertiary uppercase
        Value: 12px --fb-text --fb-mono

        TOTAL AREA    2.4 ha
        AVG. GSD      2.1 cm/px
        POINT COUNT   14.28M pts   (colored --fb-primary)
        PRECISION     ±3.2 cm

    SECTION: DOWNLOADS (margin-top: 20px)
      Header: "DOWNLOADS" — same style
      Download icon row (each):
        [file icon 12px --fb-text-tertiary] filename (12px --fb-text-secondary)
        size (10px --fb-mono --fb-text-tertiary)
        [READY pill] (9px, --fb-success, rgba(52,211,153,0.12) bg)

        ortho_final_v2.tiff   12.0 GB    [READY]
        point_cloud.las        890 MB    [READY]
        contour_lines.dxf       40 MB    [READY]

      [GENERATE NEW REPORT] button:
        full width, margin-top: 16px, height: 36px
        border: 1px solid --fb-border, background: transparent
        font: 11px weight 600 --fb-text-secondary, border-radius: --fb-radius
        hover: background --fb-primary-subtle, border-color --fb-border-active, color --fb-primary

      PROCESSING STATUS (bottom of panel):
        [● green dot pulse] "PROCESSING ONLINE" — 10px --fb-success uppercase
        "" — 11px --fb-text-tertiary, margin-top 2px

═══════════════════════════════════════════════════════════════
INTERACTION NOTES
═══════════════════════════════════════════════════════════════

1. All page transitions: use CSS opacity + translateY(8px) → translateY(0), 200ms
2. Modal open: scale(0.97) → scale(1) + opacity 0→1, 220ms cubic-bezier(0.16,1,0.3,1)
3. No toast notifications shown in static screens
4. Loading states: use pulse animation on skeleton placeholders (--fb-surface-hover bg)
5. All icons are line/outline style (Lucide or equivalent), stroke-width: 1.5px
6. Never use pure black — minimum dark color is --fb-bg (#080d16)
7. Never use solid section dividers — use background color shifts (tonal layering)
8. Success green (#34d399) used ONLY for "Processed" status — nowhere else decoratively
9. Monospace font (JetBrains Mono) used ONLY for: coordinates, file sizes, GSD, IDs, dates in cards
10. All numeric stats in stat cards use font-variant-numeric: tabular-nums
```
