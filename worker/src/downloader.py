"""
Image Downloader — fetches drone images from pre-signed URLs (provided in job message).
Uses httpx with concurrency limit to avoid overwhelming the network.
"""
import asyncio
import logging
from pathlib import Path

import httpx

from db import update_job

logger = logging.getLogger("downloader")
MAX_CONCURRENCY = 5  # parallel downloads


async def download_files(files: list[dict], dest_dir: Path, job_id: str):
    """
    Download all files concurrently (up to MAX_CONCURRENCY at once).
    Each file: { file_id, url, name }
    """
    total = len(files)
    completed = 0
    semaphore = asyncio.Semaphore(MAX_CONCURRENCY)

    async def download_one(file: dict):
        nonlocal completed
        async with semaphore:
            url = file["url"]
            name = file["name"]
            dest = dest_dir / name

            async with httpx.AsyncClient(timeout=120, follow_redirects=True) as client:
                async with client.stream("GET", url) as response:
                    response.raise_for_status()
                    with open(dest, "wb") as f:
                        async for chunk in response.aiter_bytes(chunk_size=65536):
                            f.write(chunk)

            completed += 1
            progress = int(completed / total * 10)  # 0–10% for download stage
            await update_job(job_id, {
                "stage": "downloading",
                "progress": progress,
                "message": f"Downloaded {completed}/{total} images",
            })
            logger.info(f"Downloaded {name} ({completed}/{total})")

    await asyncio.gather(*[download_one(f) for f in files])
    logger.info(f"All {total} images downloaded to {dest_dir}")
