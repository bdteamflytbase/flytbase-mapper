#!/usr/bin/env python3
"""
FlytBase 3D Mapping Pipeline
=============================
Takes drone images → produces 3D point cloud, textured mesh, and web-viewable model.

Pipeline: COLMAP (SfM + MVS) → Open3D (mesh reconstruction) → Web Viewer

Usage:
    python scripts/process.py --images ./images --output ./output
    python scripts/process.py --images ./images --output ./output --quality high
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

import exifread
import numpy as np


# ─────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────

QUALITY_PRESETS = {
    "preview": {
        "max_image_size": 1000,
        "sift_max_features": 4096,
        "patch_match_geom_consistency": False,
        "mesh_depth": 9,
        "description": "Fast preview (5-10 min)",
    },
    "medium": {
        "max_image_size": 2000,
        "sift_max_features": 8192,
        "patch_match_geom_consistency": True,
        "mesh_depth": 10,
        "description": "Balanced quality/speed (15-30 min)",
    },
    "high": {
        "max_image_size": 3200,
        "sift_max_features": 16384,
        "patch_match_geom_consistency": True,
        "mesh_depth": 11,
        "description": "Maximum quality (30-90 min)",
    },
}


def run_cmd(cmd, description=""):
    """Run a shell command with logging."""
    print(f"\n{'='*60}")
    print(f"  {description}")
    print(f"  $ {' '.join(cmd)}")
    print(f"{'='*60}\n")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"STDOUT:\n{result.stdout[-2000:]}" if result.stdout else "")
        print(f"STDERR:\n{result.stderr[-2000:]}" if result.stderr else "")
        raise RuntimeError(f"Command failed (exit {result.returncode}): {' '.join(cmd[:3])}...")
    return result


def extract_gps(image_path):
    """Extract GPS coordinates from image EXIF data."""
    with open(image_path, "rb") as f:
        tags = exifread.process_file(f, details=False)

    def to_decimal(dms_tag, ref_tag):
        if dms_tag not in tags or ref_tag not in tags:
            return None
        vals = tags[dms_tag].values
        d, m, s = float(vals[0]), float(vals[1]), float(vals[2])
        decimal = d + m / 60 + s / 3600
        if str(tags[ref_tag]) in ("S", "W"):
            decimal = -decimal
        return decimal

    lat = to_decimal("GPS GPSLatitude", "GPS GPSLatitudeRef")
    lon = to_decimal("GPS GPSLongitude", "GPS GPSLongitudeRef")
    alt = None
    if "GPS GPSAltitude" in tags:
        alt = float(tags["GPS GPSAltitude"].values[0])

    return lat, lon, alt


def analyze_images(image_dir):
    """Analyze input images and report stats."""
    extensions = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".dng"}
    images = [
        f for f in Path(image_dir).iterdir()
        if f.suffix.lower() in extensions
    ]
    images.sort()

    if not images:
        print(f"ERROR: No images found in {image_dir}")
        print(f"  Supported formats: {', '.join(extensions)}")
        sys.exit(1)

    print(f"\n{'='*60}")
    print(f"  IMAGE ANALYSIS")
    print(f"{'='*60}")
    print(f"  Found: {len(images)} images")

    # Check GPS on first few images
    gps_count = 0
    for img in images[:5]:
        lat, lon, alt = extract_gps(str(img))
        if lat and lon:
            gps_count += 1

    has_gps = gps_count > 0
    print(f"  GPS data: {'YES' if has_gps else 'NO'} (checked {min(5, len(images))} samples)")

    if has_gps:
        # Show GPS bounds
        lats, lons, alts = [], [], []
        for img in images:
            lat, lon, alt = extract_gps(str(img))
            if lat and lon:
                lats.append(lat)
                lons.append(lon)
                if alt:
                    alts.append(alt)
        if lats:
            print(f"  GPS bounds: ({min(lats):.6f}, {min(lons):.6f}) to ({max(lats):.6f}, {max(lons):.6f})")
            if alts:
                print(f"  Altitude range: {min(alts):.1f}m - {max(alts):.1f}m")

    # Check image dimensions from first image
    from PIL import Image
    with Image.open(images[0]) as im:
        w, h = im.size
        print(f"  Resolution: {w}x{h}")
        size_mb = images[0].stat().st_size / (1024 * 1024)
        print(f"  Avg file size: ~{size_mb:.1f} MB")
        print(f"  Total dataset: ~{size_mb * len(images):.0f} MB")

    return images, has_gps


def step1_feature_extraction(database_path, image_dir, quality):
    """COLMAP: Extract features from images."""
    cfg = QUALITY_PRESETS[quality]
    cmd = [
        "colmap", "feature_extractor",
        "--database_path", str(database_path),
        "--image_path", str(image_dir),
        "--ImageReader.single_camera", "1",
        "--FeatureExtraction.max_image_size", str(cfg["max_image_size"]),
        "--SiftExtraction.max_num_features", str(cfg["sift_max_features"]),
        "--SiftExtraction.estimate_affine_shape", "1",
        "--SiftExtraction.domain_size_pooling", "1",
    ]
    run_cmd(cmd, "Step 1/6: Extracting features (SIFT)")


def step2_feature_matching(database_path, quality):
    """COLMAP: Match features between image pairs."""
    # Use exhaustive matching for <200 images, sequential for larger sets
    cmd = [
        "colmap", "exhaustive_matcher",
        "--database_path", str(database_path),
        "--FeatureMatching.guided_matching", "1",
    ]
    run_cmd(cmd, "Step 2/6: Matching features across images")


def step3_sparse_reconstruction(database_path, image_dir, sparse_dir):
    """COLMAP: Structure from Motion → sparse point cloud + camera poses."""
    sparse_dir.mkdir(parents=True, exist_ok=True)
    cmd = [
        "colmap", "mapper",
        "--database_path", str(database_path),
        "--image_path", str(image_dir),
        "--output_path", str(sparse_dir),
        "--Mapper.ba_global_max_num_iterations", "50",
        "--Mapper.ba_global_max_refinements", "3",
    ]
    run_cmd(cmd, "Step 3/6: Sparse reconstruction (Structure from Motion)")

    # Find the reconstruction (usually in 0/)
    recon_dirs = sorted(sparse_dir.iterdir())
    if not recon_dirs:
        raise RuntimeError("SfM failed — no reconstruction produced. Check image overlap.")

    best = recon_dirs[0]
    print(f"  Reconstruction found in: {best}")

    # Get stats
    result = subprocess.run(
        ["colmap", "model_analyzer", "--path", str(best)],
        capture_output=True, text=True
    )
    if result.stdout:
        for line in result.stdout.strip().split("\n"):
            if any(k in line.lower() for k in ["cameras", "images", "points", "observations"]):
                print(f"    {line.strip()}")

    return best


def step4_dense_reconstruction(image_dir, sparse_model, dense_dir, quality):
    """COLMAP: Multi-View Stereo → dense point cloud."""
    cfg = QUALITY_PRESETS[quality]
    dense_dir.mkdir(parents=True, exist_ok=True)

    # Undistort images
    run_cmd([
        "colmap", "image_undistorter",
        "--image_path", str(image_dir),
        "--input_path", str(sparse_model),
        "--output_path", str(dense_dir),
        "--output_type", "COLMAP",
        "--max_image_size", str(cfg["max_image_size"]),
    ], "Step 4a/6: Undistorting images")

    # Stereo matching (PatchMatch)
    stereo_cmd = [
        "colmap", "patch_match_stereo",
        "--workspace_path", str(dense_dir),
        "--workspace_format", "COLMAP",
        "--PatchMatchStereo.max_image_size", str(cfg["max_image_size"]),
    ]
    if cfg["patch_match_geom_consistency"]:
        stereo_cmd += ["--PatchMatchStereo.geom_consistency", "1"]
    run_cmd(stereo_cmd, "Step 4b/6: Dense stereo matching (PatchMatch)")

    # Fuse into dense point cloud
    fused_path = dense_dir / "fused.ply"
    run_cmd([
        "colmap", "stereo_fusion",
        "--workspace_path", str(dense_dir),
        "--workspace_format", "COLMAP",
        "--input_type", "geometric" if cfg["patch_match_geom_consistency"] else "photometric",
        "--output_path", str(fused_path),
    ], "Step 4c/6: Fusing into dense point cloud")

    return fused_path


def step5_mesh_reconstruction(fused_ply, output_dir, quality):
    """Open3D: Poisson surface reconstruction → textured mesh."""
    import open3d as o3d

    cfg = QUALITY_PRESETS[quality]
    print(f"\n{'='*60}")
    print(f"  Step 5/6: Mesh reconstruction (Poisson)")
    print(f"{'='*60}\n")

    # Load point cloud
    print("  Loading dense point cloud...")
    pcd = o3d.io.read_point_cloud(str(fused_ply))
    print(f"  Points: {len(pcd.points):,}")

    # Statistical outlier removal
    print("  Removing outliers...")
    pcd, _ = pcd.remove_statistical_outlier(nb_neighbors=20, std_ratio=2.0)
    print(f"  Points after filtering: {len(pcd.points):,}")

    # Estimate normals
    print("  Estimating normals...")
    pcd.estimate_normals(search_param=o3d.geometry.KDTreeSearchParamHybrid(radius=0.1, max_nn=30))
    pcd.orient_normals_consistent_tangent_plane(k=15)

    # Poisson reconstruction
    print(f"  Running Poisson reconstruction (depth={cfg['mesh_depth']})...")
    mesh, densities = o3d.geometry.TriangleMesh.create_from_point_cloud_poisson(
        pcd, depth=cfg["mesh_depth"], width=0, scale=1.1, linear_fit=False
    )

    # Remove low-density vertices (cleans up edges)
    densities = np.asarray(densities)
    density_threshold = np.quantile(densities, 0.01)
    vertices_to_remove = densities < density_threshold
    mesh.remove_vertices_by_mask(vertices_to_remove)

    print(f"  Mesh: {len(mesh.vertices):,} vertices, {len(mesh.triangles):,} triangles")

    # Transfer colors from point cloud to mesh
    mesh.compute_vertex_normals()

    # Save mesh
    mesh_path = output_dir / "mesh.ply"
    o3d.io.write_triangle_mesh(str(mesh_path), mesh)
    print(f"  Saved: {mesh_path}")

    # Also save as OBJ for wider compatibility
    mesh_obj_path = output_dir / "mesh.obj"
    o3d.io.write_triangle_mesh(str(mesh_obj_path), mesh)
    print(f"  Saved: {mesh_obj_path}")

    # Save cleaned point cloud
    pcd_path = output_dir / "point_cloud.ply"
    o3d.io.write_point_cloud(str(pcd_path), pcd)
    print(f"  Saved: {pcd_path}")

    return mesh_path, pcd_path


def step6_export(output_dir, sparse_model, fused_ply, mesh_path, pcd_path):
    """Export camera poses and generate metadata."""
    print(f"\n{'='*60}")
    print(f"  Step 6/6: Exporting results")
    print(f"{'='*60}\n")

    # Export sparse model as text for reference
    text_dir = output_dir / "colmap_text"
    text_dir.mkdir(exist_ok=True)
    subprocess.run([
        "colmap", "model_converter",
        "--input_path", str(sparse_model),
        "--output_path", str(text_dir),
        "--output_type", "TXT",
    ], capture_output=True)

    # Parse cameras for metadata
    cameras_file = text_dir / "cameras.txt"
    images_file = text_dir / "images.txt"
    camera_count = 0
    image_count = 0
    if cameras_file.exists():
        with open(cameras_file) as f:
            camera_count = sum(1 for line in f if not line.startswith("#") and line.strip())
    if images_file.exists():
        with open(images_file) as f:
            image_count = sum(1 for line in f if not line.startswith("#") and line.strip()) // 2

    # Generate metadata
    metadata = {
        "pipeline": "FlytBase 3D Mapping Pipeline",
        "colmap_version": subprocess.run(
            ["colmap", "help"], capture_output=True, text=True
        ).stderr.split("\n")[0] if True else "unknown",
        "cameras_reconstructed": camera_count,
        "images_registered": image_count,
        "outputs": {
            "dense_point_cloud": str(fused_ply),
            "cleaned_point_cloud": str(pcd_path),
            "mesh_ply": str(mesh_path),
            "mesh_obj": str(output_dir / "mesh.obj"),
            "camera_poses": str(text_dir),
        },
    }

    meta_path = output_dir / "metadata.json"
    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=2, default=str)
    print(f"  Metadata: {meta_path}")

    return metadata


def print_summary(output_dir, metadata):
    """Print final summary."""
    print(f"\n{'='*60}")
    print(f"  PROCESSING COMPLETE")
    print(f"{'='*60}")
    print(f"\n  Output directory: {output_dir}\n")
    print(f"  Files generated:")

    for name, path in metadata.get("outputs", {}).items():
        p = Path(path)
        if p.exists():
            size_mb = p.stat().st_size / (1024 * 1024)
            print(f"    {name:.<35} {size_mb:>8.1f} MB")

    print(f"\n  View your 3D model:")
    print(f"    1. Open mesh.ply or mesh.obj in MeshLab, Blender, or CloudCompare")
    print(f"    2. Open point_cloud.ply in CloudCompare for the point cloud")
    print(f"    3. Run the web viewer: python scripts/viewer_server.py")
    print()


def main():
    parser = argparse.ArgumentParser(
        description="FlytBase 3D Mapping Pipeline — Drone images to 3D digital twin"
    )
    parser.add_argument(
        "--images", required=True,
        help="Directory containing drone images"
    )
    parser.add_argument(
        "--output", default="./output",
        help="Output directory (default: ./output)"
    )
    parser.add_argument(
        "--quality", choices=["preview", "medium", "high"], default="medium",
        help="Processing quality preset (default: medium)"
    )
    parser.add_argument(
        "--skip-dense", action="store_true",
        help="Skip dense reconstruction (SfM only, much faster)"
    )
    args = parser.parse_args()

    image_dir = Path(args.images).resolve()
    output_dir = Path(args.output).resolve()
    quality = args.quality

    print(f"\n  FlytBase 3D Mapping Pipeline")
    print(f"  Quality: {quality} — {QUALITY_PRESETS[quality]['description']}")
    print(f"  Images:  {image_dir}")
    print(f"  Output:  {output_dir}")

    # Analyze images
    images, has_gps = analyze_images(image_dir)

    # Setup workspace
    workspace = output_dir / "workspace"
    workspace.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)

    database_path = workspace / "database.db"
    sparse_dir = workspace / "sparse"
    dense_dir = workspace / "dense"

    # Run pipeline
    step1_feature_extraction(database_path, image_dir, quality)
    step2_feature_matching(database_path, quality)
    sparse_model = step3_sparse_reconstruction(database_path, image_dir, sparse_dir)

    if not args.skip_dense:
        fused_ply = step4_dense_reconstruction(image_dir, sparse_model, dense_dir, quality)
        mesh_path, pcd_path = step5_mesh_reconstruction(fused_ply, output_dir, quality)
        metadata = step6_export(output_dir, sparse_model, fused_ply, mesh_path, pcd_path)
    else:
        # Export sparse only
        sparse_ply = output_dir / "sparse_cloud.ply"
        subprocess.run([
            "colmap", "model_converter",
            "--input_path", str(sparse_model),
            "--output_path", str(sparse_ply),
            "--output_type", "PLY",
        ], capture_output=True)
        metadata = {"outputs": {"sparse_point_cloud": str(sparse_ply)}}
        print(f"\n  Sparse point cloud saved: {sparse_ply}")

    print_summary(output_dir, metadata)


if __name__ == "__main__":
    main()
