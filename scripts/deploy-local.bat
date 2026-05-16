@echo off
REM ─────────────────────────────────────────────────────────────────
REM  deploy-local.bat  —  Company Chatbot deploy (Windows LAN)
REM  Delegates to deploy.ps1 with -Local flag.
REM ─────────────────────────────────────────────────────────────────
powershell -ExecutionPolicy Bypass -File "%~dp0deploy.ps1" -Local
pause
