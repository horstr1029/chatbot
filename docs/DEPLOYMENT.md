# Deployment Guide

## Updating the Electron desktop app

The desktop app is a standalone Electron wrapper that loads the live web app URL. It does **not** auto-update — you build a new zip and upload it to the server. Users re-download and unzip.

### When to update
- After adding features to the Electron shell itself (tray menu, window behaviour, etc.)
- The web app updates automatically on every deploy — you don't need to re-package just because the web UI changed

### Steps

```powershell
# 1. Make your changes in apps/desktop/main.js (or other desktop files)

# 2. Run the package script — builds, zips, and uploads in one step
.\scripts\package-desktop.ps1

# LAN shortcut (faster upload when in office)
.\scripts\package-desktop.ps1 -Local
```

That script does:
1. Runs `node scripts/generate-icons.js` — regenerates PNG/ICO assets
2. Runs `electron-packager` — builds `apps/desktop/dist/MST Chatbot-win32-x64/`
3. Zips the output to `apps/web/public/downloads/MST-Chatbot-win32-x64.zip`
4. SCPs the zip to `~/company-chatbot/apps/web/.next/standalone/public/downloads/` on the server

The download link in Help → Features tab (`/downloads/MST-Chatbot-win32-x64.zip`) will immediately serve the new version.

### Key files
| File | Purpose |
|---|---|
| `apps/desktop/main.js` | Main process — window, tray, IPC |
| `apps/desktop/preload.js` | Context bridge (keep minimal) |
| `apps/desktop/package.json` | Electron version + build script |
| `apps/desktop/scripts/generate-icons.js` | Generates `resources/tray.png`, `icon.png`, `icon.ico` |
| `apps/desktop/electron-builder.config.js` | Unused (kept for reference) — packager uses CLI flags |
| `scripts/package-desktop.ps1` | One-shot build + upload script |

### Changing the app URL
The default URL is hardcoded as `https://chat.gloworm.org.za` in `apps/desktop/main.js`:
```js
const APP_URL = process.env.APP_URL || 'https://chat.gloworm.org.za'
```
Change the fallback value and re-run `.\scripts\package-desktop.ps1`.

### Replacing the placeholder icon
The current icon is a solid blue square. To use the real logo:
1. Place a square version of the logo as `apps/desktop/resources/icon.png` (256×256)
2. Run `node apps/desktop/scripts/generate-icons.js` — it will regenerate `tray.png` and `icon.ico` from it

> **Note:** `apps/desktop/resources/*.png` and `*.ico` are gitignored — they're generated locally. The `generate-icons.js` script runs automatically via `postinstall`.

---

## Overview

The app runs on a Linux server behind a Cloudflare tunnel. The stack is:
- **PM2** manages the Next.js process (or Docker — see below)
- **Docker Compose** runs Postgres, Redis, Qdrant, n8n, and the Python ingestion service
- **GitHub Actions** runs CI on every push; merging to `main` auto-deploys

---

## Prerequisites

- SSH access to the server (see `CLAUDE.md` for SSH config)
- Docker + Docker Compose installed on the server
- Node.js 20 + pnpm installed on the server
- A `.env.prod` file on the server at `~/company-chatbot/docker/.env.prod`

---

## First-time setup

### 1. Clone the repo

```bash
git clone git@github.com:horstr1029/chatbot.git ~/company-chatbot
cd ~/company-chatbot
```

### 2. Create the production env file

```bash
cp docker/.env.example docker/.env.prod
# Fill in every value — refer to .env.example for the full list
nano docker/.env.prod
```

Key values to set:

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Use `postgresql://chatbot:<pw>@postgres:5432/chatbot` (Docker service name) |
| `REDIS_URL` | `redis://redis:6379` |
| `QDRANT_URL` | `http://qdrant:6333` |
| `SESSION_SECRET` | Min 32-char random string — `openssl rand -hex 32` |
| `ANTHROPIC_API_KEY` | From console.anthropic.com |
| `NEXT_PUBLIC_APP_URL` | `https://chat.gloworm.org.za` |
| `SMTP_*` | SMTP credentials for email |
| `N8N_BASE_URL` | `http://n8n:5678` |

### 3. Start infrastructure

```bash
cd ~/company-chatbot/docker
docker compose -f docker-compose.prod.yml up -d
```

### 4. Run database migrations + seed

```bash
cd ~/company-chatbot/apps/web
npm ci --legacy-peer-deps
DATABASE_URL=$(grep DATABASE_URL ../docker/.env.prod | cut -d= -f2-) \
  npx prisma db push --schema ../../prisma/schema.prisma
npm run db:seed
```

### 5. Build and start with PM2

```bash
cd ~/company-chatbot/apps/web
npm run build
pm2 start ecosystem.config.js
pm2 save
```

---

## Routine deploys

From your local machine (Windows):

```powershell
# Public tunnel
.\scripts\deploy.ps1

# LAN (faster when in office)
.\scripts\deploy.ps1 -Local
```

The deploy script does: `git pull → npm install → prisma db push → npm run build → pm2 restart`.

---

## Docker-based full-stack deploy (prod compose)

To run the web app itself in Docker instead of PM2:

```bash
cd ~/company-chatbot/docker
docker compose -f docker-compose.prod.yml pull   # or build locally
docker compose -f docker-compose.prod.yml up -d
```

The prod compose file (`docker-compose.prod.yml`) pulls pre-built images from GHCR:
- `ghcr.io/horstr1029/chatbot-web:latest`
- `ghcr.io/horstr1029/chatbot-ingestion:latest`

Images are built and pushed by GitHub Actions on every merge to `main`.

---

## Building images locally

```bash
# Web app
cd apps/web
docker build -t chatbot-web .

# Ingestion service
cd services/ingestion
docker build -t chatbot-ingestion .
```

---

## Checking service health

```bash
# PM2 process
pm2 status
pm2 logs chatbot-web --lines 50

# Docker services
docker compose -f docker/docker-compose.prod.yml ps
docker compose -f docker/docker-compose.prod.yml logs web --tail 50

# Health endpoints
curl https://chat.gloworm.org.za/api/health
curl http://localhost:8000/health   # ingestion service
```

---

## Rolling back

```bash
# Find the previous commit
git log --oneline -10

# On the server
git checkout <commit-hash>
npm run build
pm2 restart chatbot-web
```

---

## Environment variable changes

Any change to `.env.prod` requires a PM2 (or Docker) restart — the app reads env vars at startup.

```bash
pm2 restart chatbot-web
# or
docker compose -f docker/docker-compose.prod.yml up -d --force-recreate web
```

---

## Database migrations

Migrations run automatically as part of every deploy (`prisma db push`). For destructive schema changes:

1. Test on a DB dump locally first
2. Take a Postgres backup before deploying: `docker exec chatbot-postgres pg_dump -U chatbot chatbot > backup.sql`
3. Deploy during low-traffic hours

---

## Logs

All services write structured JSON to stdout. On the server:

```bash
# Next.js (PM2)
pm2 logs chatbot-web

# Docker services
docker compose logs -f --tail 100
```

Pipe through `jq` for readable output:

```bash
pm2 logs chatbot-web --raw | jq .
```
