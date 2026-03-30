"""
S3 Uploader — uploads processed outputs to SeaweedFS (S3-compatible).
Also registers each output in MongoDB outputs collection.
"""
import logging
from pathlib import Path

import boto3
from botocore.config import Config

from db import insert_output

logger = logging.getLogger("uploader")


def _get_s3_client(storage: dict):
    return boto3.client(
        "s3",
        endpoint_url=storage["endpoint"],
        aws_access_key_id=storage["access_key"],
        aws_secret_access_key=storage["secret_key"],
        region_name="us-east-1",
        config=Config(signature_version="s3v4"),
    )


async def upload_outputs(records: list[dict], storage: dict):
    """
    Upload each output file to SeaweedFS and register in MongoDB.
    """
    s3 = _get_s3_client(storage)
    bucket = storage["bucket"]

    for record in records:
        local_path = record["local_path"]
        key = record["storage_key"]

        try:
            logger.info(f"Uploading {key} ({Path(local_path).stat().st_size / 1e6:.1f} MB)...")
            s3.upload_file(local_path, bucket, key)
            logger.info(f"Uploaded: {key}")

            # Upload extra files (MTL + textures for mesh)
            for extra in record.get("extra_files", []):
                s3.upload_file(extra["local_path"], bucket, extra["storage_key"])
                logger.info(f"Uploaded extra: {extra['storage_key']}")

            # Register in MongoDB
            db_record = {
                "org_id": record["org_id"],
                "project_id": record["project_id"],
                "job_id": record["job_id"],
                "type": record["type"],
                "format": record["format"],
                "storage_key": key,
                "size_bytes": record["size_bytes"],
                "metadata": record.get("metadata", {}),
                "created_at": record["created_at"],
            }
            await insert_output(db_record)

        except Exception as e:
            logger.error(f"Upload failed for {key}: {e}")
            raise
