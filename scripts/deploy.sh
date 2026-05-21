#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
#  deploy.sh  —  Company Chatbot deploy script
#
#  Usage:
#    ./scripts/deploy.sh              # deploy via public cloudflared tunnel
#    ./scripts/deploy.sh --local      # deploy via LAN (192.168.104.35)
# ─────────────────────────────────────────────────────────────────

set -euo pipefail

REMOTE_USER="horstr"
REMOTE_HOST_PUBLIC="mstssh.gloworm.org.za"
REMOTE_HOST_LOCAL="192.168.104.35"
SSH_KEY="$HOME/.ssh/chatbot_deploy"
PROJECT_DIR="/home/horstr/company-chatbot"
APP_DIR="$PROJECT_DIR/apps/web"
DB_URL="postgresql://chatbot:chatbot@localhost:5432/chatbot"

USE_LOCAL=false
for arg in "$@"; do [[ "$arg" == "--local" ]] && USE_LOCAL=true; done

if $USE_LOCAL; then
  REMOTE_HOST="$REMOTE_HOST_LOCAL"
  echo "Deploying via LAN ($REMOTE_HOST)"
else
  REMOTE_HOST="$REMOTE_HOST_PUBLIC"
  echo "Deploying via public tunnel ($REMOTE_HOST)"
fi

SSH="ssh -i $SSH_KEY -o StrictHostKeyChecking=accept-new $REMOTE_USER@$REMOTE_HOST"

remote() { $SSH "cd $PROJECT_DIR && $1"; }

echo ""
echo "  Company Chatbot — Deploy"
echo "  Target: $REMOTE_USER@$REMOTE_HOST"
echo ""

echo "[1/6] Pulling latest code..."
remote "git pull origin main"

echo "[2/6] Installing dependencies..."
remote "cd $APP_DIR && npm install"

echo "[3/6] Running DB migrations..."
remote "cd $APP_DIR && DATABASE_URL='$DB_URL' npx prisma db push --schema=../../prisma/schema.prisma"

echo "[4/6] Building Next.js app..."
remote "cd $APP_DIR && npm run build"

echo "[5/6] Copying static assets..."
remote "cp -r $APP_DIR/.next/static $APP_DIR/.next/standalone/.next/static && cp -r $APP_DIR/public $APP_DIR/.next/standalone/public"

echo "[6/6] Restarting app..."
remote "pm2 startOrReload ecosystem.config.js --update-env"

echo ""
echo "Done. App status:"
remote "pm2 show chatbot-web | grep -E 'status|uptime|restarts'"
echo ""
