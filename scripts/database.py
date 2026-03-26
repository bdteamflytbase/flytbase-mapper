"""
FlytBase Mapper — Database Layer
SQLite for local dev, swap to PostgreSQL/Supabase for production.
"""

import json
import uuid
from datetime import datetime
from pathlib import Path

from sqlalchemy import create_engine, Column, String, Integer, Float, Text, DateTime, Enum, ForeignKey, JSON
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

DB_PATH = Path(__file__).resolve().parent.parent / "mapper.db"
engine = create_engine(f"sqlite:///{DB_PATH}", echo=False)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


def gen_id():
    return str(uuid.uuid4())[:8]


class Site(Base):
    __tablename__ = "sites"

    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    latitude = Column(Float)
    longitude = Column(Float)
    altitude = Column(Float)
    boundary_geojson = Column(Text)  # GeoJSON polygon
    thumbnail_url = Column(String)
    tags = Column(JSON, default=list)
    status = Column(String, default="active")  # active, archived
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    projects = relationship("Project", back_populates="site", order_by="Project.captured_at.desc()")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "altitude": self.altitude,
            "thumbnail_url": self.thumbnail_url,
            "tags": self.tags or [],
            "status": self.status,
            "project_count": len(self.projects) if self.projects else 0,
            "latest_project": self.projects[0].to_dict() if self.projects else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=gen_id)
    site_id = Column(String, ForeignKey("sites.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    flight_id = Column(String)  # FlytBase mission ID
    drone_model = Column(String)
    captured_at = Column(DateTime)
    image_count = Column(Integer, default=0)
    image_dir = Column(String)  # local path to images
    output_dir = Column(String)  # local path to outputs
    status = Column(String, default="created")  # created, uploading, processing, completed, failed
    quality = Column(String, default="medium")
    processing_time_s = Column(Integer)
    gsd_cm = Column(Float)  # ground sampling distance
    area_hectares = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

    site = relationship("Site", back_populates="projects")
    outputs = relationship("Output", back_populates="project")
    jobs = relationship("Job", back_populates="project")

    def to_dict(self):
        return {
            "id": self.id,
            "site_id": self.site_id,
            "name": self.name,
            "description": self.description,
            "flight_id": self.flight_id,
            "drone_model": self.drone_model,
            "captured_at": self.captured_at.isoformat() if self.captured_at else None,
            "image_count": self.image_count,
            "status": self.status,
            "quality": self.quality,
            "processing_time_s": self.processing_time_s,
            "gsd_cm": self.gsd_cm,
            "area_hectares": self.area_hectares,
            "output_count": len(self.outputs) if self.outputs else 0,
            "outputs": {o.type: o.to_dict() for o in self.outputs} if self.outputs else {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Output(Base):
    __tablename__ = "outputs"

    id = Column(String, primary_key=True, default=gen_id)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    type = Column(String, nullable=False)  # orthomosaic, mesh, pointcloud, dsm, dtm
    format = Column(String, nullable=False)  # tif, obj, laz, jpg
    storage_path = Column(String)  # local file path
    size_bytes = Column(Integer)
    width = Column(Integer)
    height = Column(Integer)
    metadata_json = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="outputs")

    def to_dict(self):
        return {
            "id": self.id,
            "type": self.type,
            "format": self.format,
            "storage_path": self.storage_path,
            "size_mb": round(self.size_bytes / 1024 / 1024, 1) if self.size_bytes else 0,
            "width": self.width,
            "height": self.height,
            "download_url": f"/api/outputs/{self.id}/download",
        }


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, default=gen_id)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    type = Column(String, nullable=False)  # import, process, export
    status = Column(String, default="queued")  # queued, running, completed, failed
    progress = Column(Integer, default=0)
    message = Column(String, default="")
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    error = Column(Text)

    project = relationship("Project", back_populates="jobs")

    def to_dict(self):
        return {
            "id": self.id,
            "project_id": self.project_id,
            "type": self.type,
            "status": self.status,
            "progress": self.progress,
            "message": self.message,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


class Annotation(Base):
    __tablename__ = "annotations"

    id = Column(String, primary_key=True, default=gen_id)
    site_id = Column(String, ForeignKey("sites.id"), nullable=False)
    project_id = Column(String, ForeignKey("projects.id"))
    latitude = Column(Float)
    longitude = Column(Float)
    type = Column(String, default="note")  # note, measurement, issue, marker
    content = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)


def init_db():
    """Create all tables."""
    Base.metadata.create_all(engine)


def seed_default_data():
    """Seed the database with the existing Pune survey data."""
    session = SessionLocal()

    # Check if already seeded
    if session.query(Site).filter_by(name="Pune Survey Site").first():
        session.close()
        return

    PROJECT_ROOT = Path(__file__).resolve().parent.parent
    ODM_OUT = PROJECT_ROOT / "odm_project"
    OUTPUT = PROJECT_ROOT / "output"

    # Create site
    site = Site(
        id="pune001",
        name="Pune Survey Site",
        description="Aerial survey near Pune, Maharashtra. Agricultural and semi-urban terrain.",
        latitude=18.5620,
        longitude=73.6994,
        altitude=609.0,
        thumbnail_url="/assets/odm_orthophoto.jpg",
        tags=["survey", "agriculture", "pune", "india"],
        status="active",
    )
    session.add(site)

    # Create project
    project = Project(
        id="proj001",
        site_id="pune001",
        name="Initial Survey — March 2, 2026",
        description="72 images captured with DJI Mavic 3D at 609m altitude.",
        flight_id="6b6e18a8-9ccc-4e81-b816-5fa0e15379b9",
        drone_model="DJI Mavic 3D (M3D)",
        captured_at=datetime(2026, 3, 2, 16, 47, 28),
        image_count=72,
        image_dir=str(PROJECT_ROOT / "images"),
        output_dir=str(ODM_OUT),
        status="completed",
        quality="high",
        processing_time_s=4200,
        gsd_cm=2.0,
        area_hectares=3.5,
    )
    session.add(project)

    # Register outputs
    output_files = [
        ("orthomosaic", "tif", ODM_OUT / "odm_orthophoto" / "odm_orthophoto.tif", 14843, 10787),
        ("orthomosaic", "jpg", OUTPUT / "odm_orthophoto.jpg", 14843, 10787),
        ("mesh", "obj", ODM_OUT / "odm_texturing" / "odm_textured_model_geo.obj", None, None),
        ("pointcloud", "laz", ODM_OUT / "odm_georeferencing" / "odm_georeferenced_model.laz", None, None),
        ("dsm", "tif", ODM_OUT / "odm_dem" / "dsm.tif", None, None),
        ("dtm", "tif", ODM_OUT / "odm_dem" / "dtm.tif", None, None),
    ]

    for otype, fmt, path, w, h in output_files:
        if path.exists():
            output = Output(
                project_id="proj001",
                type=otype,
                format=fmt,
                storage_path=str(path),
                size_bytes=path.stat().st_size,
                width=w,
                height=h,
            )
            session.add(output)

    # Create completed job
    job = Job(
        id="job001",
        project_id="proj001",
        type="process",
        status="completed",
        progress=100,
        message="Processing complete",
        started_at=datetime(2026, 3, 25, 22, 0, 0),
        completed_at=datetime(2026, 3, 25, 23, 10, 0),
    )
    session.add(job)

    session.commit()
    session.close()
    print("  Database seeded with Pune survey data.")


if __name__ == "__main__":
    init_db()
    seed_default_data()
    print("  Database initialized at:", DB_PATH)
