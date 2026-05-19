#!/usr/bin/env bash
# Runs on the server — called by deploy.ps1 via a single SSH session.
set -euo pipefail

PROJECT=~/company-chatbot
APP=$PROJECT/apps/web
DB_URL="postgresql://chatbot:chatbot@localhost:5432/chatbot"

echo "[1/6] Pulling latest code..."
cd "$PROJECT" && git pull origin main

echo "[2/6] Installing dependencies..."
cd "$APP" && npm install --prefer-offline

echo "[3/6] Running DB migrations..."
DATABASE_URL="$DB_URL" npx prisma db push --schema=../../prisma/schema.prisma --accept-data-loss

echo "[4/6] Building Next.js app..."
npm run build

echo "[5/6] Copying static assets..."
cp -r .next/static .next/standalone/.next/static
rm -rf .next/standalone/public
cp -r public .next/standalone/public

echo "[6/6] Restarting app..."
pm2 restart chatbot-web --update-env

echo ""
echo "Done."
pm2 show chatbot-web | grep -E "status|uptime|restarts"
