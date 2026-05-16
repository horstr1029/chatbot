# Company Chatbot — Claude Code Project

## Project Overview

A department-scoped AI chatbot that lets employees query company documents and trigger
n8n automation workflows. Each department (HR, Installation, Finance, etc.) sees only
its own documents, workflow templates, and has its own LLM configuration.

Full spec: `docs/SPEC.md`
Architecture decisions: `docs/ARCHITECTURE.md`
Task list: `docs/TASKS.md`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), Tailwind CSS, Vercel AI SDK |
| Auth | Clerk (Google + Microsoft SSO) |
| Backend API | Next.js API routes + Python FastAPI sidecar |
| LLM | Anthropic Claude (`claude-sonnet-4-20250514`) + Ollama (local fallback) |
| Embeddings | OpenAI `text-embedding-3-small` or Ollama `nomic-embed-text` |
| Vector store | Qdrant (self-hosted Docker) |
| Doc parsing | Unstructured.io |
| Database | PostgreSQL (via Supabase) + Prisma ORM |
| Workflow engine | n8n (self-hosted Docker) |
| Cache | Redis (session + dept config cache) |
| Queue | BullMQ (document ingestion jobs) |

---

## Project Structure

```
company-chatbot/
├── CLAUDE.md                   # This file
├── .claude/
│   └── rules/
│       ├── frontend.md         # Next.js / React conventions
│       ├── api.md              # API route conventions
│       ├── database.md         # Prisma / SQL conventions
│       └── testing.md          # Test conventions
├── apps/
│   └── web/                    # Next.js app
│       ├── app/
│       │   ├── (auth)/         # Login / onboarding pages
│       │   ├── chat/           # Main chat interface
│       │   ├── admin/          # Super-admin panel
│       │   └── api/            # API routes
│       ├── components/
│       │   ├── chat/           # Chat UI components
│       │   ├── admin/          # Admin panel components
│       │   └── ui/             # Shared primitives
│       └── lib/
│           ├── llm/            # Claude + Ollama client
│           ├── rag/            # Retrieval logic
│           ├── n8n/            # n8n API client
│           └── auth/           # Clerk helpers
├── services/
│   └── ingestion/              # Python FastAPI doc ingestion service
│       ├── main.py
│       ├── parsers/            # Google Drive, SharePoint, local file parsers
│       ├── chunker.py
│       └── embedder.py
├── prisma/
│   └── schema.prisma           # Full DB schema
├── docker/
│   ├── docker-compose.yml      # Qdrant + n8n + Redis + Postgres
│   └── .env.example
└── docs/
    ├── SPEC.md
    ├── ARCHITECTURE.md
    └── TASKS.md
```

---

## Design system

Clean corporate — white surfaces, neutral grays, single blue accent (#2563eb), DM Sans font.
Component library: Tailwind UI patterns (no external component package needed).
Full spec: `.claude/rules/design-system.md` — read this before building any UI component.

---

## Key Conventions

### Never do these
- Never bypass department scoping — every DB query and vector search MUST include `dept_id`
- Never store raw API keys in code — use environment variables only
- Never call the LLM without a department-scoped system prompt
- Never execute an n8n workflow without an admin approval record in the DB

### Always do these
- Every API route must validate the JWT and extract `{ dept_id, role, user_id }` from it
- Use the `deptMiddleware` helper from `lib/auth/middleware.ts` on every protected route
- Cache department config in Redis with a 5-minute TTL (`dept:config:{dept_id}`)
- All vector store queries must pass a `dept_ids` metadata filter (see `lib/rag/retrieve.ts`)
- Use `prisma.$transaction` for any write that touches more than one table

### Code style
- TypeScript strict mode — no `any` types
- All React components are functional with explicit prop types
- Server components by default; add `'use client'` only when needed
- API responses always use the shape `{ data, error, meta }` (see `lib/api/response.ts`)
- Errors are always typed — use the `AppError` class from `lib/errors.ts`

---

## Environment Variables

See `docker/.env.example` for the full list. Key ones:

```bash
ANTHROPIC_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434
OPENAI_API_KEY=                    # for embeddings (optional if using Ollama)
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
DATABASE_URL=
REDIS_URL=
N8N_BASE_URL=http://localhost:5678
N8N_API_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
```

---

## Common Commands

```bash
# Dev
pnpm dev                           # Start Next.js dev server
pnpm dev:ingestion                 # Start Python ingestion service
docker compose -f docker/docker-compose.yml up -d   # Start Qdrant, n8n, Redis, Postgres

# Database
pnpm db:push                       # Push Prisma schema to DB
pnpm db:studio                     # Open Prisma Studio
pnpm db:seed                       # Seed with demo departments + users

# Testing
pnpm test                          # Jest unit tests
pnpm test:e2e                      # Playwright e2e tests
pnpm test:rag                      # RAG retrieval quality tests

# Build
pnpm build                         # Production build
pnpm typecheck                     # TypeScript check only
```

---

## Repository & Deployment

- GitHub repo:   https://github.com/horstr1029/chatbot
- Clone (SSH):   git@github.com:horstr1029/chatbot.git
- CI/CD:         GitHub Actions — `.github/workflows/deploy.yml`
                 Pushes to `main` → test → build Docker images → SSH deploy to server

- Server (public):  horstr@mstssh.gloworm.org.za
- Server (LAN):     horstr@192.168.104.35
- SSH key:          ~/.ssh/chatbot_deploy
- SSH aliases:      `chatbot-prod` (public) / `chatbot-local` (LAN)
- plink (Windows):  use `chatbot_deploy.ppk` with LAN IP when on office network

Manual deploy scripts:
- Linux/Mac:     `./scripts/deploy.sh` (add `--local` for LAN)
- Windows/plink: `scripts\deploy-local.bat`

Full setup instructions: `docs/SSH_GITHUB_SETUP.md`
Deployment rules:        `.claude/rules/deployment.md`

---

## Build Order

Follow `docs/TASKS.md` exactly. The dependency order is:

1. Docker infra + DB schema (TASK-01, TASK-02)
2. Auth + department model (TASK-03, TASK-04)
3. Document ingestion pipeline (TASK-05, TASK-06, TASK-07)
4. RAG retrieval + LLM routing (TASK-08, TASK-09)
5. Chat UI + streaming (TASK-10, TASK-11)
6. n8n integration + workflow designer (TASK-12, TASK-13, TASK-14)
7. Admin panel (TASK-15, TASK-16)
8. Ollama integration (TASK-17)
9. Testing + hardening (TASK-18, TASK-19)
