"""
Post Processor — converts ODM outputs to web-friendly formats.
- GeoTIFF → COG (Cloud Optimized GeoTIFF) for TiTiler
- Generates JPEG thumbnail from orthomosaic
- Extracts metadata (GSD, bounds, area)
- Returns list of output records for MongoDB + upload
"""
import logging
import math
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from bson import ObjectId
from PIL import Image

logger = logging.getLogger("post_processor")


def _to_cog(src_path: Path, dst_path: Path):
    """Convert GeoTIFF to Cloud Optimized GeoTIFF using rasterio."""
    import rasterio
    from rasterio.shutil import copy as rio_copy

    with rasterio.open(src_path) as src:
        profile = src.profile.copy()
        profile.update({
            "driver": "GTiff",
            "tiled": True,
            "blockxsize": 512,
            "blockysize": 512,
            "compress": "deflate",
            "interleave": "band",
        })
        data = src.read()
        bounds = src.bounds
        transform = src.transform
        crs = src.crs
        width, height = src.width, src.height

    with rasterio.open(dst_path, "w", **profile) as dst:
        dst.write(data)

    # Build overviews (required for COG)
    with rasterio.open(dst_path, "r+") as dst:
        dst.build_overviews([2, 4, 8, 16, 32], rasterio.enums.Resampling.nearest)
        dst.update_tags(ns="rio_overview", resampling="nearest")

    # Rewrite with overviews (true COG)
    rio_copy(dst_path, dst_path.with_suffix(".tmp.tif"), copy_src_overviews=True, driver="GTiff", tiled=True, blockxsize=512, blockysize=512, compress="deflate")
    dst_path.with_suffix(".tmp.tif").rename(dst_path)

    return bounds, transform, width, height


def _extract_metadata(ortho_path: Path) -> dict:
    """Extract GSD, bounds, area from orthomosaic."""
    import rasterio

    try:
        with rasterio.open(ortho_path) as src:
            bounds = src.bounds
            transform = src.transform
            # GSD = pixel size in meters (transform[0] is x size)
            gsd_m = abs(transform[0])
            gsd_cm = round(gsd_m * 100, 2)

            # Area in hectares
            width_m = abs(bounds.right - bounds.left)
            height_m = abs(bounds.top - bounds.bottom)
            area_m2 = width_m * height_m
            area_ha = round(area_m2 / 10000, 4)

            return {
                "gsd_cm": gsd_cm,
                "area_hectares": area_ha,
                "bounds": [bounds.left, bounds.bottom, bounds.right, bounds.top],
                "width": src.width,
                "height": src.height,
            }
    except Exception as e:
        logger.warning(f"Could not extract metadata: {e}")
        return {}


def _make_thumbnail(ortho_path: Path, thumb_path: Path, max_size: int = 800):
    """Generate a JPEG thumbnail from the orthomosaic."""
    import rasterio
    import numpy as np

    try:
        with rasterio.open(ortho_path) as src:
            # Read overview or full image
            scale = min(max_size / src.width, max_size / src.height)
            out_w = max(1, int(src.width * scale))
            out_h = max(1, int(src.height * scale))
            data = src.read(
                out_shape=(min(3, src.count), out_h, out_w),
                resampling=rasterio.enums.Resampling.bilinear,
            )

        # Convert to uint8 RGB
        if data.dtype != np.uint8:
            data = ((data - data.min()) / (data.max() - data.min() + 1e-8) * 255).astype(np.uint8)
        img = Image.fromarray(np.moveaxis(data[:3], 0, -1))
        img.save(thumb_path, "JPEG", quality=85)
        logger.info(f"Thumbnail saved: {thumb_path} ({out_w}x{out_h})")
    except Exception as e:
        logger.error(f"Thumbnail generation failed: {e}")


async def post_process(
    workdir: Path,
    org_id: str,
    project_id: str,
    job_id: str,
    options: dict,
    storage: dict,
) -> list[dict]:
    """
    Process ODM outputs → COG conversion → thumbnail → return output records.
    Returns list of dicts with: type, format, local_path, storage_key, metadata
    """
    prefix = storage.get("prefix", f"{org_id}/{project_id}")
    now = datetime.now(timezone.utc)
    records = []

    # ODM output paths (standard locations)
    ortho_src = workdir / "odm_orthophoto" / "odm_orthophoto.tif"
    mesh_src   = workdir / "odm_texturing" / "odm_textured_model_geo.obj"
    laz_src    = workdir / "odm_georeferencing" / "odm_georeferenced_model.laz"
    dsm_src    = workdir / "odm_dem" / "dsm.tif"
    dtm_src    = workdir / "odm_dem" / "dtm.tif"

    metadata = {}

    # ─── Orthomosaic → COG ────────────────────────────────────────────
    if options.get("orthomosaic", True) and ortho_src.exists():
        cog_path = workdir / "orthomosaic_cog.tif"
        try:
            _to_cog(ortho_src, cog_path)
            metadata = _extract_metadata(cog_path)
            size = cog_path.stat().st_size
            records.append({
                "type": "orthomosaic",
                "format": "tif",
                "local_path": str(cog_path),
                "storage_key": f"{prefix}/orthomosaic_cog.tif",
                "size_bytes": size,
                "metadata": metadata,
                "org_id": org_id,
                "project_id": project_id,
                "job_id": job_id,
                "created_at": now,
            })
            logger.info(f"Orthomosaic COG ready: {size/1e6:.1f} MB")
        except Exception as e:
            logger.error(f"Orthomosaic COG failed: {e}")

    # ─── Thumbnail ────────────────────────────────────────────────────
    if ortho_src.exists() or (records and records[0]["type"] == "orthomosaic"):
        thumb_path = workdir / "thumbnail.jpg"
        src = workdir / "orthomosaic_cog.tif" if (workdir / "orthomosaic_cog.tif").exists() else ortho_src
        _make_thumbnail(src, thumb_path)
        if thumb_path.exists():
            records.append({
                "type": "thumbnail",
                "format": "jpg",
                "local_path": str(thumb_path),
                "storage_key": f"{prefix}/thumbnail.jpg",
                "size_bytes": thumb_path.stat().st_size,
                "metadata": {},
                "org_id": org_id,
                "project_id": project_id,
                "job_id": job_id,
                "created_at": now,
            })

    # ─── 3D Mesh (OBJ + MTL + textures) ──────────────────────────────
    if options.get("mesh", True) and mesh_src.exists():
        # Upload OBJ, MTL, and all texture files
        tex_dir = mesh_src.parent
        records.append({
            "type": "mesh",
            "format": "obj",
            "local_path": str(mesh_src),
            "storage_key": f"{prefix}/mesh.obj",
            "size_bytes": mesh_src.stat().st_size,
            "metadata": {},
            "org_id": org_id,
            "project_id": project_id,
            "job_id": job_id,
            "created_at": now,
            "extra_files": [  # MTL and textures uploaded separately
                {"local_path": str(f), "storage_key": f"{prefix}/{f.name}"}
                for f in tex_dir.glob("*")
                if f.suffix in (".mtl", ".jpg", ".png", ".jpeg") and f.exists()
            ],
        })
        logger.info("Mesh ready")

    # ─── Point Cloud (LAZ) ────────────────────────────────────────────
    if options.get("pointcloud", True) and laz_src.exists():
        records.append({
            "type": "pointcloud",
            "format": "laz",
            "local_path": str(laz_src),
            "storage_key": f"{prefix}/pointcloud.laz",
            "size_bytes": laz_src.stat().st_size,
            "metadata": {"point_count": None},  # LAZ header parsing optional
            "org_id": org_id,
            "project_id": project_id,
            "job_id": job_id,
            "created_at": now,
        })
        logger.info(f"Point cloud ready: {laz_src.stat().st_size/1e6:.1f} MB")

    # ─── DSM → COG ────────────────────────────────────────────────────
    if options.get("dsm", True) and dsm_src.exists():
        dsm_cog = workdir / "dsm_cog.tif"
        try:
            _to_cog(dsm_src, dsm_cog)
            records.append({
                "type": "dsm",
                "format": "tif",
                "local_path": str(dsm_cog),
                "storage_key": f"{prefix}/dsm_cog.tif",
                "size_bytes": dsm_cog.stat().st_size,
                "metadata": metadata,  # Same bounds as ortho
                "org_id": org_id,
                "project_id": project_id,
                "job_id": job_id,
                "created_at": now,
            })
        except Exception as e:
            logger.error(f"DSM COG failed: {e}")

    # ─── DTM → COG ────────────────────────────────────────────────────
    if options.get("dtm", False) and dtm_src.exists():
        dtm_cog = workdir / "dtm_cog.tif"
        try:
            _to_cog(dtm_src, dtm_cog)
            records.append({
                "type": "dtm",
                "format": "tif",
                "local_path": str(dtm_cog),
                "storage_key": f"{prefix}/dtm_cog.tif",
                "size_bytes": dtm_cog.stat().st_size,
                "metadata": metadata,
                "org_id": org_id,
                "project_id": project_id,
                "job_id": job_id,
                "created_at": now,
            })
        except Exception as e:
            logger.error(f"DTM COG failed: {e}")

    logger.info(f"Post-processing done: {len(records)} outputs prepared")
    return records
