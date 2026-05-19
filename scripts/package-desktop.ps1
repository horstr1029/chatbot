# package-desktop.ps1 — Build Electron app, zip it, and upload to the server.
# Run this whenever a new desktop version is ready to distribute.
#
# Usage:
#   .\scripts\package-desktop.ps1              # public tunnel
#   .\scripts\package-desktop.ps1 -Local       # LAN

param([switch]$Local)

$RemoteUser = "horstr"
$HostPublic = "mstssh.gloworm.org.za"
$HostLocal  = "192.168.104.35"
$SshKey     = "$env:USERPROFILE\.ssh\chatbot_deploy"
$RemoteHost = if ($Local) { $HostLocal } else { $HostPublic }
$RemoteDir  = "~/company-chatbot/apps/web/public/downloads"

Write-Host ""
Write-Host "  MST Chatbot — Package Desktop App"
Write-Host "  Target : $RemoteUser@$RemoteHost"
Write-Host ""

Set-Location "$PSScriptRoot\.."

Write-Host "[1/4] Generating icons..."
node apps/desktop/scripts/generate-icons.js

Write-Host "[2/4] Building Electron app..."
Set-Location apps/desktop
npm run build
Set-Location "$PSScriptRoot\.."

Write-Host "[3/4] Zipping..."
$zipPath = "apps/web/public/downloads/MST-Chatbot-win32-x64.zip"
New-Item -ItemType Directory -Force -Path "apps/web/public/downloads" | Out-Null
Compress-Archive -Path "apps/desktop/dist/MST Chatbot-win32-x64" -DestinationPath $zipPath -Force
$sizeMB = [math]::Round((Get-Item $zipPath).Length / 1MB, 1)
Write-Host "  → $sizeMB MB"

Write-Host "[4/4] Uploading to server..."
ssh -i $SshKey -o StrictHostKeyChecking=accept-new "${RemoteUser}@${RemoteHost}" "mkdir -p $RemoteDir"
scp -i $SshKey "apps/web/public/downloads/MST-Chatbot-win32-x64.zip" "${RemoteUser}@${RemoteHost}:${RemoteDir}/MST-Chatbot-win32-x64.zip"

Write-Host ""
Write-Host "Done. Download available at /downloads/MST-Chatbot-win32-x64.zip"
Write-Host ""
