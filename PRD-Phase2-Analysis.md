# FlytBase Mapper — Phase 2: Analysis Engine PRD

**Version**: 1.0
**Author**: Deep Gupta
**Date**: March 26, 2026
**Depends on**: Phase 1 (Mapping Platform — Complete)

---

## Overview

Phase 2 transforms FlytBase Mapper from a mapping tool into a **site analysis platform**. Six features, each built on proven open-source libraries and standard engineering methods.

---

## Feature 1: Volume Measurement (Stockpile)

### What It Does
User draws a polygon around a stockpile on the orthomosaic. System calculates the volume of material above the surrounding ground level.

### The Math
```
For each DSM pixel inside the polygon:
    base_elevation = interpolated from polygon perimeter elevations
    pixel_elevation = DSM value at that pixel
    height_above_base = pixel_elevation - base_elevation
    if height_above_base > 0:
        volume += height_above_base × pixel_area_m²

pixel_area_m² = GSD² = (0.02m)² = 0.0004 m²
```

Base plane options:
- **Perimeter interpolation** (default): Triangulate base from the lowest points around the polygon edge. Most accurate for stockpiles sitting on uneven ground.
- **Flat plane**: User enters a base elevation. Good for flat sites.
- **Lowest perimeter point**: Simplest — uses the single lowest edge point.

### Tech Stack
| Component | Library | Why |
|---|---|---|
| DSM reading | `rasterio` | Standard Python library for reading GeoTIFF rasters. Reads elevation at any coordinate. |
| Polygon math | `shapely` | Computational geometry. Point-in-polygon tests, area calculation. |
| Base plane | `scipy.interpolate.griddata` | Interpolates base elevation from perimeter points across the polygon interior. |
| Coordinate transform | `rasterio.transform` | Converts between GPS coordinates and pixel coordinates in the GeoTIFF. |

### Accuracy
- At 2cm GSD: each pixel represents 0.0004 m². A 100m² stockpile has 250,000 pixels. Statistical error < 1%.
- Main error source: base plane estimation (±5-10% depending on terrain).
- Industry comparison: Same method as Pix4D, DroneDeploy, and CloudCompare. ASPRS-compliant.

### API
```
POST /api/projects/{id}/volume
Body: {
    "polygon": [[lat1,lng1], [lat2,lng2], ...],
    "base_method": "perimeter" | "flat" | "lowest",
    "base_elevation": 500.0  // only for "flat" method
}
Response: {
    "volume_m3": 1247.5,
    "cut_volume_m3": 0,     // below base
    "fill_volume_m3": 1247.5, // above base
    "area_m2": 856.3,
    "avg_height_m": 1.46,
    "max_height_m": 3.2,
    "base_method": "perimeter",
    "pixel_count": 2140750,
    "gsd_m": 0.02,
    "accuracy_note": "±5-10% based on base plane estimation"
}
```

### UI
- Volume tool button in measurement toolbar (already exists)
- Draw polygon → numbered draggable waypoints (already exists)
- On complete: blue polygon stays on map with volume label
- Right panel shows: volume, area, avg/max height, base method
- Option to switch base method and recalculate

---

## Feature 2: Cut/Fill Analysis

### What It Does
Compares the existing terrain (DSM from drone survey) against a design surface (uploaded by user). Produces a color-coded map showing where earth needs to be removed (cut) or added (fill).

### The Math
```
For each pixel:
    difference = design_elevation - existing_DSM_elevation

    if difference > threshold:   → FILL (need to add earth)
    if difference < -threshold:  → CUT (need to remove earth)
    if abs(difference) <= threshold: → ON GRADE (within tolerance)

threshold = user-configurable (default 0.1m)

Total cut volume = sum of (|negative differences| × pixel_area)
Total fill volume = sum of (positive differences × pixel_area)
Net volume = fill_volume - cut_volume
```

### Design Surface Input
Users need to provide a design surface. Options:
1. **Flat plane** — User enters target elevation (e.g., "grade the site to 505.0m"). Simplest.
2. **Uploaded GeoTIFF** — Architect/engineer exports design surface as a raster. Most accurate.
3. **Slope plane** — User defines a slope (e.g., "2% grade from north to south"). Common for drainage.

### Tech Stack
| Component | Library | Why |
|---|---|---|
| Raster math | `rasterio` + `numpy` | Read both surfaces, subtract, classify. Standard raster algebra. |
| Color mapping | `matplotlib.colors.LinearSegmentedColormap` | Blue→white→red diverging colormap for cut/fill visualization. |
| Output image | `PIL` / `rasterio` | Generate color-coded overlay image for the viewer. |

### Standard Reference
This is textbook civil engineering grading analysis. The exact same calculation is performed by:
- Autodesk Civil 3D (`Volumes Dashboard`)
- Trimble Business Center
- Carlson Software
- QGIS Raster Calculator (`design.tif - existing.tif`)

### API
```
POST /api/projects/{id}/cut-fill
Body: {
    "method": "flat_plane" | "uploaded" | "slope",
    "target_elevation": 505.0,        // for flat_plane
    "slope_pct": 2.0,                 // for slope
    "slope_direction": "north_south", // for slope
    "threshold_m": 0.1,
    "design_file": <uploaded GeoTIFF>  // for uploaded
}
Response: {
    "cut_volume_m3": 4521.3,
    "fill_volume_m3": 2108.7,
    "net_volume_m3": -2412.6,  // negative = net cut
    "cut_area_m2": 12450,
    "fill_area_m2": 8320,
    "on_grade_area_m2": 5230,
    "max_cut_m": 3.4,
    "max_fill_m": 2.1,
    "overlay_url": "/api/projects/{id}/cut-fill/overlay.png",
    "threshold_m": 0.1
}
```

### UI
- "Cut/Fill" button in analysis toolbar
- Modal: select method (flat plane / upload design / slope)
- Processing → color-coded overlay on orthomosaic
- Blue = cut, White = on grade, Red = fill
- Legend with color scale and values
- Right panel: cut/fill/net volumes, areas

---

## Feature 3: Contour Lines

### What It Does
Generates elevation contour lines from the DSM and overlays them on the orthomosaic. Standard topographic map output.

### The Math
```
Marching Squares algorithm:
1. For each cell in the DSM grid (2×2 pixels):
2. Check which corners are above/below the contour elevation
3. Interpolate where the contour line crosses each cell edge
4. Connect the crossing points to form line segments
5. Chain segments into continuous contour polylines
6. Repeat for each contour elevation (e.g., 500m, 501m, 502m...)
```

### Tech Stack
| Component | Library | Why |
|---|---|---|
| Contour generation | `gdal_contour` (GDAL CLI) | One command. Industry standard. Used by every GIS tool on Earth. |
| Alternative | `matplotlib.contour` + `shapely` | Pure Python option if GDAL not available. |
| Output format | GeoJSON or DXF | GeoJSON for web viewer, DXF for CAD software. |

### The Actual Command
```bash
gdal_contour -i 1.0 -a elevation dsm.tif contours.geojson
# -i 1.0 = 1 meter interval
# -a elevation = attribute name for the elevation value
# Output: GeoJSON with LineString features, each with an elevation property
```

That's it. One command. The algorithm has been in GDAL since 1998.

### API
```
POST /api/projects/{id}/contours
Body: {
    "interval_m": 1.0,      // contour interval in meters
    "source": "dsm" | "dtm", // which elevation model
    "smooth": true            // apply line smoothing
}
Response: {
    "geojson_url": "/api/projects/{id}/contours/data.geojson",
    "contour_count": 47,
    "min_elevation": 498.2,
    "max_elevation": 518.7,
    "interval_m": 1.0
}
```

### UI
- "Contours" toggle in the orthomosaic toolbar
- Contour lines drawn on the Leaflet map using L.geoJSON
- Color-coded by elevation (brown/orange gradient)
- Labels at major contours (every 5th line = bold + labeled)
- Configurable interval in right panel

---

## Feature 4: Elevation Profile / Cross-Section

### What It Does
User draws a line on the map. System shows an interactive chart of elevation along that line.

### The Math
```
1. User defines line: point A (lat1, lng1) to point B (lat2, lng2)
2. Sample N points along the line (e.g., every 0.5m)
3. For each sample point:
   - Convert GPS coordinate to pixel coordinate in DSM
   - Read elevation value from DSM at that pixel
4. Plot: X = distance from A (meters), Y = elevation (meters)
```

### Tech Stack
| Component | Library | Why |
|---|---|---|
| DSM sampling | `rasterio.sample()` | Reads elevation at any coordinate from a GeoTIFF. Core rasterio function. |
| Line interpolation | `shapely.LineString.interpolate()` | Generate evenly-spaced points along a line. |
| Frontend chart | `Chart.js` or inline SVG | Interactive elevation chart in the viewer. |

### API
```
POST /api/projects/{id}/elevation-profile
Body: {
    "points": [[lat1,lng1], [lat2,lng2]],  // can be multi-point polyline
    "sample_interval_m": 0.5,
    "source": "dsm" | "dtm"
}
Response: {
    "profile": [
        {"distance_m": 0.0, "elevation_m": 502.3, "lat": 18.561, "lng": 73.698},
        {"distance_m": 0.5, "elevation_m": 502.5, "lat": 18.561, "lng": 73.698},
        ...
    ],
    "total_distance_m": 156.4,
    "min_elevation_m": 498.1,
    "max_elevation_m": 516.2,
    "elevation_gain_m": 18.1,
    "avg_slope_pct": 11.6
}
```

### UI
- "Profile" tool in measurement toolbar
- Click two (or more) points on the map → line drawn
- Bottom panel slides up showing elevation chart
- Hover on chart → crosshair shows on map at that position
- Compare profiles from different survey dates (overlay two lines)

---

## Feature 5: Object Counting (AI)

### What It Does
Automatically detects and counts objects in the orthomosaic. Domain-specific models for common use cases.

### The Method
**YOLOv8** (You Only Look Once, version 8) by Ultralytics.
- Real-time object detection neural network
- Input: image tile (640×640 pixels)
- Output: bounding boxes with class labels and confidence scores

### How It Works for Aerial Images
```
1. Tile the orthomosaic into 640×640 overlapping patches
2. Run YOLOv8 inference on each patch
3. Merge detections across patches (non-max suppression)
4. Map pixel coordinates back to GPS coordinates
5. Return: list of detected objects with locations, counts, confidence
```

### Pre-Trained Models Available
| Object Type | Model Source | Accuracy | Training Data |
|---|---|---|---|
| Trees | DeepForest (open source) | ~85% F1 | NEON aerial tree dataset |
| Vehicles | YOLOv8 + DOTA dataset | ~80% F1 | 188K aerial annotations |
| Solar panels | Custom fine-tune needed | ~90% F1 | 5K labeled panels sufficient |
| Buildings | YOLOv8 + xView dataset | ~75% F1 | Satellite imagery |
| People | YOLOv8 COCO pre-trained | ~70% F1 | Works at low altitude only |

### Tech Stack
| Component | Library | Why |
|---|---|---|
| Detection model | `ultralytics` (YOLOv8) | State-of-the-art, fast, easy to deploy. MIT license. |
| Tree counting | `deepforest` | Pre-trained specifically for aerial tree detection. Published in Methods in Ecology and Evolution. |
| Image tiling | `rasterio` windows | Read orthomosaic in tiles without loading entire image into memory. |
| NMS | `torchvision.ops.nms` | Standard non-maximum suppression for merging overlapping detections. |

### API
```
POST /api/projects/{id}/detect
Body: {
    "object_type": "trees" | "vehicles" | "structures" | "custom",
    "confidence_threshold": 0.5,
    "model": "deepforest" | "yolov8-aerial" | "custom-{model_id}"
}
Response: {
    "total_count": 342,
    "detections": [
        {"class": "tree", "confidence": 0.92, "lat": 18.561, "lng": 73.699, "bbox": [x,y,w,h]},
        ...
    ],
    "processing_time_s": 45,
    "tiles_processed": 156,
    "model_used": "deepforest-v1.4"
}
```

### UI
- "Detect Objects" button in analysis section
- Select object type from dropdown
- Processing overlay with progress
- Results: numbered markers on the map at each detection
- Heatmap option (density of detections)
- Right panel: total count, confidence distribution, export as CSV

### Honest Limitations
- Works well for distinct objects with clear boundaries (trees, vehicles, panels)
- Struggles with overlapping/touching objects
- Accuracy depends on GSD — need <5cm for vehicles, <10cm for trees
- Custom objects need 500-2000 labeled training images

---

## Feature 6: Defect Detection (Specific Types)

### What It Does
Detects specific visual defects on infrastructure: cracks on concrete/asphalt, corrosion on metal, vegetation encroachment.

### The Method
**Semantic segmentation** — pixel-level classification of defect vs non-defect areas.

Two approaches:
1. **U-Net** — encoder-decoder CNN, standard for segmentation. Well-proven for crack detection.
2. **SAM (Segment Anything Model)** — Meta's foundation model. Can segment any object with a point prompt. Good for interactive defect marking.

### Pre-Trained Models Available
| Defect Type | Model | Dataset | Performance |
|---|---|---|---|
| Pavement cracks | CrackForest / DeepCrack | CrackForest-dataset (118 images) | ~85% IoU |
| Road damage | RDD2022 model | Road Damage Dataset 2022 (47K images) | ~75% mAP |
| Corrosion/rust | Fine-tuned ResNet/U-Net | NEU Surface Defect dataset | ~80% accuracy |
| Vegetation encroachment | NDVI thresholding | No ML needed — pure math | >95% accuracy |

### Vegetation Detection (No AI Needed)
```
NDVI = (NIR - Red) / (NIR + Red)
If NDVI > 0.3: vegetation present
If NDVI > 0.6: dense vegetation

For RGB-only images (no NIR):
    Excess Green Index = 2*Green - Red - Blue
    If ExG > threshold: likely vegetation
```
This is standard remote sensing math, published in hundreds of papers since the 1970s.

### Tech Stack
| Component | Library | Why |
|---|---|---|
| Crack detection | `segmentation-models-pytorch` | Pre-built U-Net with various encoders. One-line model creation. |
| Road damage | `ultralytics` YOLOv8-seg | Segmentation variant of YOLO. Pre-trained on RDD2022. |
| SAM | `segment-anything` (Meta) | Interactive segmentation. User clicks a point, model segments the defect. |
| Vegetation | `numpy` | Pure math — NDVI or Excess Green Index calculation on the orthomosaic pixels. |

### API
```
POST /api/projects/{id}/inspect
Body: {
    "type": "cracks" | "corrosion" | "vegetation" | "custom",
    "region": [[lat1,lng1], ...],  // optional - limit to area
    "sensitivity": "high" | "medium" | "low"
}
Response: {
    "defects_found": 23,
    "total_area_affected_m2": 12.4,
    "severity_summary": {
        "critical": 3,
        "major": 8,
        "minor": 12
    },
    "defects": [
        {
            "id": "def-001",
            "type": "crack",
            "severity": "major",
            "length_m": 2.3,
            "width_mm": 5,
            "lat": 18.561,
            "lng": 73.699,
            "confidence": 0.87,
            "thumbnail_url": "/api/defects/def-001/thumb.jpg"
        },
        ...
    ],
    "overlay_url": "/api/projects/{id}/inspect/overlay.png",
    "model_used": "deepcrack-v2"
}
```

### Honest Limitations
- Crack detection works well on concrete/asphalt at <2cm GSD
- Corrosion detection needs high-resolution oblique images, not just nadir
- Generic "find any defect" doesn't work — must be trained per defect type
- SAM helps for interactive use but isn't fully automated

---

## Dependencies to Install

```bash
pip install rasterio shapely gdal ultralytics deepforest segment-anything torch torchvision
```

| Library | Size | Purpose |
|---|---|---|
| rasterio | 20MB | GeoTIFF reading (Features 1-4) |
| shapely | 5MB | Geometry operations (Features 1-2) |
| GDAL | 50MB | Contour generation (Feature 3) |
| ultralytics | 30MB | YOLOv8 object detection (Feature 5) |
| deepforest | 100MB | Tree counting (Feature 5) |
| torch | 800MB | Neural network runtime (Features 5-6) |
| segment-anything | 400MB | SAM model (Feature 6) |

Total: ~1.4GB of dependencies. In production, these run on the cloud worker, not on the user's machine.

---

## Implementation Order

| # | Feature | Effort | Dependencies | Week |
|---|---|---|---|---|
| 1 | **Contour Lines** | 1 day | GDAL (may already be installed via rasterio) | Week 1 |
| 2 | **Elevation Profile** | 2 days | rasterio + Chart.js frontend | Week 1 |
| 3 | **Volume (proper)** | 3 days | rasterio + shapely + scipy | Week 1-2 |
| 4 | **Cut/Fill Analysis** | 3 days | rasterio + numpy + design file upload | Week 2 |
| 5 | **Object Counting** | 5 days | ultralytics + deepforest + tiling pipeline | Week 3 |
| 6 | **Defect Detection** | 5 days | segmentation-models-pytorch or SAM | Week 3-4 |

**Total**: ~4 weeks of engineering.

---

## Success Metrics

| Feature | Metric | Target |
|---|---|---|
| Volume | Accuracy vs CloudCompare | Within ±5% |
| Cut/Fill | Matches Civil 3D output | Within ±5% volume |
| Contours | Matches QGIS gdal_contour | Identical output |
| Elevation Profile | Elevation accuracy | Within ±GSD (2cm) |
| Object Counting | F1 score (trees) | >80% |
| Defect Detection | IoU (cracks) | >75% |

---

*Each feature is built on published methods, open-source libraries, and standard engineering practices. No black boxes.*
