# Docker — Backing Services

Runs PostgreSQL, Redis, Qdrant, and n8n via Docker Compose.
The Next.js app and Python ingestion service run separately under PM2.

## Prerequisites

- Docker Engine 24+ with the Compose plugin
- Ports 5432, 6379, 6333, 6334, 5678 free on the host

## Setup

1. Copy the example env file and fill in values:

   ```bash
   cp docker/.env.example docker/.env
   ```

   At minimum set `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`,
   `N8N_BASIC_AUTH_USER`, and `N8N_BASIC_AUTH_PASSWORD`.

2. Start the services:

   ```bash
   docker compose -f docker/docker-compose.yml up -d
   ```

3. Verify all four services are healthy:

   ```bash
   docker compose -f docker/docker-compose.yml ps
   ```

   All entries should show `healthy` in the Status column.

## Service URLs (local)

| Service  | URL / connection                          |
|----------|-------------------------------------------|
| Postgres | `postgresql://localhost:5432/{POSTGRES_DB}` |
| Redis    | `redis://localhost:6379`                  |
| Qdrant   | `http://localhost:6333`                   |
| n8n      | `http://localhost:5678`                   |

## Stopping / resetting

```bash
# Stop (keeps volumes)
docker compose -f docker/docker-compose.yml down

# Stop and wipe all data volumes
docker compose -f docker/docker-compose.yml down -v
```

## Production note

The production compose file (`docker-compose.prod.yml`) additionally runs the
`web` and `ingestion` containers from pre-built images. On the current server
setup those two services are managed by PM2 instead — only the four backing
services above run in Docker.
