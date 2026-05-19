# deploy.ps1 — Company Chatbot deploy script (Windows / PowerShell)
#
# Usage:
#   .\scripts\deploy.ps1              # deploy via public cloudflared tunnel
#   .\scripts\deploy.ps1 -Local       # deploy via LAN (192.168.104.35)

param([switch]$Local)

$RemoteUser = "horstr"
$HostPublic = "mstssh.gloworm.org.za"
$HostLocal  = "192.168.104.35"
$SshKey     = "$env:USERPROFILE\.ssh\chatbot_deploy"
$RemoteHost = if ($Local) { $HostLocal } else { $HostPublic }
$label      = if ($Local) { "LAN ($RemoteHost)" } else { "public tunnel ($RemoteHost)" }

Write-Host ""
Write-Host "  Company Chatbot — Deploy"
Write-Host "  Target : $RemoteUser@$RemoteHost  ($label)"
Write-Host ""

# Single SSH session — avoids Windows OpenSSH CreateProcessW error on long-running commands.
# server-deploy.sh is pulled from the repo as part of git pull so it's always up to date.
ssh -i $SshKey `
    -o StrictHostKeyChecking=accept-new `
    -o ServerAliveInterval=15 `
    -o ServerAliveCountMax=20 `
    "$RemoteUser@$RemoteHost" `
    "cd ~/company-chatbot && git pull origin main && bash scripts/server-deploy.sh"

if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "Deploy failed — check output above." -ForegroundColor Red
  exit 1
}

Write-Host ""
