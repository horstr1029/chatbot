#!/usr/bin/env bash
# Runs on the server — called by deploy.ps1 via a single SSH session.
# git pull is done by the caller before this script runs.
set -euo pipefail

APP=~/company-chatbot/apps/web
DB_URL="postgresql://chatbot:chatbot@localhost:5432/chatbot"

echo "[1/5] Installing dependencies..."
cd "$APP" && npm install --prefer-offline

echo "[2/5] Running DB migrations..."
DATABASE_URL="$DB_URL" npx prisma db push --schema=../../prisma/schema.prisma --accept-data-loss

echo "[3/5] Building Next.js app..."
npm run build

echo "[4/5] Copying static assets..."
cp -r .next/static .next/standalone/.next/static
rm -rf .next/standalone/public
cp -r public .next/standalone/public

echo "[5/5] Restarting app..."
pm2 restart chatbot-web --update-env

echo ""
echo "Done."
pm2 show chatbot-web | grep -E "status|uptime|restarts"
