#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
#  deploy.sh
#  Manual deploy script for Linux/Mac.
#  Connects via public hostname by default; pass --local to use LAN IP.
#
#  Usage:
#    ./scripts/deploy.sh              # deploy via public hostname
#    ./scripts/deploy.sh --local      # deploy via LAN (192.168.104.35)
# ─────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Config ──────────────────────────────────────────────────────
REMOTE_USER="horstr"
REMOTE_HOST_PUBLIC="mstssh.gloworm.org.za"
REMOTE_HOST_LOCAL="192.168.104.35"
SSH_KEY="$HOME/.ssh/chatbot_deploy"
PROJECT_DIR="~/company-chatbot"
COMPOSE_FILE="docker/docker-compose.prod.yml"

# ── Parse args ──────────────────────────────────────────────────
USE_LOCAL=false
for arg in "$@"; do
  [[ "$arg" == "--local" ]] && USE_LOCAL=true
done

if $USE_LOCAL; then
  REMOTE_HOST="$REMOTE_HOST_LOCAL"
  echo "🏠  Deploying via local network ($REMOTE_HOST)"
else
  REMOTE_HOST="$REMOTE_HOST_PUBLIC"
  echo "🌐  Deploying via public hostname ($REMOTE_HOST)"
fi

SSH_CMD="ssh -i $SSH_KEY -o StrictHostKeyChecking=accept-new $REMOTE_USER@$REMOTE_HOST"

# ── Helper ──────────────────────────────────────────────────────
run_remote() {
  $SSH_CMD "cd $PROJECT_DIR && $1"
}

# ── Deploy steps ────────────────────────────────────────────────
echo ""
echo "  Company Chatbot — Manual Deploy"
echo "  Target: $REMOTE_USER@$REMOTE_HOST"
echo ""

echo "[1/4] Pulling latest code..."
run_remote "git pull origin main"

echo "[2/4] Pulling latest Docker images..."
run_remote "docker compose -f $COMPOSE_FILE pull"

echo "[3/4] Restarting services..."
run_remote "docker compose -f $COMPOSE_FILE up -d --remove-orphans"

echo "[4/4] Running DB migrations..."
run_remote "docker compose -f $COMPOSE_FILE exec -T web npx prisma migrate deploy" || \
  echo "⚠  Migration step failed — check manually"

echo ""
echo "✓ Deploy complete"
echo ""

echo "Running containers:"
run_remote "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
