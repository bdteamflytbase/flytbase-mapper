# FlytBase Mapper — Product Roadmap v2

**Beyond Mapping: Site Intelligence Platform**
**Date**: March 26, 2026

---

## Competitive Analysis: What DroneDeploy Does Post-Map

DroneDeploy has evolved from a mapping tool to a **site intelligence platform**. Here's everything they offer that we need to consider:

### Their Feature Stack

| Category | Features | Our Status |
|---|---|---|
| **Mapping** | Ortho, 3D, point cloud, DSM/DTM | Done |
| **Measurements** | Distance, area, volume, elevation | Done |
| **Compare** | Side-by-side, timeline, change detection | Done |
| **Annotations** | Pin issues, notes, markers on map | Done |
| **Export** | GeoTIFF, OBJ, LAZ, reports | Done |
| **Progress AI** | Earthworks tracking, schedule vs actual | Not built |
| **Quality AI** | Defect detection (rust, leaks, cracks) | Not built |
| **Safety AI** | Hazard detection (missing barriers, PPE) | Not built |
| **Design Overlay** | BIM/CAD overlay on orthomosaic | Not built |
| **Cut/Fill Analysis** | Volume difference between design and actual terrain | Not built |
| **Contour Lines** | Generate elevation contours from DSM | Not built |
| **Cross-Section / Elevation Profile** | Elevation graph along a line | Not built |
| **Stockpile Management** | Track inventory volumes over time | Not built |
| **360 Walkthrough** | Interior documentation with 360 cameras | Not built |
| **Issue Tracker** | Full lifecycle issue management with status | Partial (annotations) |
| **Automated Counting** | Count objects (trees, vehicles, panels) | Not built |
| **Thermal Analysis** | Detect hotspots from thermal imagery | Not built |

---

## Product Roadmap: What to Build Next

### Phase 1: Analysis Engine (Weeks 1-3)
**Goal**: Match DroneDeploy's core analysis tools

#### 1.1 Design Overlay (BIM/CAD)
Upload a design file (DXF, PDF, or image) and overlay it on the orthomosaic.
- Drag, scale, rotate to align
- Toggle opacity to compare as-built vs as-designed
- Highlight deviations
- **Use case**: Construction manager checks if foundation matches architectural plan

#### 1.2 Cut/Fill Analysis
Compare the DSM against a design surface (flat plane or imported design elevation).
- Color-coded map: blue = cut (below design), red = fill (above design)
- Total cut volume, fill volume, net volume
- Export cut/fill report
- **Use case**: Earthworks contractor verifies grading progress

#### 1.3 Contour Lines
Generate elevation contours from DSM/DTM.
- Configurable interval (0.5m, 1m, 5m)
- Overlay on orthomosaic
- Export as DXF/GeoJSON
- **Use case**: Surveyor generates topographic map

#### 1.4 Elevation Profile / Cross-Section
Draw a line on the map → see elevation graph along that line.
- Interactive chart (hover to see elevation at any point)
- Compare profiles across different survey dates
- Export as CSV
- **Use case**: Engineer checks road grading, slope analysis

### Phase 2: AI-Powered Detection (Weeks 4-6)
**Goal**: Automated intelligence extraction from maps

#### 2.1 Object Counting
Use computer vision to count objects on the orthomosaic.
- Trees, vehicles, solar panels, stockpiles, structures
- Pre-trained models + custom training on user data
- Results shown as numbered markers on the map
- **Use case**: Solar farm operator counts panel installations

#### 2.2 Defect Detection (Quality AI)
Detect visual anomalies on structures.
- Crack detection on concrete/asphalt
- Rust/corrosion on metal structures
- Missing/damaged roof tiles
- Vegetation encroachment on infrastructure
- Severity classification: Critical, Major, Minor
- **Use case**: Refinery inspector identifies corrosion on pipes

#### 2.3 Progress Tracking (Progress AI)
Automatically track construction progress between surveys.
- Compare current orthomosaic against previous
- Quantify: % of foundation complete, % of framing done
- Timeline: actual vs planned schedule overlay
- Automated progress reports
- **Use case**: Construction PM reports weekly progress to stakeholders

#### 2.4 Safety Hazard Detection (Safety AI)
Identify safety risks from aerial imagery.
- Missing barriers, guardrails, signage
- Unauthorized personnel in restricted zones
- Equipment left in unsafe positions
- Water/debris accumulation
- **Use case**: Safety officer monitors site compliance

### Phase 3: Advanced Monitoring (Weeks 7-10)
**Goal**: Full site intelligence lifecycle

#### 3.1 Issue Tracker (Full Lifecycle)
Upgrade annotations to a proper issue management system.
- Status workflow: Open → In Progress → Resolved → Verified
- Priority levels: Critical, High, Medium, Low
- Assign to team members
- Due dates and SLA tracking
- Photo attachments from drone + ground
- Filter/search issues by status, priority, type, date
- **Use case**: QA team manages punch list items

#### 3.2 Stockpile Management
Track material volumes over time.
- Define stockpile regions on the map
- Auto-calculate volume each survey
- Chart volume changes over time
- Alert on unexpected changes (theft, over-delivery)
- **Use case**: Mining operation tracks ore stockpile inventory

#### 3.3 Dashboard Analytics
Site-level KPIs and reporting dashboard.
- Total area mapped, surveys completed, issues found
- Progress percentage over time (chart)
- Volume change trends (chart)
- AI detection summary (objects counted, defects found)
- Exportable PDF/email reports
- **Use case**: Program manager reviews all sites at a glance

#### 3.4 360 Integration
Support 360-degree ground-level photography.
- Upload 360 photos with GPS
- Pin locations on the orthomosaic
- Click pin → immersive 360 viewer
- Compare 360 captures over time
- **Use case**: Interior progress monitoring for building construction

### Phase 4: Enterprise Features (Weeks 11-14)
**Goal**: Multi-tenant, multi-site, enterprise-grade

#### 4.1 Team & Permissions
- Role-based access: Admin, Manager, Viewer, Annotator
- Site-level permissions (who can see what)
- Audit trail (who did what, when)

#### 4.2 API & Integrations
- Public REST API with API keys
- Procore integration (construction management)
- Autodesk BIM 360 integration
- Esri ArcGIS connector
- Slack/Teams notifications
- Custom webhook for any event

#### 4.3 White-Label
- Custom branding (logo, colors, domain)
- Embeddable viewer (`<iframe>` or SDK)
- Client-facing portal

---

## Implementation Priority Matrix

| Feature | Impact | Effort | Priority |
|---|---|---|---|
| Design Overlay (BIM/CAD) | Very High | Medium | **P0** |
| Cut/Fill Analysis | Very High | Medium | **P0** |
| Elevation Profile | High | Low | **P0** |
| Contour Lines | High | Low | **P1** |
| Issue Tracker (full) | High | Medium | **P1** |
| Object Counting (AI) | High | High | **P1** |
| Progress Tracking (AI) | Very High | High | **P2** |
| Defect Detection (AI) | High | High | **P2** |
| Stockpile Management | Medium | Medium | **P2** |
| Dashboard Analytics | High | Medium | **P2** |
| Safety AI | Medium | High | **P3** |
| 360 Integration | Medium | Medium | **P3** |
| Team & Permissions | High | Medium | **P3** |
| API & Integrations | High | High | **P3** |
| White-Label | Medium | Low | **P4** |

---

## How This Positions FlytBase

```
DroneDeploy:  Plan → Fly → Map → Analyze → Report
              (no flight)  ✓     ✓         ✓

Pix4D:        (no flight) → Map → Basic Analyze
                             ✓     ✓

FlytBase:     Plan → Fly → Map → Analyze → Report → Automate
              ✓       ✓     ✓     building   ✓        ✓
```

**The moat**: FlytBase owns the full pipeline from flight planning to automated analysis. DroneDeploy has to partner with DJI for flight. Pix4D has no flight at all. We own it end-to-end.

**The play for enterprise**:
- "One platform, one vendor, one integration"
- Self-hosted/air-gapped option (defense, energy)
- Native flight-to-analysis automation (no manual steps)
- Per-flight webhook → auto-map → auto-analyze → auto-report

---

## Revenue Impact Estimate

| Feature | Additional Deal Value |
|---|---|
| Design Overlay + Cut/Fill | +$15-25K/yr (construction vertical) |
| AI Detection Suite | +$20-40K/yr (inspection vertical) |
| Progress Tracking | +$10-20K/yr (construction PM) |
| Stockpile Management | +$10-15K/yr (mining/aggregates) |
| Full Platform | +$50-100K/yr per enterprise customer |

At 20 enterprise customers: **$1-2M ARR** from Mapper alone.
