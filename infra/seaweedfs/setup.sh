#!/bin/bash
# Run once after SeaweedFS starts to create the mapper bucket.
# Usage: bash infra/seaweedfs/setup.sh

set -e

AWS_ACCESS_KEY_ID=mapper_access_key \
AWS_SECRET_ACCESS_KEY=mapper_secret_key_32chars_here \
aws --endpoint-url http://localhost:8888 \
    --region us-east-1 \
    --no-verify-ssl \
    s3 mb s3://mapper 2>/dev/null || echo "Bucket already exists"

echo "✓ SeaweedFS bucket 'mapper' ready"
