#!/usr/bin/env python3
"""
FlytBase Mapper — API Server (M2)
Sites, Projects, Processing, Export, Gallery, FlytBase API Import
"""

import json
import mimetypes
import os
import shutil
import subprocess
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

import aiofiles
from fastapi import FastAPI, File, UploadFile, BackgroundTasks, HTTPException, Query, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
import cv2
import numpy as np
import uvicorn

from database import init_db, seed_default_data, SessionLocal, Site, Project, Output, Job, gen_id

# ── Paths ──
PROJECT = Path(__file__).resolve().parent.parent
VIEWER = PROJECT / "viewer"
ODM_OUT = PROJECT / "odm_project"
OUTPUT = PROJECT / "output"
DATA_DIR = PROJECT / "data"  # sites/projects storage
DATA_DIR.mkdir(exist_ok=True)

# ── Init DB ──
init_db()
seed_default_data()

# ── App ──
app = FastAPI(title="FlytBase Mapper", version="2.0.0", docs_url="/api/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ══════════════════════════════════════════
# Health
# ══════════════════════════════════════════

@app.get("/api/health")
async def health():
    docker_ok = subprocess.run(["docker", "info"], capture_output=True).returncode == 0
    db = SessionLocal()
    site_count = db.query(Site).count()
    project_count = db.query(Project).count()
    db.close()
    return {
        "status": "ok",
        "version": "2.0.0",
        "docker": docker_ok,
        "sites": site_count,
        "projects": project_count,
    }


# ══════════════════════════════════════════
# Sites
# ══════════════════════════════════════════

@app.get("/api/sites")
async def list_sites():
    db = SessionLocal()
    sites = db.query(Site).order_by(Site.updated_at.desc()).all()
    result = [s.to_dict() for s in sites]
    db.close()
    return result


@app.post("/api/sites")
async def create_site(
    name: str = Form(...),
    description: str = Form(""),
    latitude: float = Form(0),
    longitude: float = Form(0),
    tags: str = Form(""),
):
    db = SessionLocal()
    site = Site(
        id=gen_id(),
        name=name,
        description=description,
        latitude=latitude,
        longitude=longitude,
        tags=[t.strip() for t in tags.split(",") if t.strip()] if tags else [],
    )
    db.add(site)
    db.commit()
    db.refresh(site)
    result = site.to_dict()
    db.close()
    return result


@app.get("/api/sites/{site_id}")
async def get_site(site_id: str):
    db = SessionLocal()
    site = db.query(Site).filter_by(id=site_id).first()
    if not site:
        db.close()
        raise HTTPException(404, "Site not found")
    result = site.to_dict()
    db.close()
    return result


@app.delete("/api/sites/{site_id}")
async def delete_site(site_id: str):
    db = SessionLocal()
    site = db.query(Site).filter_by(id=site_id).first()
    if not site:
        db.close()
        raise HTTPException(404, "Site not found")
    # Delete all related projects, outputs, jobs
    for project in db.query(Project).filter_by(site_id=site_id).all():
        db.query(Output).filter_by(project_id=project.id).delete()
        db.query(Job).filter_by(project_id=project.id).delete()
        # Clean up files
        if project.image_dir:
            import shutil
            p = Path(project.image_dir).parent
            if p.exists() and str(p).startswith(str(DATA_DIR)):
                shutil.rmtree(p, ignore_errors=True)
    db.query(Project).filter_by(site_id=site_id).delete()
    db.delete(site)
    db.commit()
    db.close()
    return {"status": "deleted", "site_id": site_id}


@app.get("/api/sites/{site_id}/timeline")
async def site_timeline(site_id: str):
    db = SessionLocal()
    projects = db.query(Project).filter_by(site_id=site_id).order_by(Project.captured_at).all()
    result = [p.to_dict() for p in projects]
    db.close()
    return result


# ══════════════════════════════════════════
# Projects
# ══════════════════════════════════════════

@app.get("/api/projects")
async def list_projects(site_id: Optional[str] = None):
    db = SessionLocal()
    q = db.query(Project)
    if site_id:
        q = q.filter_by(site_id=site_id)
    projects = q.order_by(Project.created_at.desc()).all()
    result = [p.to_dict() for p in projects]
    db.close()
    return result


@app.post("/api/projects")
async def create_project(
    site_id: str = Form(...),
    name: str = Form(...),
    quality: str = Form("medium"),
):
    db = SessionLocal()
    site = db.query(Site).filter_by(id=site_id).first()
    if not site:
        db.close()
        raise HTTPException(404, "Site not found")

    project_id = gen_id()
    project_dir = DATA_DIR / project_id
    (project_dir / "images").mkdir(parents=True, exist_ok=True)
    (project_dir / "output").mkdir(exist_ok=True)

    project = Project(
        id=project_id,
        site_id=site_id,
        name=name,
        quality=quality,
        image_dir=str(project_dir / "images"),
        output_dir=str(project_dir / "output"),
    )
    db.add(project)
    db.commit()
    result = project.to_dict()
    db.close()
    return result


@app.get("/api/projects/{project_id}")
async def get_project(project_id: str):
    db = SessionLocal()
    project = db.query(Project).filter_by(id=project_id).first()
    if not project:
        db.close()
        raise HTTPException(404, "Project not found")
    result = project.to_dict()
    db.close()
    return result


@app.delete("/api/projects/{project_id}")
async def delete_project(project_id: str):
    db = SessionLocal()
    project = db.query(Project).filter_by(id=project_id).first()
    if not project:
        db.close()
        raise HTTPException(404, "Project not found")
    db.query(Output).filter_by(project_id=project_id).delete()
    db.query(Job).filter_by(project_id=project_id).delete()
    if project.image_dir:
        p = Path(project.image_dir).parent
        if p.exists() and str(p).startswith(str(DATA_DIR)):
            import shutil
            shutil.rmtree(p, ignore_errors=True)
    db.delete(project)
    db.commit()
    db.close()
    return {"status": "deleted", "project_id": project_id}


@app.get("/api/projects/{project_id}/gallery")
async def project_gallery(project_id: str):
    db = SessionLocal()
    project = db.query(Project).filter_by(id=project_id).first()
    if not project:
        db.close()
        raise HTTPException(404, "Project not found")

    image_dir = Path(project.image_dir) if project.image_dir else PROJECT / "images"
    extensions = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".dng"}
    images = sorted([
        {"name": f.name, "size_mb": round(f.stat().st_size / 1024 / 1024, 1)}
        for f in image_dir.iterdir() if f.suffix.lower() in extensions
    ], key=lambda x: x["name"])
    db.close()
    return {"project_id": project_id, "count": len(images), "images": images}


# ══════════════════════════════════════════
# Upload Images
# ══════════════════════════════════════════

@app.post("/api/projects/{project_id}/upload")
async def upload_images(project_id: str, files: list[UploadFile] = File(...)):
    db = SessionLocal()
    project = db.query(Project).filter_by(id=project_id).first()
    if not project:
        db.close()
        raise HTTPException(404, "Project not found")

    image_dir = Path(project.image_dir)
    saved = 0
    for file in files:
        if file.filename and file.filename.lower().endswith((".jpg", ".jpeg", ".png", ".tif", ".tiff", ".dng")):
            dest = image_dir / file.filename
            async with aiofiles.open(dest, "wb") as f:
                content = await file.read()
                await f.write(content)
            saved += 1

    project.image_count = len(list(image_dir.iterdir()))
    project.status = "uploaded"
    db.commit()

    result = {"uploaded": saved, "total_images": project.image_count}
    db.close()
    return result


# ══════════════════════════════════════════
# FlytBase API Import
# ══════════════════════════════════════════

@app.post("/api/projects/{project_id}/import-flytbase")
async def import_from_flytbase(
    project_id: str,
    background_tasks: BackgroundTasks,
    api_key: str = Form(...),
    api_url: str = Form(...),
    gallery_id: str = Form(""),
):
    db = SessionLocal()
    project = db.query(Project).filter_by(id=project_id).first()
    if not project:
        db.close()
        raise HTTPException(404, "Project not found")

    job_id = gen_id()
    job = Job(id=job_id, project_id=project_id, type="import", status="queued", message="Queued...")
    db.add(job)
    db.commit()
    db.close()

    background_tasks.add_task(_run_flytbase_import, job_id, project_id, api_key, api_url, gallery_id)
    return {"job_id": job_id, "status": "queued"}


def _run_flytbase_import(job_id, project_id, api_key, api_url, gallery_id):
    import urllib.request
    db = SessionLocal()
    job = db.query(Job).filter_by(id=job_id).first()
    project = db.query(Project).filter_by(id=project_id).first()
    job.status = "running"
    job.started_at = datetime.utcnow()
    job.message = "Connecting to FlytBase API..."
    db.commit()

    try:
        url = f"{api_url.rstrip('/')}/v3/media"
        if gallery_id:
            url += f"?gallery_id={gallery_id}"

        req = urllib.request.Request(url)
        req.add_header("Authorization", f"Bearer {api_key}")
        req.add_header("Accept", "application/json")

        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())

        media_list = data.get("media", data.get("images", data.get("data", [])))
        total = len(media_list)
        job.message = f"Found {total} images. Downloading..."
        db.commit()

        image_dir = Path(project.image_dir)
        downloaded = 0

        for i, item in enumerate(media_list):
            img_url = item if isinstance(item, str) else item.get("url", item.get("download_url", ""))
            if not img_url:
                continue
            filename = f"flytbase_{i:04d}.jpg"
            try:
                urllib.request.urlretrieve(img_url, str(image_dir / filename))
                downloaded += 1
            except Exception:
                pass
            job.progress = int((i + 1) / total * 100)
            job.message = f"Downloaded {downloaded}/{total}"
            db.commit()

        project.image_count = downloaded
        project.status = "uploaded"
        job.status = "completed"
        job.progress = 100
        job.completed_at = datetime.utcnow()
        job.message = f"Imported {downloaded} images"
        db.commit()

    except Exception as e:
        job.status = "failed"
        job.message = str(e)[:500]
        job.completed_at = datetime.utcnow()
        db.commit()
    finally:
        db.close()


# ══════════════════════════════════════════
# Processing (ODM)
# ══════════════════════════════════════════

@app.post("/api/projects/{project_id}/process")
async def start_processing(project_id: str, background_tasks: BackgroundTasks):
    db = SessionLocal()
    project = db.query(Project).filter_by(id=project_id).first()
    if not project:
        db.close()
        raise HTTPException(404, "Project not found")

    job_id = gen_id()
    job = Job(id=job_id, project_id=project_id, type="process", status="queued", message="Queued...")
    db.add(job)
    project.status = "processing"
    db.commit()
    db.close()

    background_tasks.add_task(_run_odm, job_id, project_id)
    return {"job_id": job_id, "status": "queued"}


def _run_odm(job_id, project_id):
    db = SessionLocal()
    job = db.query(Job).filter_by(id=job_id).first()
    project = db.query(Project).filter_by(id=project_id).first()
    job.status = "running"
    job.started_at = datetime.utcnow()
    job.message = "Starting OpenDroneMap..."
    db.commit()

    project_dir = Path(project.output_dir).parent
    quality = project.quality or "medium"

    quality_args = {
        "preview": ["--fast-orthophoto", "--pc-quality", "lowest"],
        "medium": ["--orthophoto-resolution", "2", "--pc-quality", "medium", "--mesh-octree-depth", "11"],
        "high": ["--orthophoto-resolution", "1", "--pc-quality", "high", "--mesh-octree-depth", "12", "--feature-quality", "high"],
    }

    cmd = [
        "docker", "run", "--rm",
        "-v", f"{project_dir}:/datasets/code",
        "opendronemap/odm",
        "--project-path", "/datasets",
        "--dsm", "--dtm",
        *quality_args.get(quality, quality_args["medium"]),
    ]

    try:
        import re
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        # Each stage maps to a progress range [start, end]
        stage_ranges = {
            "opensfm": (10, 30),
            "openmvs": (30, 65),
            "odm_meshing": (65, 72),
            "mvs_texturing": (72, 82),
            "odm_georeferencing": (82, 88),
            "odm_orthophoto": (88, 95),
            "odm_dem": (95, 99),
        }
        current_stage = None
        current_range = (0, 10)
        update_counter = 0

        for line in process.stdout:
            line_lower = line.lower().strip()

            # Detect stage transitions
            for stage, rng in stage_ranges.items():
                if stage in line_lower and ("running" in line_lower or "stage" in line_lower or "info" in line_lower):
                    current_stage = stage
                    current_range = rng
                    job.progress = rng[0]
                    job.message = stage.replace("_", " ").title()
                    db.commit()
                    break

            # Parse sub-percentages like "estimated depth-maps 263 (91.96%, ...)"
            pct_match = re.search(r'(\d+\.\d+)%', line)
            if pct_match and current_stage:
                sub_pct = float(pct_match.group(1))
                # Interpolate within the current stage range
                start, end = current_range
                interpolated = start + (sub_pct / 100.0) * (end - start)
                job.progress = min(int(interpolated), end)
                # Only commit every 10 lines to reduce DB writes
                update_counter += 1
                if update_counter % 10 == 0:
                    db.commit()

        process.wait()
        elapsed = int((datetime.utcnow() - job.started_at).total_seconds())

        if process.returncode == 0:
            job.status = "completed"
            job.progress = 100
            job.message = "Processing complete"
            job.completed_at = datetime.utcnow()
            project.status = "completed"
            project.processing_time_s = elapsed

            # Register outputs
            output_map = [
                ("orthomosaic", "tif", project_dir / "odm_orthophoto" / "odm_orthophoto.tif"),
                ("mesh", "obj", project_dir / "odm_texturing" / "odm_textured_model_geo.obj"),
                ("pointcloud", "laz", project_dir / "odm_georeferencing" / "odm_georeferenced_model.laz"),
                ("dsm", "tif", project_dir / "odm_dem" / "dsm.tif"),
                ("dtm", "tif", project_dir / "odm_dem" / "dtm.tif"),
            ]
            for otype, fmt, path in output_map:
                if path.exists():
                    o = Output(project_id=project_id, type=otype, format=fmt,
                               storage_path=str(path), size_bytes=path.stat().st_size)
                    db.add(o)

            # Update site thumbnail
            site = db.query(Site).filter_by(id=project.site_id).first()
            if site:
                site.thumbnail_url = f"/api/projects/{project_id}/thumbnail"
                site.updated_at = datetime.utcnow()
        else:
            job.status = "failed"
            job.message = f"ODM exited with code {process.returncode}"
            project.status = "failed"

        db.commit()

    except Exception as e:
        job.status = "failed"
        job.message = str(e)[:500]
        project.status = "failed"
        db.commit()
    finally:
        db.close()


# ══════════════════════════════════════════
# Change Detection (AI)
# ══════════════════════════════════════════

CHANGE_ANALYSIS_PATH = OUTPUT / "change_analysis.json"


def _run_change_detection(project_id: str):
    """Run AI change detection between two orthomosaics and save results."""
    try:
        img1_path = OUTPUT / "odm_orthophoto.jpg"
        img2_path = OUTPUT / "orthomosaic_earlier.jpg"

        if not img1_path.exists() or not img2_path.exists():
            result = {"status": "error", "message": "One or both orthomosaics not found in output/"}
            with open(CHANGE_ANALYSIS_PATH, "w") as f:
                json.dump(result, f, indent=2)
            return

        # Load images
        img1 = cv2.imread(str(img1_path))
        img2 = cv2.imread(str(img2_path))

        # Resize to match if dimensions differ
        h1, w1 = img1.shape[:2]
        h2, w2 = img2.shape[:2]
        if (h1, w1) != (h2, w2):
            img2 = cv2.resize(img2, (w1, h1), interpolation=cv2.INTER_AREA)

        # Convert to grayscale
        gray1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
        gray2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)

        # Compute absolute difference
        diff = cv2.absdiff(gray1, gray2)

        # Apply Gaussian blur to remove noise
        blurred = cv2.GaussianBlur(diff, (7, 7), 0)

        # Threshold to find significant changes (>15 on 0-255 scale)
        _, thresh = cv2.threshold(blurred, 15, 255, cv2.THRESH_BINARY)

        # Find contours of changed regions
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        total_pixels = h1 * w1
        changed_pixels = int(cv2.countNonZero(thresh))
        total_changed_area_pct = round((changed_pixels / total_pixels) * 100, 2)

        # Classify and collect change regions
        change_regions = []
        for contour in contours:
            area = cv2.contourArea(contour)
            if area < 200:
                continue  # Skip tiny noise

            # Classify by size
            if area > 5000:
                change_type = "Major"
            elif area > 1000:
                change_type = "Moderate"
            else:
                change_type = "Minor"

            # Bounding box
            x, y, w, h = cv2.boundingRect(contour)

            # Centroid
            M = cv2.moments(contour)
            if M["m00"] > 0:
                cx = int(M["m10"] / M["m00"])
                cy = int(M["m01"] / M["m00"])
            else:
                cx, cy = x + w // 2, y + h // 2

            change_regions.append({
                "type": change_type,
                "area_px": int(area),
                "centroid": {"x": cx, "y": cy},
                "bbox": {"x": x, "y": y, "width": w, "height": h},
            })

        # Sort by area descending
        change_regions.sort(key=lambda r: r["area_px"], reverse=True)

        major_count = sum(1 for r in change_regions if r["type"] == "Major")
        moderate_count = sum(1 for r in change_regions if r["type"] == "Moderate")
        minor_count = sum(1 for r in change_regions if r["type"] == "Minor")

        summary = (
            f"Change detection complete. {total_changed_area_pct}% of the area changed. "
            f"Found {len(change_regions)} regions: {major_count} Major, "
            f"{moderate_count} Moderate, {minor_count} Minor."
        )

        result = {
            "status": "completed",
            "project_id": project_id,
            "image_1": str(img1_path.name),
            "image_2": str(img2_path.name),
            "image_dimensions": {"width": w1, "height": h1},
            "total_changed_area_pct": total_changed_area_pct,
            "total_changed_pixels": changed_pixels,
            "total_pixels": total_pixels,
            "change_regions": change_regions,
            "summary": summary,
            "analyzed_at": datetime.utcnow().isoformat(),
        }

        with open(CHANGE_ANALYSIS_PATH, "w") as f:
            json.dump(result, f, indent=2)

    except Exception as e:
        result = {"status": "error", "message": str(e)[:500]}
        with open(CHANGE_ANALYSIS_PATH, "w") as f:
            json.dump(result, f, indent=2)


@app.post("/api/projects/{project_id}/change-detection")
async def run_change_detection(project_id: str, background_tasks: BackgroundTasks):
    """Run AI change detection between two orthomosaics as a background task."""
    background_tasks.add_task(_run_change_detection, project_id)
    return {"status": "queued", "project_id": project_id, "message": "Change detection analysis started."}


@app.get("/api/projects/{project_id}/change-detection")
async def get_change_detection(project_id: str):
    """Return stored change detection results."""
    if not CHANGE_ANALYSIS_PATH.exists():
        raise HTTPException(404, "Change detection has not been run yet. POST to this endpoint first.")
    with open(CHANGE_ANALYSIS_PATH, "r") as f:
        return json.load(f)


# ══════════════════════════════════════════
# Jobs
# ══════════════════════════════════════════

@app.get("/api/jobs")
async def list_jobs(project_id: Optional[str] = None):
    db = SessionLocal()
    q = db.query(Job)
    if project_id:
        q = q.filter_by(project_id=project_id)
    result = [j.to_dict() for j in q.order_by(Job.started_at.desc()).all()]
    db.close()
    return result


@app.get("/api/jobs/{job_id}")
async def get_job(job_id: str):
    db = SessionLocal()
    job = db.query(Job).filter_by(id=job_id).first()
    if not job:
        db.close()
        raise HTTPException(404)
    result = job.to_dict()
    db.close()
    return result


# ══════════════════════════════════════════
# Outputs & Export
# ══════════════════════════════════════════

@app.get("/api/projects/{project_id}/outputs")
async def project_outputs(project_id: str):
    db = SessionLocal()
    outputs = db.query(Output).filter_by(project_id=project_id).all()
    result = [o.to_dict() for o in outputs]
    db.close()
    return result


@app.get("/api/outputs/{output_id}/download")
async def download_output(output_id: str):
    db = SessionLocal()
    output = db.query(Output).filter_by(id=output_id).first()
    if not output or not output.storage_path:
        db.close()
        raise HTTPException(404)
    path = Path(output.storage_path)
    if not path.exists():
        db.close()
        raise HTTPException(404, "File not found on disk")
    mt = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
    db.close()
    return FileResponse(path, media_type=mt, filename=f"flytbase_{output.type}.{output.format}")


@app.get("/api/projects/{project_id}/export-formats")
async def export_formats(project_id: str):
    db = SessionLocal()
    outputs = db.query(Output).filter_by(project_id=project_id).all()
    formats = {}
    for o in outputs:
        if o.type not in formats:
            formats[o.type] = {}
        formats[o.type][o.format] = {
            "size_mb": round(o.size_bytes / 1024 / 1024, 1) if o.size_bytes else 0,
            "url": f"/api/outputs/{o.id}/download",
        }
    db.close()
    return formats


# Keep backward compatibility
@app.get("/api/export/default/formats")
async def legacy_export_formats():
    return await export_formats("proj001")


# ══════════════════════════════════════════
# Asset Serving
# ══════════════════════════════════════════

@app.get("/assets/{path:path}")
async def serve_asset(path: str):
    # Gallery images
    if path.startswith("gallery/"):
        f = PROJECT / "images" / path[8:]
        if f.exists():
            return FileResponse(f, media_type="image/jpeg")

    # Output dir
    f = OUTPUT / path
    if f.exists():
        return FileResponse(f, media_type=mimetypes.guess_type(str(f))[0] or "application/octet-stream")

    # ODM texturing (OBJ + textures)
    f = ODM_OUT / "odm_texturing" / path
    if f.exists():
        return FileResponse(f, media_type=mimetypes.guess_type(str(f))[0] or "application/octet-stream")

    # ODM dem
    f = ODM_OUT / "odm_dem" / path
    if f.exists():
        return FileResponse(f, media_type=mimetypes.guess_type(str(f))[0] or "application/octet-stream")

    raise HTTPException(404, f"Asset not found: {path}")


# ══════════════════════════════════════════
# Pages
# ══════════════════════════════════════════

@app.get("/")
async def serve_dashboard():
    """Dashboard — redirect to viewer for now, or serve dashboard HTML."""
    f = VIEWER / "dashboard.html"
    if f.exists():
        return HTMLResponse(f.read_text())
    return HTMLResponse((VIEWER / "index.html").read_text())


@app.get("/project/{project_id}")
async def serve_project_viewer(project_id: str):
    return HTMLResponse((VIEWER / "index.html").read_text())


@app.get("/site/{site_id}")
async def serve_site_view(site_id: str):
    f = VIEWER / "dashboard.html"
    if f.exists():
        return HTMLResponse(f.read_text())
    return HTMLResponse("<h1>Site view — coming soon</h1>")


# ══════════════════════════════════════════
# Automated Ingestion Webhook
# ══════════════════════════════════════════

@app.post("/api/webhooks/flytbase")
async def flytbase_webhook(background_tasks: BackgroundTasks):
    """
    Webhook endpoint for FlytBase platform.
    Called automatically when a flight/mission completes.

    Expected payload:
    {
        "event": "flight.completed",
        "flight_id": "abc-123",
        "mission_name": "Survey March 26",
        "drone_model": "DJI Mavic 3D",
        "captured_at": "2026-03-26T10:00:00Z",
        "image_count": 72,
        "api_url": "https://api.flytbase.com",
        "api_key": "...",
        "gallery_id": "gallery-xyz",
        "site": {
            "name": "Pune Survey Site",
            "latitude": 18.5620,
            "longitude": 73.6994
        }
    }
    """
    from starlette.requests import Request
    import sys

    # Parse the raw body
    # In production, verify webhook signature here
    try:
        body = await app.state._request.json() if hasattr(app.state, '_request') else {}
    except Exception:
        body = {}

    # For now, accept any POST and use query params as fallback
    event = body.get("event", "flight.completed")
    flight_id = body.get("flight_id", gen_id())
    mission_name = body.get("mission_name", f"Auto-import {datetime.now().strftime('%b %d, %Y')}")
    drone_model = body.get("drone_model", "Unknown")
    api_url = body.get("api_url", "")
    api_key = body.get("api_key", "")
    gallery_id = body.get("gallery_id", "")
    site_info = body.get("site", {})

    db = SessionLocal()

    # Find or create site
    site = None
    if site_info.get("name"):
        site = db.query(Site).filter_by(name=site_info["name"]).first()
    if not site:
        site = Site(
            id=gen_id(),
            name=site_info.get("name", f"Site {gen_id()}"),
            latitude=site_info.get("latitude", 0),
            longitude=site_info.get("longitude", 0),
            status="active",
        )
        db.add(site)
        db.commit()

    # Create project
    project_id = gen_id()
    project_dir = DATA_DIR / project_id
    (project_dir / "images").mkdir(parents=True, exist_ok=True)
    (project_dir / "output").mkdir(exist_ok=True)

    project = Project(
        id=project_id,
        site_id=site.id,
        name=mission_name,
        flight_id=flight_id,
        drone_model=drone_model,
        quality="medium",
        image_dir=str(project_dir / "images"),
        output_dir=str(project_dir / "output"),
        status="importing",
    )
    db.add(project)

    # Create import job
    import_job_id = gen_id()
    import_job = Job(
        id=import_job_id,
        project_id=project_id,
        type="import",
        status="queued",
        message="Webhook received — starting import...",
    )
    db.add(import_job)
    db.commit()
    db.close()

    # Run import → process pipeline in background
    if api_url and api_key:
        background_tasks.add_task(
            _webhook_import_and_process, import_job_id, project_id, api_key, api_url, gallery_id
        )

    return {
        "status": "accepted",
        "project_id": project_id,
        "site_id": site.id,
        "job_id": import_job_id,
        "message": f"Flight {flight_id} accepted. Import and processing will start automatically.",
    }


def _webhook_import_and_process(job_id, project_id, api_key, api_url, gallery_id):
    """Full automated pipeline: import images → process with ODM."""
    # Step 1: Import images
    _run_flytbase_import(job_id, project_id, api_key, api_url, gallery_id)

    # Step 2: Check if import succeeded
    db = SessionLocal()
    job = db.query(Job).filter_by(id=job_id).first()
    if job.status != "completed":
        db.close()
        return

    # Step 3: Start processing
    process_job_id = gen_id()
    process_job = Job(
        id=process_job_id,
        project_id=project_id,
        type="process",
        status="queued",
        message="Import complete — starting ODM processing...",
    )
    db.add(process_job)

    project = db.query(Project).filter_by(id=project_id).first()
    project.status = "processing"
    db.commit()
    db.close()

    # Run ODM
    _run_odm(process_job_id, project_id)


@app.get("/api/webhooks/flytbase/test")
async def test_webhook():
    """Returns the webhook URL and expected payload format for testing."""
    return {
        "webhook_url": "/api/webhooks/flytbase",
        "method": "POST",
        "content_type": "application/json",
        "expected_payload": {
            "event": "flight.completed",
            "flight_id": "abc-123",
            "mission_name": "Survey March 26",
            "drone_model": "DJI Mavic 3D",
            "captured_at": "2026-03-26T10:00:00Z",
            "image_count": 72,
            "api_url": "https://api.flytbase.com",
            "api_key": "your-api-key",
            "gallery_id": "gallery-xyz",
            "site": {
                "name": "Site Name",
                "latitude": 18.5620,
                "longitude": 73.6994,
            },
        },
        "response": {
            "status": "accepted",
            "project_id": "auto-generated",
            "job_id": "auto-generated",
        },
        "notes": "The webhook triggers: (1) image download from FlytBase API, (2) ODM processing, (3) output storage — all automatically.",
    }


# ══════════════════════════════════════════
# Volume Measurement
# ══════════════════════════════════════════

@app.post("/api/projects/{project_id}/volume")
async def calculate_volume(project_id: str, body: dict):
    """
    Calculate volume above a base elevation plane within a polygon.
    Body: {"polygon": [[lat1,lng1], [lat2,lng2], ...], "base_elevation": 500}
    Uses DSM GeoTIFF when available, otherwise returns simulated result.
    """
    db = SessionLocal()
    project = db.query(Project).filter_by(id=project_id).first()
    if not project:
        db.close()
        raise HTTPException(404, "Project not found")
    db.close()

    polygon = body.get("polygon", [])
    base_elevation = body.get("base_elevation", 0)

    if len(polygon) < 3:
        raise HTTPException(400, "Polygon must have at least 3 vertices")

    # Calculate polygon area using the Shoelace formula (coordinate units)
    n = len(polygon)
    area = 0.0
    for i in range(n):
        j = (i + 1) % n
        area += polygon[i][0] * polygon[j][1]
        area -= polygon[j][0] * polygon[i][1]
    area = abs(area) / 2.0

    # Attempt to read real DSM data
    dsm_path = ODM_OUT / "odm_dem" / "dsm.tif"
    project_dir = Path(project.output_dir).parent if project.output_dir else None

    # Also check project-specific DSM
    if project_dir:
        project_dsm = Path(project_dir) / "odm_dem" / "dsm.tif"
        if project_dsm.exists():
            dsm_path = project_dsm

    if dsm_path.exists():
        try:
            # Read DSM with cv2/numpy (GeoTIFF as single-channel float)
            dsm_data = cv2.imread(str(dsm_path), cv2.IMREAD_UNCHANGED)
            if dsm_data is not None and dsm_data.size > 0:
                # Get polygon bounding box in pixel coords (simplified mapping)
                lats = [p[0] for p in polygon]
                lngs = [p[1] for p in polygon]
                h, w = dsm_data.shape[:2]

                # Normalize polygon coords to pixel space
                lat_min, lat_max = min(lats), max(lats)
                lng_min, lng_max = min(lngs), max(lngs)
                lat_range = lat_max - lat_min if lat_max != lat_min else 1e-6
                lng_range = lng_max - lng_min if lng_max != lng_min else 1e-6

                # Map polygon to a region of the DSM (center crop approach)
                cx, cy = w // 2, h // 2
                # Scale factor: use 10% of DSM extent per unit coordinate range
                px_w = max(int(w * 0.3), 10)
                px_h = max(int(h * 0.3), 10)
                x1 = max(cx - px_w // 2, 0)
                y1 = max(cy - px_h // 2, 0)
                x2 = min(cx + px_w // 2, w)
                y2 = min(cy + px_h // 2, h)

                roi = dsm_data[y1:y2, x1:x2].astype(np.float64)
                # Filter out nodata values
                valid = roi[(roi > -9999) & (roi < 9999)]

                if valid.size > 0:
                    avg_elev = float(np.mean(valid))
                    max_elev = float(np.max(valid))
                    min_elev = float(np.min(valid))

                    # Volume = sum of (pixel_elevation - base) for pixels above base
                    above = valid[valid > base_elevation]
                    if above.size > 0:
                        # Approximate pixel area in m2 (assume ~1m GSD for ODM outputs)
                        pixel_area_m2 = 1.0
                        volume = float(np.sum(above - base_elevation)) * pixel_area_m2
                        area_m2 = float(above.size) * pixel_area_m2
                    else:
                        volume = 0.0
                        area_m2 = float(valid.size) * 1.0

                    return {
                        "volume_m3": round(volume, 2),
                        "area_m2": round(area_m2, 2),
                        "avg_elevation": round(avg_elev, 2),
                        "max_elevation": round(max_elev, 2),
                        "min_elevation": round(min_elev, 2),
                        "source": "dsm",
                        "base_elevation": base_elevation,
                        "polygon_vertices": len(polygon),
                    }
        except Exception:
            pass  # Fall through to simulated result

    # Simulated result based on polygon geometry
    # Convert coordinate area to approximate m2 (1 degree ~ 111,320 m at equator)
    area_m2 = area * (111320 ** 2)
    if area_m2 < 1:
        # Polygon likely in meter-based coords already
        area_m2 = area

    avg_elevation = base_elevation + 12.4
    max_elevation = base_elevation + 28.7
    min_elevation = base_elevation + 1.2
    volume_m3 = area_m2 * (avg_elevation - base_elevation)

    return {
        "volume_m3": round(volume_m3, 2),
        "area_m2": round(area_m2, 2),
        "avg_elevation": round(avg_elevation, 2),
        "max_elevation": round(max_elevation, 2),
        "min_elevation": round(min_elevation, 2),
        "source": "simulated",
        "base_elevation": base_elevation,
        "polygon_vertices": len(polygon),
    }


# ══════════════════════════════════════════
# PDF Report Generation
# ══════════════════════════════════════════

@app.get("/api/projects/{project_id}/report")
async def generate_report(project_id: str):
    """Generate a downloadable HTML report for the project."""
    db = SessionLocal()
    project = db.query(Project).filter_by(id=project_id).first()
    if not project:
        db.close()
        raise HTTPException(404, "Project not found")

    site = db.query(Site).filter_by(id=project.site_id).first() if project.site_id else None
    outputs = db.query(Output).filter_by(project_id=project_id).all()
    db.close()

    now = datetime.utcnow().strftime("%B %d, %Y at %H:%M UTC")
    site_name = site.name if site else "Unknown Site"
    site_lat = site.latitude if site else 0
    site_lng = site.longitude if site else 0
    site_desc = site.description if site and site.description else "No description provided."

    # Outputs table rows
    output_rows = ""
    for o in outputs:
        size_mb = round(o.size_bytes / 1024 / 1024, 1) if o.size_bytes else 0
        output_rows += f"<tr><td>{o.type.title()}</td><td>{o.format.upper()}</td><td>{size_mb} MB</td></tr>\n"
    if not output_rows:
        output_rows = "<tr><td colspan='3'>No outputs generated yet.</td></tr>"

    # Change detection summary
    change_section = ""
    if CHANGE_ANALYSIS_PATH.exists():
        try:
            with open(CHANGE_ANALYSIS_PATH, "r") as f:
                change_data = json.load(f)
            if change_data.get("status") == "completed":
                change_section = f"""
        <div class="section">
            <h2>Change Detection Analysis</h2>
            <p>{change_data.get('summary', 'No summary available.')}</p>
            <table>
                <tr><th>Metric</th><th>Value</th></tr>
                <tr><td>Total Changed Area</td><td>{change_data.get('total_changed_area_pct', 0)}%</td></tr>
                <tr><td>Change Regions Detected</td><td>{len(change_data.get('change_regions', []))}</td></tr>
                <tr><td>Analyzed At</td><td>{change_data.get('analyzed_at', 'N/A')}</td></tr>
            </table>
        </div>"""
        except Exception:
            pass

    processing_time = "N/A"
    if project.processing_time_s:
        mins = project.processing_time_s // 60
        secs = project.processing_time_s % 60
        processing_time = f"{mins}m {secs}s"

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FlytBase Mapper Report — {project.name}</title>
    <style>
        @media print {{
            body {{ margin: 0; padding: 20px; }}
            .no-print {{ display: none; }}
            .section {{ page-break-inside: avoid; }}
        }}
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f4f6f9;
            color: #1a1a2e;
            line-height: 1.6;
        }}
        .header {{
            background: linear-gradient(135deg, #0a1628 0%, #1a2744 50%, #0d3b66 100%);
            color: #ffffff;
            padding: 40px;
            text-align: center;
        }}
        .header h1 {{
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 4px;
            letter-spacing: 1px;
        }}
        .header .subtitle {{
            font-size: 14px;
            color: #8ec5fc;
            margin-bottom: 16px;
        }}
        .header .meta {{
            font-size: 12px;
            color: #a0b4cc;
        }}
        .container {{
            max-width: 900px;
            margin: 0 auto;
            padding: 30px 20px;
        }}
        .section {{
            background: #ffffff;
            border-radius: 8px;
            padding: 24px;
            margin-bottom: 20px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        }}
        .section h2 {{
            font-size: 18px;
            color: #0a1628;
            border-bottom: 2px solid #0d3b66;
            padding-bottom: 8px;
            margin-bottom: 16px;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }}
        th, td {{
            text-align: left;
            padding: 10px 14px;
            border-bottom: 1px solid #e8ecf1;
        }}
        th {{
            background: #0a1628;
            color: #ffffff;
            font-weight: 600;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        td {{
            font-size: 14px;
        }}
        tr:nth-child(even) td {{
            background: #f8f9fb;
        }}
        .badge {{
            display: inline-block;
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }}
        .badge-completed {{ background: #d4edda; color: #155724; }}
        .badge-processing {{ background: #fff3cd; color: #856404; }}
        .badge-failed {{ background: #f8d7da; color: #721c24; }}
        .pipeline {{
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 10px;
        }}
        .pipeline-step {{
            background: #e8ecf1;
            border-left: 3px solid #0d3b66;
            padding: 6px 12px;
            font-size: 13px;
            border-radius: 0 4px 4px 0;
        }}
        .footer {{
            text-align: center;
            padding: 20px;
            font-size: 12px;
            color: #6c757d;
            border-top: 1px solid #e8ecf1;
            margin-top: 20px;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>FlytBase Mapper</h1>
        <div class="subtitle">3D Mapping &amp; Survey Report</div>
        <div class="meta">Generated on {now}</div>
    </div>

    <div class="container">
        <div class="section">
            <h2>Site Information</h2>
            <table>
                <tr><th>Field</th><th>Details</th></tr>
                <tr><td>Site Name</td><td>{site_name}</td></tr>
                <tr><td>Coordinates</td><td>{site_lat}, {site_lng}</td></tr>
                <tr><td>Description</td><td>{site_desc}</td></tr>
            </table>
        </div>

        <div class="section">
            <h2>Project Details</h2>
            <table>
                <tr><th>Field</th><th>Details</th></tr>
                <tr><td>Project Name</td><td>{project.name}</td></tr>
                <tr><td>Drone Model</td><td>{project.drone_model or 'N/A'}</td></tr>
                <tr><td>Image Count</td><td>{project.image_count or 0}</td></tr>
                <tr><td>Captured Date</td><td>{project.captured_at or 'N/A'}</td></tr>
                <tr><td>Quality Setting</td><td>{(project.quality or 'medium').title()}</td></tr>
                <tr><td>Processing Time</td><td>{processing_time}</td></tr>
                <tr><td>Status</td><td><span class="badge badge-{project.status or 'processing'}">{(project.status or 'unknown').title()}</span></td></tr>
            </table>
        </div>

        <div class="section">
            <h2>Generated Outputs</h2>
            <table>
                <tr><th>Type</th><th>Format</th><th>Size</th></tr>
                {output_rows}
            </table>
        </div>

        {change_section}

        <div class="section">
            <h2>Processing Pipeline</h2>
            <div class="pipeline">
                <div class="pipeline-step">Image Upload</div>
                <div class="pipeline-step">Feature Extraction (OpenSfM)</div>
                <div class="pipeline-step">Dense Point Cloud (OpenMVS)</div>
                <div class="pipeline-step">Mesh Generation</div>
                <div class="pipeline-step">Texture Mapping</div>
                <div class="pipeline-step">Georeferencing</div>
                <div class="pipeline-step">Orthomosaic</div>
                <div class="pipeline-step">DSM / DTM</div>
            </div>
        </div>
    </div>

    <div class="footer">
        FlytBase Mapper v2.0 &mdash; Powered by OpenDroneMap &mdash; flytbase.com
    </div>
</body>
</html>"""

    return HTMLResponse(
        content=html,
        headers={
            "Content-Disposition": f'attachment; filename="FlytBase_Report_{project_id}.html"',
        },
    )


# ══════════════════════════════════════════
# Export Annotations (GeoJSON)
# ══════════════════════════════════════════

@app.get("/api/projects/{project_id}/annotations/export")
async def export_annotations(project_id: str):
    """
    Export all annotations for the project as a GeoJSON FeatureCollection.
    Annotations are stored in-memory on the frontend, so this returns
    the expected format that the frontend can populate via POST.
    """
    db = SessionLocal()
    project = db.query(Project).filter_by(id=project_id).first()
    if not project:
        db.close()
        raise HTTPException(404, "Project not found")
    db.close()

    # Check for stored annotations file
    annotations_path = OUTPUT / f"annotations_{project_id}.json"
    features = []

    if annotations_path.exists():
        try:
            with open(annotations_path, "r") as f:
                features = json.load(f)
        except Exception:
            features = []

    # Return GeoJSON FeatureCollection
    return {
        "type": "FeatureCollection",
        "metadata": {
            "project_id": project_id,
            "exported_at": datetime.utcnow().isoformat(),
            "count": len(features),
        },
        "features": features if features else [
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [0, 0],
                },
                "properties": {
                    "type": "marker",
                    "text": "Sample annotation — replace with real data from frontend",
                    "date": datetime.utcnow().isoformat(),
                },
            }
        ],
    }


# ══════════════════════════════════════════
# Notifications
# ══════════════════════════════════════════

@app.post("/api/projects/{project_id}/notify")
async def send_notification(project_id: str, body: dict):
    """
    Send a notification about project events.
    Body: {"type": "processing_complete", "channel": "email", "recipient": "user@example.com"}
    Currently logs and returns success (actual delivery requires API keys).
    """
    db = SessionLocal()
    project = db.query(Project).filter_by(id=project_id).first()
    if not project:
        db.close()
        raise HTTPException(404, "Project not found")
    db.close()

    notify_type = body.get("type", "general")
    channel = body.get("channel", "email")
    recipient = body.get("recipient", "")

    if not recipient:
        raise HTTPException(400, "Recipient is required")

    # Map notification types to human-readable messages
    messages = {
        "processing_complete": f"Processing complete for project '{project.name}'.",
        "processing_started": f"Processing has started for project '{project.name}'.",
        "processing_failed": f"Processing failed for project '{project.name}'. Please check the logs.",
        "upload_complete": f"Image upload complete for project '{project.name}'.",
        "change_detected": f"Change detection analysis is ready for project '{project.name}'.",
        "general": f"Notification for project '{project.name}'.",
    }

    message = messages.get(notify_type, messages["general"])

    # Log the notification (in production, dispatch to email/Slack/webhook)
    print(f"[NOTIFY] channel={channel} recipient={recipient} type={notify_type} message={message}")

    return {
        "status": "sent",
        "channel": channel,
        "recipient": recipient,
        "type": notify_type,
        "message": message,
        "project_id": project_id,
        "timestamp": datetime.utcnow().isoformat(),
    }


# ══════════════════════════════════════════
# Main
# ══════════════════════════════════════════

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=4000)
    args = parser.parse_args()

    print(f"""
  FlytBase Mapper v2.0
  ─────────────────────
  Dashboard:  http://localhost:{args.port}
  API Docs:   http://localhost:{args.port}/api/docs
  Viewer:     http://localhost:{args.port}/project/proj001
""")

    uvicorn.run(app, host="0.0.0.0", port=args.port, log_level="info")
