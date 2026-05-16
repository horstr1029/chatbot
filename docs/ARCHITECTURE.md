# Architecture Decisions

## Why Next.js API routes instead of a separate Node backend?

The chat endpoint needs to stream responses. Next.js App Router streaming + Vercel AI SDK
is the lowest-friction path. Separate API service adds latency and deployment complexity
for no benefit at this scale.

The Python ingestion service IS separate because it has heavy dependencies (Unstructured,
ML libraries) that don't belong in the Node process.

---

## Why Qdrant over pgvector?

- Qdrant supports payload filtering natively — the `dept_ids` array filter is a first-class
  Qdrant feature. In pgvector this would require a JOIN + WHERE clause that complicates the
  query and is harder to optimize.
- Qdrant is self-hostable via Docker with zero configuration.
- pgvector is fine for simpler setups but Qdrant scales better if document volume grows.

---

## Why Clerk over NextAuth?

- Clerk has first-class Microsoft + Google SSO out of the box with no config.
- Clerk's `sessionClaims` can carry custom fields (`dept_id`, `role`) via JWT templates,
  eliminating a DB lookup on every request.
- NextAuth requires more manual work for the same result.

---

## Why BullMQ for the ingestion queue?

Document ingestion is slow (parsing, embedding, upserting). It must not block the HTTP
request that triggered it. BullMQ + Redis gives reliable job queuing with retries, dead
letter queues, and a dashboard (Bull Board) for debugging stuck jobs.

---

## Why store workflow requests in the DB instead of just using n8n?

n8n is the execution engine, not the source of truth. Storing requests in Postgres gives:
- Full audit log independent of n8n
- Fast admin dashboard queries without hitting n8n API
- Resilience if n8n is restarted (resume URL is stored in DB)
- Ability to page through history with filters

---

## Department isolation strategy

Isolation is enforced at THREE levels (defence in depth):

1. **JWT** — `dept_id` is in the token, extracted by `deptMiddleware` on every request
2. **DB queries** — every Prisma query includes `where: { deptId: ctx.dept_id }`
3. **Vector search** — Qdrant filter always includes `dept_ids` match condition

If any one level fails, the other two catch it.
Never rely on UI-only filtering for security.

---

## Ollama integration approach

Ollama exposes an OpenAI-compatible `/v1/chat/completions` endpoint.
We use the OpenAI Node SDK pointed at the Ollama base URL — this means:
- Zero extra dependencies
- Same streaming interface as the OpenAI SDK
- Easy to swap models by changing the `model` string

The `getLLMClient(dept)` function is the single decision point. All callers are
unaware of whether they're talking to Claude or Ollama.

---

## n8n workflow JSON generation

Claude generates n8n workflow JSON from a structured prompt that includes:
- A whitelist of available node types for the department
- Hard constraints (must have Wait node, must have approval IF node)
- A callback URL for execution status

This is more reliable than asking Claude to generate arbitrary workflows because:
- It limits the surface area of what can be generated
- The Wait + IF pattern is non-negotiable, preventing runaway automation
- The whitelist prevents workflows from accessing nodes outside the dept's scope
