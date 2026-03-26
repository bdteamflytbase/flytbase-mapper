#!/bin/bash
# FlytBase WebODM Setup
# Run this after Docker Desktop is installed and running.
#
# Usage: bash scripts/setup_webodm.sh

set -e

echo ""
echo "  FlytBase WebODM Setup"
echo "  ====================="
echo ""

# Check Docker
if ! docker info > /dev/null 2>&1; then
    echo "  ERROR: Docker is not running."
    echo "  Please install and start Docker Desktop first."
    echo "  https://www.docker.com/products/docker-desktop/"
    exit 1
fi

echo "  Docker is running."

# Clone WebODM if not present
WEBODM_DIR="$(dirname "$0")/../webodm"

if [ -d "$WEBODM_DIR" ]; then
    echo "  WebODM directory already exists at $WEBODM_DIR"
else
    echo "  Cloning WebODM..."
    git clone https://github.com/OpenDroneMap/WebODM.git "$WEBODM_DIR"
fi

cd "$WEBODM_DIR"

echo ""
echo "  Starting WebODM (first run downloads ~2GB of containers)..."
echo ""

# Start WebODM
./webodm.sh start

echo ""
echo "  ================================================"
echo "  WebODM is running!"
echo "  Open: http://localhost:8000"
echo "  Default login: admin / admin"
echo "  ================================================"
echo ""
echo "  To process images:"
echo "    1. Open http://localhost:8000"
echo "    2. Create a new project"
echo "    3. Upload your drone images"
echo "    4. Click 'Start Processing'"
echo ""
echo "  To stop: cd webodm && ./webodm.sh stop"
echo ""
