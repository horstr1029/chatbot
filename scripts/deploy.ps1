# ─────────────────────────────────────────────────────────────────
#  deploy.ps1  —  Company Chatbot deploy script (Windows / PowerShell)
#
#  Usage:
#    .\scripts\deploy.ps1              # deploy via public cloudflared tunnel
#    .\scripts\deploy.ps1 -Local       # deploy via LAN (192.168.104.35)
# ─────────────────────────────────────────────────────────────────
param(
  [switch]$Local
)

$RemoteUser   = "horstr"
$HostPublic   = "mstssh.gloworm.org.za"
$HostLocal    = "192.168.104.35"
$SshKey       = "$env:USERPROFILE\.ssh\chatbot_deploy"
$ProjectDir   = "~/company-chatbot"
$AppDir       = "$ProjectDir/apps/web"
$DbUrl        = "postgresql://chatbot:chatbot@localhost:5432/chatbot"

$RemoteHost = if ($Local) { $HostLocal } else { $HostPublic }
$label      = if ($Local) { "LAN ($RemoteHost)" } else { "public tunnel ($RemoteHost)" }

Write-Host ""
Write-Host "  Company Chatbot — Deploy"
Write-Host "  Target : $RemoteUser@$RemoteHost  ($label)"
Write-Host ""

function Invoke-Remote($cmd) {
  ssh -i $SshKey -o StrictHostKeyChecking=accept-new "$RemoteUser@$RemoteHost" "cd $ProjectDir && $cmd"
  if ($LASTEXITCODE -ne 0) { throw "Remote command failed: $cmd" }
}

Write-Host "[1/6] Pulling latest code..."
Invoke-Remote "git pull origin main"

Write-Host "[2/6] Installing dependencies..."
Invoke-Remote "cd $AppDir && npm install"

Write-Host "[3/6] Running DB migrations..."
Invoke-Remote "cd $AppDir && DATABASE_URL='$DbUrl' npx prisma db push --schema=../../prisma/schema.prisma --accept-data-loss"

Write-Host "[4/6] Building Next.js app..."
Invoke-Remote "cd $AppDir && npm run build"

Write-Host "[5/6] Copying static assets..."
Invoke-Remote "cp -r $AppDir/.next/static $AppDir/.next/standalone/.next/static && cp -r $AppDir/public $AppDir/.next/standalone/public"

Write-Host "[6/6] Restarting app..."
Invoke-Remote "pm2 restart chatbot-web --update-env"

Write-Host ""
Write-Host "Done. App status:"
Invoke-Remote "pm2 show chatbot-web | grep -E 'status|uptime|restarts'"
Write-Host ""
