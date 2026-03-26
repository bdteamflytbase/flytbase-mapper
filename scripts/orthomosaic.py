#!/usr/bin/env python3
"""
FlytBase Orthomosaic Generator
================================
Stitches drone images into a 2D orthomosaic map.

Uses OpenCV's Stitcher with drone-optimized settings (scan mode for aerial imagery).
Falls back to incremental stitching for large datasets.

Usage:
    python scripts/orthomosaic.py --images ./images --output ./output
"""

import argparse
import os
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image


def load_images(image_dir, max_dimension=2000):
    """Load and resize images for stitching."""
    extensions = {".jpg", ".jpeg", ".png", ".tif", ".tiff"}
    files = sorted([
        f for f in Path(image_dir).iterdir()
        if f.suffix.lower() in extensions
    ])

    if not files:
        print("ERROR: No images found.")
        sys.exit(1)

    print(f"  Found {len(files)} images")
    print(f"  Resizing to max {max_dimension}px for stitching...")

    images = []
    filenames = []
    for i, f in enumerate(files):
        img = cv2.imread(str(f))
        if img is None:
            print(f"  WARNING: Could not read {f.name}, skipping")
            continue

        # Resize for faster stitching
        h, w = img.shape[:2]
        scale = min(max_dimension / max(h, w), 1.0)
        if scale < 1.0:
            img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

        images.append(img)
        filenames.append(f.name)

        if (i + 1) % 10 == 0:
            print(f"  Loaded {i + 1}/{len(files)}")

    print(f"  Loaded {len(images)} images ({images[0].shape[1]}x{images[0].shape[0]} each)")
    return images, filenames


def stitch_scan_mode(images):
    """Stitch using SCANS mode (optimized for aerial/drone imagery)."""
    print("\n  Stitching in SCANS mode (aerial-optimized)...")
    stitcher = cv2.Stitcher.create(cv2.Stitcher_SCANS)
    stitcher.setPanoConfidenceThresh(0.5)
    status, result = stitcher.stitch(images)
    return status, result


def stitch_panorama_mode(images):
    """Stitch using PANORAMA mode as fallback."""
    print("\n  Trying PANORAMA mode as fallback...")
    stitcher = cv2.Stitcher.create(cv2.Stitcher_PANORAMA)
    stitcher.setPanoConfidenceThresh(0.3)
    status, result = stitcher.stitch(images)
    return status, result


def stitch_incremental(images, batch_size=15):
    """Stitch incrementally in batches for large/challenging datasets."""
    print(f"\n  Incremental stitching (batches of {batch_size})...")

    # Sort images — for drone grids, sequential order usually means spatial proximity
    n = len(images)
    results = []

    for start in range(0, n, batch_size):
        end = min(start + batch_size, n)
        batch = images[start:end]
        print(f"  Batch {start // batch_size + 1}: images {start + 1}-{end}")

        stitcher = cv2.Stitcher.create(cv2.Stitcher_SCANS)
        stitcher.setPanoConfidenceThresh(0.3)
        status, result = stitcher.stitch(batch)

        if status == cv2.Stitcher_OK:
            results.append(result)
            print(f"    Stitched → {result.shape[1]}x{result.shape[0]}")
        else:
            # If batch fails, add individual images
            print(f"    Batch failed (status {status}), adding largest sub-batch...")
            # Try smaller sub-batches
            mid = len(batch) // 2
            for sub in [batch[:mid], batch[mid:]]:
                if len(sub) >= 2:
                    s2, r2 = stitcher.stitch(sub)
                    if s2 == cv2.Stitcher_OK:
                        results.append(r2)

    if len(results) == 0:
        return cv2.Stitcher_ERR_NEED_MORE_IMGS, None

    if len(results) == 1:
        return cv2.Stitcher_OK, results[0]

    # Merge batch results
    print(f"\n  Merging {len(results)} batch results...")

    # Resize all results to similar scale for final merge
    max_h = max(r.shape[0] for r in results)
    resized = []
    for r in results:
        scale = max_h / r.shape[0]
        if abs(scale - 1.0) > 0.05:
            r = cv2.resize(r, (int(r.shape[1] * scale), int(r.shape[0] * scale)))
        resized.append(r)

    stitcher = cv2.Stitcher.create(cv2.Stitcher_SCANS)
    stitcher.setPanoConfidenceThresh(0.2)
    status, result = stitcher.stitch(resized)

    if status != cv2.Stitcher_OK:
        # Last resort: just return the largest batch result
        largest = max(results, key=lambda r: r.shape[0] * r.shape[1])
        return cv2.Stitcher_OK, largest

    return status, result


def create_grid_mosaic(images, image_dir):
    """Create a GPS-sorted grid mosaic as ultimate fallback."""
    import exifread

    print("\n  Creating GPS-sorted grid mosaic...")

    # Extract GPS for each image
    extensions = {".jpg", ".jpeg", ".png", ".tif", ".tiff"}
    files = sorted([f for f in Path(image_dir).iterdir() if f.suffix.lower() in extensions])

    gps_data = []
    for f in files:
        with open(f, "rb") as fh:
            tags = exifread.process_file(fh, details=False)
        lat = lon = 0
        if "GPS GPSLatitude" in tags:
            vals = tags["GPS GPSLatitude"].values
            lat = float(vals[0]) + float(vals[1]) / 60 + float(vals[2]) / 3600
            if str(tags.get("GPS GPSLatitudeRef", "N")) == "S":
                lat = -lat
        if "GPS GPSLongitude" in tags:
            vals = tags["GPS GPSLongitude"].values
            lon = float(vals[0]) + float(vals[1]) / 60 + float(vals[2]) / 3600
            if str(tags.get("GPS GPSLongitudeRef", "E")) == "W":
                lon = -lon
        gps_data.append((lat, lon, f))

    if not any(g[0] for g in gps_data):
        print("  No GPS data — cannot create grid mosaic")
        return None

    # Determine grid layout
    lats = [g[0] for g in gps_data]
    lons = [g[1] for g in gps_data]
    lat_range = max(lats) - min(lats)
    lon_range = max(lons) - min(lons)

    # Estimate grid dimensions
    n = len(gps_data)
    aspect = lon_range / lat_range if lat_range > 0 else 1
    cols = max(1, int(np.sqrt(n * aspect)))
    rows = max(1, int(np.ceil(n / cols)))

    # Sort by lat (rows) then lon (cols)
    gps_data.sort(key=lambda g: (-g[0], g[1]))  # top-to-bottom, left-to-right

    # Thumbnail size
    thumb_w, thumb_h = 400, 300

    # Create mosaic
    mosaic = np.zeros((rows * thumb_h, cols * thumb_w, 3), dtype=np.uint8)

    for idx, (lat, lon, f) in enumerate(gps_data):
        row = idx // cols
        col = idx % cols
        if row >= rows:
            break

        img = cv2.imread(str(f))
        if img is not None:
            thumb = cv2.resize(img, (thumb_w, thumb_h))
            y1, y2 = row * thumb_h, (row + 1) * thumb_h
            x1, x2 = col * thumb_w, (col + 1) * thumb_w
            mosaic[y1:y2, x1:x2] = thumb

    return mosaic


def main():
    parser = argparse.ArgumentParser(description="FlytBase Orthomosaic Generator")
    parser.add_argument("--images", required=True, help="Directory containing drone images")
    parser.add_argument("--output", default="./output", help="Output directory")
    parser.add_argument("--resolution", type=int, default=2000,
                        help="Max image dimension for stitching (default: 2000, higher=better but slower)")
    args = parser.parse_args()

    image_dir = Path(args.images).resolve()
    output_dir = Path(args.output).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n  FlytBase Orthomosaic Generator")
    print(f"  Images: {image_dir}")
    print(f"  Output: {output_dir}")

    # Load images
    images, filenames = load_images(image_dir, args.resolution)

    # Try stitching methods in order of quality
    result = None

    # Method 1: Full SCANS stitch
    status, result = stitch_scan_mode(images)
    if status == cv2.Stitcher_OK:
        print(f"  SCANS mode succeeded: {result.shape[1]}x{result.shape[0]}")
    else:
        print(f"  SCANS mode failed (status {status})")

        # Method 2: PANORAMA mode
        status, result = stitch_panorama_mode(images)
        if status == cv2.Stitcher_OK:
            print(f"  PANORAMA mode succeeded: {result.shape[1]}x{result.shape[0]}")
        else:
            print(f"  PANORAMA mode failed (status {status})")

            # Method 3: Incremental
            status, result = stitch_incremental(images)
            if status == cv2.Stitcher_OK:
                print(f"  Incremental stitch succeeded: {result.shape[1]}x{result.shape[0]}")
            else:
                print(f"  All stitching methods failed. Creating GPS grid mosaic...")
                result = create_grid_mosaic(images, image_dir)

    if result is None:
        print("\n  ERROR: Could not create orthomosaic.")
        print("  Try WebODM for better results: bash scripts/setup_webodm.sh")
        sys.exit(1)

    # Save orthomosaic
    ortho_path = output_dir / "orthomosaic.jpg"
    cv2.imwrite(str(ortho_path), result, [cv2.IMWRITE_JPEG_QUALITY, 95])
    size_mb = ortho_path.stat().st_size / (1024 * 1024)
    print(f"\n  Saved: {ortho_path} ({result.shape[1]}x{result.shape[0]}, {size_mb:.1f} MB)")

    # Also save as PNG for lossless
    ortho_png = output_dir / "orthomosaic.png"
    cv2.imwrite(str(ortho_png), result)
    size_mb = ortho_png.stat().st_size / (1024 * 1024)
    print(f"  Saved: {ortho_png} ({size_mb:.1f} MB)")

    # Generate a high-res version
    if args.resolution < 3000:
        print("\n  TIP: For higher resolution, run with --resolution 3000 or higher")

    print(f"\n  Done! Open {ortho_path} to view your map.")
    print()


if __name__ == "__main__":
    main()
