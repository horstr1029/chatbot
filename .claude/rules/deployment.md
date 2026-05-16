---
description: Git, GitHub and deployment conventions
---

# Git & deployment rules

## Repository
- Remote: https://github.com/horstr1029/chatbot
- Clone via SSH: git@github.com:horstr1029/chatbot.git
- Default branch: main (auto-deploys to production)

## Branch strategy
- main      → production (auto-deploy via GitHub Actions on push)
- dev        → staging / integration (CI only, no deploy)
- feature/*  → feature branches (CI test only)
- Always open a PR from feature/* → dev, then dev → main

## Commit conventions
- feat: new feature
- fix: bug fix
- chore: tooling / deps / config
- docs: documentation only
- test: adding or fixing tests
- Never commit directly to main — always use a PR

## Deployment servers
- Public SSH:  horstr@mstssh.gloworm.org.za
- Local SSH:   horstr@192.168.104.35 (use when on office LAN)
- SSH key:     ~/.ssh/chatbot_deploy
- SSH alias:   chatbot-prod (public) / chatbot-local (LAN) — see .ssh/config
- plink alias: use horstr@192.168.104.35 with chatbot_deploy.ppk when on Windows + LAN
- Project dir on server: ~/company-chatbot
- Compose file for prod: docker/docker-compose.prod.yml

## Never do these in code
- Never hardcode server IPs, hostnames, or SSH usernames in application code
- Never commit .env.prod, .env.local, or any file containing real secrets
- Never bypass the PR process for main branch changes

## Manual deploy commands
- From Mac/Linux anywhere:  ./scripts/deploy.sh
- From Mac/Linux on LAN:    ./scripts/deploy.sh --local
- From Windows on LAN:      scripts\deploy-local.bat
