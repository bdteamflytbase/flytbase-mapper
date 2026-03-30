"""
ODM Runner — invokes OpenDroneMap as a child Docker container (Docker-in-Docker).
Parses stdout for stage names to report progress to MongoDB.
"""
import asyncio
import logging
import re
from pathlib import Path

from db import update_job

logger = logging.getLogger("odm_runner")

# Stage → (progress_start, progress_end)
STAGE_RANGES = {
    "opensfm":            (10, 30),
    "openmvs":            (30, 65),
    "odm_meshing":        (65, 72),
    "mvs_texturing":      (72, 82),
    "odm_georeferencing": (82, 88),
    "odm_orthophoto":     (88, 95),
    "odm_dem":            (95, 99),
}

QUALITY_PRESETS = {
    "preview": {
        "feature_quality": "lowest",
        "pc_quality": "lowest",
        "mesh_octree_depth": "9",
        "orthophoto_resolution": "5",
    },
    "medium": {
        "feature_quality": "medium",
        "pc_quality": "medium",
        "mesh_octree_depth": "10",
        "orthophoto_resolution": "2",
    },
    "high": {
        "feature_quality": "high",
        "pc_quality": "high",
        "mesh_octree_depth": "11",
        "orthophoto_resolution": "1",
    },
}


async def run_odm(workdir: Path, quality: str, options: dict, job_id: str):
    preset = QUALITY_PRESETS.get(quality, QUALITY_PRESETS["medium"])

    cmd = [
        "docker", "run", "--rm",
        "--gpus", "all",
        "-v", f"{workdir}:/datasets/code",
        "opendronemap/odm:latest",
        "--project-path", "/datasets",
        "--feature-quality", preset["feature_quality"],
        "--pc-quality", preset["pc_quality"],
        "--mesh-octree-depth", preset["mesh_octree_depth"],
        "--orthophoto-resolution", preset["orthophoto_resolution"],
        # NOTE: --max-image-size and --use-gpu removed — not valid in ODM 3.6+
        # GPU is used by default; use --no-gpu to disable.
    ]

    if options.get("dsm", True):
        cmd.append("--dsm")
    if options.get("dtm", False):
        cmd.append("--dtm")
    if not options.get("mesh", True):
        cmd.extend(["--skip-3dmodel"])
    if not options.get("pointcloud", True):
        cmd.extend(["--fast-orthophoto"])

    logger.info(f"Running ODM: {' '.join(cmd)}")

    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )

    current_stage = "opensfm"
    current_progress = 10

    async for line_bytes in process.stdout:
        line = line_bytes.decode(errors="replace").strip()
        if line:
            logger.debug(f"ODM: {line}")

        line_lower = line.lower()
        for stage, (start, end) in STAGE_RANGES.items():
            if stage in line_lower or stage.replace("_", " ") in line_lower:
                if current_stage != stage:
                    current_stage = stage
                    current_progress = start
                    await update_job(job_id, {
                        "stage": stage,
                        "progress": start,
                        "message": line[:200],
                    })
                    logger.info(f"ODM stage: {stage} ({start}%)")
                break

    await process.wait()
    if process.returncode != 0:
        raise RuntimeError(f"ODM exited with code {process.returncode}")

    logger.info("ODM processing complete")
