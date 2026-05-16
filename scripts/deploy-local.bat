@echo off
REM ─────────────────────────────────────────────────────────────────
REM  deploy-local.bat
REM  Manual deploy script for Windows machines on the office LAN.
REM  Uses plink (PuTTY) to SSH into 192.168.104.35 and deploy.
REM
REM  Prerequisites:
REM   - PuTTY installed (plink.exe in PATH)
REM   - chatbot_deploy.ppk key in %USERPROFILE%\.ssh\
REM   - Server host key already accepted (run plink once manually first)
REM ─────────────────────────────────────────────────────────────────

setlocal

set SERVER=192.168.104.35
set USER=horstr
set KEY=%USERPROFILE%\.ssh\chatbot_deploy.ppk
set PROJECT_DIR=~/company-chatbot

echo.
echo ╔══════════════════════════════════════╗
echo ║   Company Chatbot — Local Deploy     ║
echo ║   Target: %USER%@%SERVER%   ║
echo ╚══════════════════════════════════════╝
echo.

REM Check plink is available
where plink >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] plink not found. Install PuTTY and ensure plink.exe is in your PATH.
    pause
    exit /b 1
)

REM Check key file exists
if not exist "%KEY%" (
    echo [ERROR] Key file not found: %KEY%
    echo Run PuTTYgen to convert ~/.ssh/chatbot_deploy to .ppk format.
    pause
    exit /b 1
)

echo [1/4] Pulling latest code...
plink -i "%KEY%" %USER%@%SERVER% -batch "cd %PROJECT_DIR% && git pull origin main"
if %ERRORLEVEL% neq 0 (
    echo [ERROR] git pull failed.
    pause
    exit /b 1
)

echo [2/4] Pulling latest Docker images...
plink -i "%KEY%" %USER%@%SERVER% -batch "cd %PROJECT_DIR% && docker compose -f docker/docker-compose.prod.yml pull"
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker pull failed.
    pause
    exit /b 1
)

echo [3/4] Restarting services...
plink -i "%KEY%" %USER%@%SERVER% -batch "cd %PROJECT_DIR% && docker compose -f docker/docker-compose.prod.yml up -d --remove-orphans"
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker compose up failed.
    pause
    exit /b 1
)

echo [4/4] Running DB migrations...
plink -i "%KEY%" %USER%@%SERVER% -batch "cd %PROJECT_DIR% && docker compose -f docker/docker-compose.prod.yml exec -T web npx prisma migrate deploy"
if %ERRORLEVEL% neq 0 (
    echo [WARNING] Migration step failed - check manually.
)

echo.
echo ✓ Deploy complete.
echo.

REM Show running containers
echo Running containers:
plink -i "%KEY%" %USER%@%SERVER% -batch "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"

endlocal
pause
