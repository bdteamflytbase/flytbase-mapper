#!/bin/bash
# FlytBase Mapper — RunPod Setup Script
# Run this ONCE after creating your RunPod pod.
#
# Usage: bash runpod-setup.sh
#
# Prerequisites:
#   - RunPod pod with Ubuntu + CUDA (use "RunPod Pytorch" template)
#   - At least 16GB GPU VRAM
#   - Port 4000 exposed in pod settings

set -e

echo ""
echo "  FlytBase Mapper — RunPod Setup"
echo "  ==============================="
echo ""

# 1. System dependencies
echo "[1/6] Installing system dependencies..."
apt-get update -qq
apt-get install -y -qq docker.io gdal-bin libgdal-dev git curl > /dev/null 2>&1
echo "  Done."

# 2. Clone the repo
echo "[2/6] Cloning FlytBase Mapper..."
if [ -d "/workspace/flytbase-mapper" ]; then
    cd /workspace/flytbase-mapper
    git pull
else
    git clone https://github.com/bdteamflytbase/flytbase-mapper.git /workspace/flytbase-mapper
    cd /workspace/flytbase-mapper
fi
echo "  Done."

# 3. Python environment
echo "[3/6] Setting up Python environment..."
pip install -q -r requirements.txt
pip install -q rasterio shapely
echo "  Done."

# 4. Pull ODM Docker image
echo "[4/6] Pulling OpenDroneMap (this takes a few minutes first time)..."
docker pull opendronemap/odm:latest
echo "  Done."

# 5. Initialize database
echo "[5/6] Initializing database..."
cd /workspace/flytbase-mapper
python scripts/database.py
echo "  Done."

# 6. Start the server
echo "[6/6] Starting FlytBase Mapper..."
echo ""

# Create a systemd-style runner or just use nohup
nohup python scripts/api.py --port 4000 > /workspace/mapper.log 2>&1 &

echo "  ================================================"
echo "  FlytBase Mapper is running!"
echo ""
echo "  Internal:  http://localhost:4000"
echo "  External:  https://{your-pod-id}-4000.proxy.runpod.net"
echo ""
echo "  API Docs:  https://{your-pod-id}-4000.proxy.runpod.net/api/docs"
echo "  Dashboard: https://{your-pod-id}-4000.proxy.runpod.net/"
echo ""
echo "  Logs: tail -f /workspace/mapper.log"
echo "  ================================================"
echo ""
