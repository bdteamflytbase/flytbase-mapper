"""
Job Handler — orchestrates all pipeline stages for a single job.
"""
import asyncio
import logging
import os
import shutil
import tempfile
import traceback
from pathlib import Path

from db import update_job, update_project_thumbnail
from downloader import download_files
from odm_runner import run_odm
from post_processor import post_process
from uploader import upload_outputs

logger = logging.getLogger("handler")


async def handle_job(payload: dict):
    job_id = payload["job_id"]
    project_id = payload["project_id"]
    org_id = payload["org_id"]
    quality = payload.get("quality", "medium")
    options = payload.get("options", {})
    files = payload.get("files", [])
    storage = payload.get("storage", {})

    workdir = Path(tempfile.mkdtemp(prefix=f"mapper_{job_id}_"))
    images_dir = workdir / "images"
    images_dir.mkdir()

    try:
        # ─── Stage 0: Init ────────────────────────────────────────────
        await update_job(job_id, {
            "status": "downloading",
            "stage": "initializing",
            "progress": 0,
            "message": f"Starting job for {len(files)} images",
        })

        # ─── Stage 1: Download images ─────────────────────────────────
        await download_files(files, images_dir, job_id)

        # ─── Stage 2: ODM processing ──────────────────────────────────
        await update_job(job_id, {"status": "processing", "stage": "opensfm", "progress": 10})
        await run_odm(workdir, quality, options, job_id)

        # ─── Stage 3: Post-process + upload ───────────────────────────
        await update_job(job_id, {"stage": "uploading", "progress": 99, "message": "Uploading outputs..."})
        output_records = await post_process(workdir, org_id, project_id, job_id, options, storage)
        await upload_outputs(output_records, storage)

        # ─── Done ──────────────────────────────────────────────────────
        await update_job(job_id, {
            "status": "completed",
            "progress": 100,
            "stage": "done",
            "message": "Processing complete",
        })

        # Update project thumbnail
        thumbnail = next((r for r in output_records if r["type"] == "thumbnail"), None)
        if thumbnail:
            await update_project_thumbnail(project_id, storage, thumbnail["local_path"])

        logger.info(f"Job {job_id} completed successfully")

    except Exception as e:
        err = traceback.format_exc()
        logger.error(f"Job {job_id} failed:\n{err}")
        await update_job(job_id, {
            "status": "failed",
            "message": str(e),
            "error": err[:2000],
        })
    finally:
        shutil.rmtree(workdir, ignore_errors=True)
        logger.info(f"Cleaned up workdir for job {job_id}")
