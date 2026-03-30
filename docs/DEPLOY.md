# FlytBase Mapper — Deployment Guide

## GPU Machine: 100.76.65.86 (root-deair@100.76.65.86)

---

## Step 1 — SSH Access

```bash
# Verify SSH key is loaded
ssh root-deair@100.76.65.86 "nvidia-smi"
# Expected: GPU info table

# If permission denied, add your key:
ssh-copy-id root-deair@100.76.65.86
```

## Step 2 — Prepare GPU Machine

```bash
ssh root-deair@100.76.65.86

# Create storage directories
mkdir -p /data/mapper/seaweedfs /data/mapper/worker_tmp

# Install Docker (if not already)
which docker || (curl -fsSL https://get.docker.com | sh)

# Pull ODM GPU image (large, ~8GB — do this once)
docker pull opendronemap/odm:latest

# Verify GPU in Docker
docker run --rm --gpus all nvidia/cuda:12.0-base nvidia-smi
```

## Step 3 — Copy Project to GPU Machine

```bash
# From your local machine:
rsync -avz --exclude node_modules --exclude .git --exclude dist \
  /home/rushikesh/mapper-platform/ \
  root-deair@100.76.65.86:/opt/mapper-platform/

# OR clone from git:
ssh root-deair@100.76.65.86 "git clone <repo-url> /opt/mapper-platform"
```

## Step 4 — Configure Environment

```bash
ssh root-deair@100.76.65.86

cd /opt/mapper-platform

# .env already has correct credentials (MongoDB + RabbitMQ)
# Verify the file is present:
cat .env

# If not, create it (copy exact values from local .env)
```

## Step 5 — Install Dependencies & Build

```bash
# On GPU machine
cd /opt/mapper-platform

# Install Node.js 20 (if not present)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install API dependencies
cd apps/api && npm install && cd ../..

# Build React frontend
cd apps/web && npm install && npm run build && cd ../..
# Built output goes to apps/web/dist/ — served by NestJS ServeStaticModule

# Build NestJS API
cd apps/api && npm run build && cd ../..
```

## Step 6 — Start All Services

```bash
cd /opt/mapper-platform

# Create volume directories
mkdir -p /data/mapper/seaweedfs /data/mapper/worker_tmp

# Start all containers
docker compose -f infra/docker-compose.yml up -d

# Check status
docker compose -f infra/docker-compose.yml ps

# View logs
docker compose -f infra/docker-compose.yml logs -f worker
```

## Step 7 — Create SeaweedFS Bucket

```bash
# Wait for SeaweedFS to be healthy, then:
bash infra/seaweedfs/setup.sh

# Verify bucket exists:
docker exec mapper-seaweedfs-1 curl -s http://localhost:8888/
```

## Step 8 — Verify Everything

```bash
# API health
curl http://localhost:3000/api/health

# Open browser (from your laptop, VPN connected to 100.76.65.86):
# http://100.76.65.86:3000

# RabbitMQ queue exists
# (Check CloudAMQP dashboard at cloudamqp.com)

# Worker connected to RabbitMQ:
docker compose -f infra/docker-compose.yml logs worker | grep "Listening on queue"

# GPU in worker:
docker exec mapper-worker-1 docker run --rm --gpus all nvidia/cuda:12.0-base nvidia-smi
```

## Step 9 — Configure the App

1. Open `http://100.76.65.86:3000`
2. Enter your org-id in the OrgSetup screen
3. Go to Settings → configure FlytBase:
   - FlytBase Org ID: `658295f8dbab9efb302183ab` (staging)
   - Service Token: (get from FlytBase org settings → API credentials)
   - API URL: `https://api-stag.flytbase.com`

---

## Updating the App

```bash
ssh root-deair@100.76.65.86
cd /opt/mapper-platform
git pull origin main
cd apps/web && npm run build && cd ../..
cd apps/api && npm run build && cd ../..
docker compose -f infra/docker-compose.yml restart api worker
```

## Troubleshooting

| Problem | Command |
|---|---|
| Worker not picking jobs | `docker compose logs worker` |
| ODM fails | Check `/data/mapper/worker_tmp/mapper_*/` for ODM logs |
| SeaweedFS not accessible | `curl http://localhost:8888/` |
| TiTiler not serving tiles | `docker compose logs titiler` |
| WebSocket not connecting | Check nginx/firewall rules on port 3000 |
| GPU not visible in ODM | Run `docker exec worker docker run --rm --gpus all nvidia/cuda:12.0-base nvidia-smi` |
