"""
MongoDB Motor client — worker writes directly to jobs + outputs + projects collections.
NestJS change stream watches jobs and pushes updates via WebSocket.
"""
import logging
import os
from datetime import datetime, timezone

import motor.motor_asyncio
from bson import ObjectId

logger = logging.getLogger("db")

_client: motor.motor_asyncio.AsyncIOMotorClient = None


def get_db():
    global _client
    if _client is None:
        _client = motor.motor_asyncio.AsyncIOMotorClient(os.environ["MONGODB_URI"])
    return _client["mapper"]


async def update_job(job_id: str, fields: dict):
    """Update job fields. NestJS change stream picks this up → Socket.io push."""
    db = get_db()
    update = {"$set": {**fields, "updated_at": datetime.now(timezone.utc)}}
    if fields.get("status") == "running" or fields.get("stage") == "initializing":
        update["$set"]["started_at"] = datetime.now(timezone.utc)
    if fields.get("status") in ("completed", "failed"):
        update["$set"]["completed_at"] = datetime.now(timezone.utc)

    await db.jobs.update_one({"_id": ObjectId(job_id)}, update)
    logger.debug(f"Job {job_id} updated: {fields.get('stage', '')} {fields.get('progress', '')}%")


async def insert_output(record: dict):
    """Register a processed output in the outputs collection."""
    db = get_db()
    result = await db.outputs.insert_one(record)
    return str(result.inserted_id)


async def update_project_thumbnail(project_id: str, storage: dict, thumbnail_key: str):
    """Set the project thumbnail_url after processing."""
    db = get_db()
    # Build a direct SeaweedFS URL (internal, not presigned — for thumbnail display)
    endpoint = storage.get("endpoint", "").rstrip("/")
    bucket = storage.get("bucket", "mapper")
    url = f"{endpoint}/{bucket}/{thumbnail_key}"
    await db.projects.update_one(
        {"_id": ObjectId(project_id)},
        {"$set": {"thumbnail_url": url, "updated_at": datetime.now(timezone.utc)}},
    )
