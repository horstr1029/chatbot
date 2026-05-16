# Build Tasks

Each task is self-contained. Complete them in order — later tasks depend on earlier ones.
Reference `docs/SPEC.md` for detailed requirements on each area.

---

## TASK-01 — Docker infrastructure

**Goal:** All backing services running locally via Docker Compose.

Create `docker/docker-compose.yml` with:
- PostgreSQL 16 (port 5432)
- Redis 7 (port 6379)
- Qdrant latest (ports 6333, 6334)
- n8n latest (port 5678, with `N8N_BASIC_AUTH_ACTIVE=true`)

Create `docker/.env.example` with all required environment variable names (no values).
Create `docker/README.md` with setup instructions.

**Done when:** `docker compose up -d` starts all four services with health checks passing.

---

## TASK-02 — Database schema + Prisma setup

**Goal:** PostgreSQL schema matches `docs/SPEC.md` section 9 exactly.

- Init Prisma in `prisma/`
- Create `schema.prisma` with all models: `Department`, `User`, `DocumentSource`, `WorkflowRequest`, `ChatSession`
- Create migration
- Create `prisma/seed.ts` that inserts:
  - 3 departments: "HR", "Installation", "Finance"
  - 1 super_admin user per department
  - 2 member users per department
  - 1 global document source per department

**Done when:** `pnpm db:push && pnpm db:seed` runs without errors and Prisma Studio shows data.

---

## TASK-03 — Next.js app scaffold + Clerk auth

**Goal:** Next.js 14 app with working authentication.

- Init Next.js 14 app in `apps/web/` with App Router, TypeScript, Tailwind
- Install and configure Clerk
- Protect all routes under `/(protected)` layout
- On first login, if user has no `dept_id` in DB, show a "pending approval" page
- Create `lib/auth/middleware.ts` — exports `deptMiddleware` that extracts `{ dept_id, role, user_id }` from Clerk session claims and attaches to `req.ctx`
- Clerk webhook at `/api/webhooks/clerk` to sync new users to DB

**Done when:** Login via Google/Microsoft works, new users land on pending page, existing seeded users land on `/chat`.

---

## TASK-04 — Department config API + caching

**Goal:** Department configuration is fetchable and cached.

- Create API routes for departments (see spec section 10)
- Create `lib/dept/getDept.ts` — fetches dept from DB, caches in Redis for 5 minutes under key `dept:config:{dept_id}`
- Cache invalidation on any dept update

**Done when:** Department config is returned from Redis on second fetch, confirmed with Redis CLI `KEYS dept:config:*`.

---

## TASK-05 — Document ingestion service (Python)

**Goal:** Python FastAPI service that parses and chunks documents.

Create `services/ingestion/`:
- `main.py` — FastAPI app with `/parse` endpoint accepting `{ file_bytes, file_name, mime_type, dept_ids, source_id }`
- `parsers/unstructured_parser.py` — wraps Unstructured.io, returns clean text + table markdown
- `chunker.py` — recursive character splitter, 512 tokens, 64 overlap, returns `[{ text, chunk_index }]`
- `embedder.py` — supports both OpenAI `text-embedding-3-small` and Ollama `nomic-embed-text` based on env config
- `qdrant_client.py` — upserts vectors to Qdrant collection `company_docs` with full payload (see spec section 4.2)
- `requirements.txt`

**Done when:** POST a test PDF to `/parse` and confirm chunks appear in Qdrant with correct `dept_ids` metadata.

---

## TASK-06 — BullMQ ingestion queue

**Goal:** Document sync jobs are queued and processed reliably.

In `apps/web/lib/queue/`:
- `ingestion.queue.ts` — BullMQ queue connected to Redis
- `ingestion.worker.ts` — worker that calls the Python ingestion service for each job
- Job types: `SYNC_FILE`, `DELETE_FILE`, `FULL_RESYNC`

**Done when:** Enqueue a `SYNC_FILE` job manually and confirm it calls the ingestion service and vectors appear in Qdrant.

---

## TASK-07 — Source connectors

**Goal:** Documents sync automatically from Google Drive, SharePoint, and local files.

Create `services/ingestion/connectors/`:
- `google_drive.py` — uses Drive API to list + download files, registers push webhook
- `sharepoint.py` — uses MS Graph API delta queries + subscription webhooks
- `local_watcher.py` — uses `watchdog` to watch configured directories

Create Next.js webhook receivers:
- `apps/web/app/api/ingestion/drive-webhook/route.ts`
- `apps/web/app/api/ingestion/sharepoint-webhook/route.ts`

Each webhook receiver validates the request signature, then enqueues a `SYNC_FILE` job.

**Done when:** Drop a file in a watched local directory and confirm it appears in Qdrant within 30 seconds.

---

## TASK-08 — RAG retrieval

**Goal:** User messages retrieve relevant document chunks from the correct department.

Create `apps/web/lib/rag/`:
- `embed.ts` — embeds a query string using the dept's configured embedding model
- `retrieve.ts` — Qdrant search with `dept_ids` metadata filter (see spec section 5.2), returns top-5 chunks with source metadata
- `buildContext.ts` — formats retrieved chunks into the context block for the system prompt

**Done when:** Call `retrieve("what is the leave policy", deptId)` and confirm only chunks tagged with that dept or "global" are returned.

---

## TASK-09 — LLM routing + intent detection

**Goal:** Messages are routed to RAG, workflow designer, or direct chat based on intent.

Create `apps/web/lib/llm/`:
- `router.ts` — exports `getLLMClient(dept)` that returns the right client (Anthropic or Ollama)
- `intent.ts` — classifies message as `DOC_QUESTION | WORKFLOW_REQUEST | GENERAL_CHAT` using a single fast LLM call (use the dept's configured model)
- `systemPrompt.ts` — builds the full department-scoped system prompt (see spec section 5.3)
- `chat.ts` — orchestrates: intent → retrieve (if DOC) → build prompt → stream response

**Done when:** Send "what is the onboarding process?" → gets RAG response. Send "create a workflow to notify me when a new file is added" → routes to workflow path (can return placeholder for now).

---

## TASK-10 — Chat UI

**Goal:** Streaming chat interface with source citations.

Create `apps/web/app/chat/` page using Vercel AI SDK `useChat` hook:
- Message bubbles — user right, assistant left
- Streaming token-by-token display
- Source citations rendered below assistant messages as clickable chips (file name → opens source URL)
- Workflow request status shown as a special card component (pending / approved / rejected / executed)
- New chat button, conversation history sidebar
- Department name shown in header

**Done when:** Full streaming chat works end-to-end with real documents returning cited answers.

---

## TASK-11 — Chat session persistence

**Goal:** Conversations are saved and resumable.

- Save messages to `ChatSession` table after each exchange
- Load last 10 sessions in sidebar
- Resuming a session restores full message history

**Done when:** Reload the page and conversation history persists.

---

## TASK-12 — n8n workflow designer

**Goal:** Claude generates n8n workflow JSON from user requests.

Create `apps/web/lib/n8n/`:
- `client.ts` — typed wrapper around n8n REST API (create workflow, get workflows by tag, get execution resume URL)
- `designer.ts` — sends workflow design prompt to Claude (see spec section 8.2), parses the JSON response
- `templates.ts` — fetches available workflow templates for a dept from n8n

Create the workflow request flow (spec section 8.1):
- Intent `WORKFLOW_REQUEST` → design → create in n8n → save to DB → notify admin → return status to user

**Done when:** Ask "set up an email alert when a new file is added to the server" → workflow appears in n8n UI in inactive state + DB record created with status `pending`.

---

## TASK-13 — Admin approval UI

**Goal:** Dept admins can review and approve/reject workflow requests.

Create `apps/web/app/admin/workflows/` page:
- Table of pending workflow requests
- Each row shows: requested by, date, description, status
- Click to expand: full workflow description + n8n node summary
- Approve button → `POST /api/workflows/:id/approve`
- Reject button with reason input → `POST /api/workflows/:id/reject`

**Done when:** Approve a pending workflow → n8n executes it → DB status updates to `executed`.

---

## TASK-14 — Workflow approval backend

**Goal:** Approval/rejection resumes the correct n8n execution.

Implement `POST /api/workflows/:id/approve` and `POST /api/workflows/:id/reject`:
- Validate caller is `dept_admin` for the same dept as the workflow request
- Update DB record
- Call n8n resume URL with appropriate payload (see spec section 8.3)
- Send SSE update to the requesting user's active chat session

**Done when:** Full cycle works — request → pending → admin approves → n8n executes → user sees "workflow executed" in chat.

---

## TASK-15 — Department admin panel

**Goal:** Dept admins can manage their department without touching others.

Create `apps/web/app/admin/` pages:
- `/admin` — dashboard with stats (users, docs, workflow requests)
- `/admin/documents` — list sources, add/remove (form for Drive folder URL, SharePoint site, or local path)
- `/admin/users` — list users, change roles, remove users
- `/admin/settings` — edit system prompt, select LLM model (dropdown of available Claude + Ollama models)

All routes protected: must have `dept_admin` or `super_admin` role.

**Done when:** Change a department's system prompt → next chat uses the new prompt.

---

## TASK-16 — Super admin panel

**Goal:** Super admins can manage all departments.

Create `apps/web/app/superadmin/` pages:
- `/superadmin` — overview of all departments
- `/superadmin/departments` — create department (name, system prompt, LLM model), delete department
- Assign/remove users from any department, change roles

**Done when:** Create a new "Legal" department from the super admin panel, assign a user, and confirm they see an empty chat scoped to Legal.

---

## TASK-17 — Ollama integration

**Goal:** Departments can be configured to use a local Ollama model.

- In the admin settings page, add a model picker:
  - Fetches available Ollama models from `GET {OLLAMA_BASE_URL}/api/tags`
  - Lists them alongside Claude models
- `lib/llm/router.ts` already handles routing — ensure it works end-to-end with a real Ollama model
- Add `nomic-embed-text` as an embedding option in `services/ingestion/embedder.py`
- If Ollama is unreachable, return a clear error message: "Local AI model unavailable. Please contact your admin."

**Done when:** Set a department to use `llama3.2`, send a chat message, and confirm the response comes from Ollama (check Ollama logs).

---

## TASK-18 — Testing

**Goal:** Core paths have test coverage.

Write tests for:
- `lib/rag/retrieve.ts` — mock Qdrant, assert dept filter is always applied
- `lib/llm/intent.ts` — unit test classification on 10 sample messages
- `POST /api/workflows/:id/approve` — assert only dept_admin of correct dept can approve
- `deptMiddleware` — assert requests without valid JWT are rejected
- E2E (Playwright): full chat flow, workflow request → approval → execution

**Done when:** `pnpm test` passes all unit tests. `pnpm test:e2e` passes the chat and workflow flows.

---

## TASK-19 — Hardening + deployment prep

**Goal:** Production-ready configuration.

- Add rate limiting to `/api/chat` (20 req/min per user) using Upstash Redis
- Add request logging middleware (structured JSON logs)
- Ensure all API routes return consistent error shapes using `AppError`
- Add n8n Wait node timeout reminder: BullMQ scheduled job fires at 48h, sends reminder email to dept_admin
- Create `Dockerfile` for `apps/web` and `services/ingestion`
- Update `docker/docker-compose.yml` to include both app containers
- Write `docs/DEPLOYMENT.md` with step-by-step production deployment guide

**Done when:** `docker compose up` starts the full stack. All TASK-18 tests still pass.
