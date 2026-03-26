# Deploying FlytBase Mapper on RunPod

## Step 1: Create Account & Add Credits

1. Go to https://www.runpod.io
2. Sign up / log in
3. Go to **Billing** → Add $49 credits

## Step 2: Create a GPU Pod

1. Go to **Pods** → **+ Deploy**
2. Select **GPU Pod** (not Serverless)
3. Choose GPU:

   **Recommended: RTX A4000 ($0.16/hr) — runs 12+ days on $49**

   Alternative: RTX 3090 ($0.22/hr) if you need more VRAM

4. Template: Select **"RunPod Pytorch 2.1"** (has CUDA + Python pre-installed)
5. Container disk: **20 GB** (for ODM + outputs)
6. Volume disk: **50 GB** (persistent — survives pod restarts)
   - Mount path: `/workspace`
7. Expose ports: **4000** (HTTP)
8. Click **Deploy**

## Step 3: Connect to Your Pod

Once the pod is running (green status):

1. Click **Connect** → **Web Terminal** (or use SSH)
2. You'll get a terminal inside the pod

## Step 4: Run Setup Script

In the pod terminal:

```bash
# Download and run the setup script
curl -fsSL https://raw.githubusercontent.com/bdteamflytbase/flytbase-mapper/main/deploy/runpod-setup.sh | bash
```

Or manually:

```bash
# Clone the repo
git clone https://github.com/bdteamflytbase/flytbase-mapper.git /workspace/flytbase-mapper
cd /workspace/flytbase-mapper

# Install dependencies
pip install -r requirements.txt
pip install rasterio shapely

# Install Docker + ODM
apt-get update && apt-get install -y docker.io gdal-bin
docker pull opendronemap/odm:latest

# Initialize database
python scripts/database.py

# Start the server
python scripts/api.py --port 4000
```

## Step 5: Access Your Mapper

RunPod gives you a proxy URL for exposed ports:

```
https://{POD_ID}-4000.proxy.runpod.net
```

Find this URL in the RunPod dashboard under your pod → **Connect** → **HTTP Service [Port 4000]**

This is your live mapper! Open it in a browser.

## Step 6: Upload & Process

1. Open the dashboard URL in your browser
2. Create a site → Create a project → Upload images
3. Processing will use the **GPU** — 6-8x faster than your Mac
4. 100 images ≈ 8-12 minutes (vs 70 min on M3 Mac)

## Useful Commands

```bash
# Check server status
curl localhost:4000/api/health

# View logs
tail -f /workspace/mapper.log

# Restart server
pkill -f "python scripts/api.py"
python scripts/api.py --port 4000 &

# Pull latest code changes
cd /workspace/flytbase-mapper
git pull
pkill -f "python scripts/api.py"
python scripts/api.py --port 4000 &

# Check Docker / ODM
docker ps
docker logs $(docker ps -q)

# Check GPU
nvidia-smi
```

## Cost Tracking

```bash
# Your pod costs $0.16/hr (A4000)
# $49 budget = 306 hours = 12.7 days continuous

# To save money when not using:
# 1. Go to RunPod dashboard
# 2. Click "Stop" on your pod (data preserved on volume disk)
# 3. Click "Start" when you need it again
# Stopped pods cost $0 (only volume storage: ~$0.10/day)
```

## Connecting to mapper.flytbase.com (Later)

When ready for production:
1. Get a static IP or use RunPod's proxy URL
2. Point `mapper.flytbase.com` CNAME to the RunPod proxy
3. Or deploy to AWS/GCP with the Dockerfile for more control

## Processing Speed: RunPod vs Your Mac

| | Your Mac (M3) | RunPod A4000 | RunPod 3090 |
|---|---|---|---|
| 72 images | ~70 min | ~10 min | ~8 min |
| 286 images | Failed (OOM) | ~30 min | ~25 min |
| 500 images | Won't work | ~50 min | ~40 min |
