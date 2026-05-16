# SSH & GitHub Setup Guide

## Overview

Two SSH keys are used:
- `chatbot_deploy` — your personal key for SSHing into the server to deploy
- `chatbot_github` — a deploy key that gives the server read access to the GitHub repo

Two ways to reach the server:
- **Public** (`mstssh.gloworm.org.za`) — use from anywhere
- **Local** (`192.168.104.35`) — use when on the office LAN (faster, lower latency)
- **plink** — Windows alternative to `ssh`, works on the local network (see section 4)

---

## 1. Generate SSH keys (run on your local machine)

```bash
# Key 1: your personal deploy key (for CI/CD and manual deploys)
ssh-keygen -t ed25519 -C "chatbot-deploy" -f ~/.ssh/chatbot_deploy

# Key 2: GitHub deploy key (gives the server pull access to the repo)
ssh-keygen -t ed25519 -C "chatbot-github-deploy" -f ~/.ssh/chatbot_github
```

---

## 2. Install SSH config

Copy the provided `.ssh/config` entries into your local `~/.ssh/config`:

```bash
cat .ssh/config >> ~/.ssh/config
chmod 600 ~/.ssh/config
```

Test both connections:

```bash
ssh -T chatbot-prod          # should show: "Welcome horstr@..."
ssh -T chatbot-local         # same, via LAN IP
```

---

## 3. Configure the server

SSH in and run these once:

```bash
ssh chatbot-prod   # or chatbot-local if on LAN

# Create project directory
mkdir -p ~/company-chatbot

# Add your personal public key to authorized_keys (if not already there)
# Paste the contents of ~/.ssh/chatbot_deploy.pub
echo "YOUR_CHATBOT_DEPLOY_PUBLIC_KEY" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Clone the repo (uses the GitHub deploy key — see step 4)
git clone git@github.com:horstr1029/chatbot.git ~/company-chatbot

# Install Docker + Docker Compose if not already installed
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Log in to GitHub Container Registry (for pulling built images)
# Use a GitHub personal access token with read:packages scope
echo "YOUR_GITHUB_PAT" | docker login ghcr.io -u horstr1029 --password-stdin
```

---

## 4. Add GitHub deploy key (server → GitHub)

This lets the server `git pull` from the private repo.

```bash
# On the server: create a key specifically for GitHub access
ssh-keygen -t ed25519 -C "chatbot-server-github" -f ~/.ssh/chatbot_github

# Print the public key
cat ~/.ssh/chatbot_github.pub
```

Then in GitHub:
1. Go to https://github.com/horstr1029/chatbot/settings/keys
2. Click **Add deploy key**
3. Title: `Production server`
4. Paste the public key
5. Check **Allow write access**: NO (read-only is enough for `git pull`)

Test it from the server:
```bash
ssh -T git@github.com   # should show: "Hi horstr1029! You've successfully authenticated..."
```

---

## 5. Add GitHub Actions secrets

Go to: https://github.com/horstr1029/chatbot/settings/secrets/actions

Add these secrets:

| Secret name | Value |
|---|---|
| `DEPLOY_HOST` | `mstssh.gloworm.org.za` |
| `DEPLOY_USER` | `horstr` |
| `DEPLOY_SSH_KEY` | Contents of `~/.ssh/chatbot_deploy` (the **private** key) |
| `DEPLOY_PORT` | `22` (or your custom SSH port if different) |
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `DATABASE_URL` | `postgresql://user:pass@localhost:5432/chatbot_prod` |
| `REDIS_URL` | `redis://localhost:6379` |
| `QDRANT_URL` | `http://localhost:6333` |
| `N8N_API_KEY` | Your n8n API key |
| `CLERK_SECRET_KEY` | Your Clerk secret key |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Your Clerk publishable key |

> **Never** paste private keys or secrets into CLAUDE.md or any committed file.
> Always use GitHub Secrets for CI/CD and a `.env` file (gitignored) locally.

---

## 6. plink (Windows / local network)

plink is the command-line SSH client that comes with PuTTY. Use it when you're on the
office LAN and want to deploy manually from a Windows machine.

**One-time setup:**
```bat
REM Save the server's host key so plink doesn't prompt
plink horstr@192.168.104.35 -i %USERPROFILE%\.ssh\chatbot_deploy.ppk exit
REM Answer "yes" to store the host key, then Ctrl+C
```

> Note: plink uses `.ppk` format keys. Convert your key with PuTTYgen:
> Open PuTTYgen → Load `chatbot_deploy` → Save private key → `chatbot_deploy.ppk`

**Manual deploy from Windows (LAN):**
```bat
scripts\deploy-local.bat
```

See `scripts/deploy-local.bat` for the full deploy script.

---

## 7. Branch strategy

| Branch | Behaviour |
|---|---|
| `main` | Auto-deploys to production on every push |
| `dev` | CI runs tests and builds — no deploy |
| `feature/*` | CI runs tests only |

Keep `main` always deployable. Use PRs to merge `dev` → `main`.

---

## 8. Manual deploy (emergency / bypass CI)

If you need to deploy directly without going through GitHub Actions:

```bash
# From anywhere (public)
ssh chatbot-prod "cd ~/company-chatbot && git pull origin main && docker compose -f docker/docker-compose.prod.yml up -d --remove-orphans"

# From office LAN (faster)
ssh chatbot-local "cd ~/company-chatbot && git pull origin main && docker compose -f docker/docker-compose.prod.yml up -d --remove-orphans"
```
