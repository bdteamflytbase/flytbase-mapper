# FlytBase Mapper — Deployment Guide

## Quick Start (Local Docker)

```bash
docker compose up --build
# Open http://localhost:4000
```

## Production Deployment (mapper.flytbase.com)

### Step 1: Provision Server

Any cloud VM with Docker. Recommended:
- **AWS**: EC2 t3.xlarge (4 vCPU, 16GB RAM) — ~$120/mo
- **GCP**: e2-standard-4 — ~$100/mo
- **DigitalOcean**: Premium 4vCPU/16GB — ~$96/mo

For GPU processing (faster ODM):
- **AWS**: g4dn.xlarge (NVIDIA T4) — ~$0.52/hr spot
- **GCP**: n1-standard-4 + T4 GPU — ~$0.35/hr preemptible

### Step 2: Install Docker on Server

```bash
# SSH into server
ssh user@your-server-ip

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin
```

### Step 3: Clone and Deploy

```bash
# Clone repo
git clone https://github.com/bdteamflytbase/flytbase-mapper.git /opt/flytbase-mapper
cd /opt/flytbase-mapper

# Pull ODM image (one-time, ~2GB)
docker pull opendronemap/odm:latest

# Start services
docker compose up -d
```

### Step 4: DNS Setup

Add these DNS records for `mapper.flytbase.com`:

| Type | Name | Value |
|---|---|---|
| A | mapper | `<your-server-ip>` |

### Step 5: SSL Certificate

```bash
# First run — get certificate
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d mapper.flytbase.com \
  --email ops@flytbase.com \
  --agree-tos

# Restart nginx to pick up cert
docker compose restart nginx
```

### Step 6: Verify

```bash
curl https://mapper.flytbase.com/api/health
# Should return: {"status": "ok", ...}
```

---

## CI/CD: How Updates Work

```
Developer makes changes locally
       │
       ▼
git add -A
git commit -m "description"
git push origin main
       │
       ▼
GitHub Actions (automatic):
  1. Run tests
  2. Build Docker image
  3. Push to GitHub Container Registry
  4. SSH into server, pull latest, restart
       │
       ▼
mapper.flytbase.com updated (~3-5 min)
```

### GitHub Secrets Required

Set these in repo Settings → Secrets:

| Secret | Value |
|---|---|
| `DEPLOY_HOST` | Server IP address |
| `DEPLOY_USER` | SSH username (e.g., `ubuntu`) |
| `DEPLOY_SSH_KEY` | Private SSH key for server access |

---

## Monitoring

### Health Check
```bash
curl https://mapper.flytbase.com/api/health
```

### Logs
```bash
# On server
docker compose logs -f mapper
docker compose logs -f nginx
```

### Restart
```bash
docker compose restart mapper
```

### Full Rebuild
```bash
docker compose down
docker compose up -d --build
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///mapper.db` | Database connection string |
| `ENVIRONMENT` | `development` | `development` or `production` |
| `PORT` | `4000` | API server port |

For production PostgreSQL:
```
DATABASE_URL=postgresql://user:pass@host:5432/mapper
```
