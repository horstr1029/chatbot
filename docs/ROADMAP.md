# Product Roadmap — Company Chatbot

Features are grouped by phase. Each phase builds on the previous.
Phases 1–2 are high-value, low-risk. Phases 3–4 require more infrastructure.
Phases 5+ are expansion features — integrations, mobile, and intelligence improvements.

---

## Phase 1 — Chat polish (current sprint)

Small, high-impact UX improvements to the core chat experience.

| # | Feature | Status |
|---|---------|--------|
| 1.1 | **Copy response button** — one-click copy on any AI message | ✅ Done |
| 1.2 | **Suggested starter questions** — 3–4 prompts on the empty chat screen | ✅ Done |
| 1.3 | **Thumbs up / down feedback** — per-message rating stored in DB | ✅ Done |

---

## Phase 2 — Document & discovery UX

Make it easier to understand what the chatbot knows and surface relevant info.

| # | Feature | Status |
|---|---------|--------|
| 2.1 | **Document preview** — click a citation chip to see the exact text snippet | ✅ Done |
| 2.2 | **Chat history search** — keyword search across past conversations | ✅ Done |
| 2.3 | **Announcements** — dept admins can pin a message that appears above the chat composer | ✅ Done |

---

## Phase 3 — Productivity & collaboration

Features that help users and admins get more out of the system.

| # | Feature | Status |
|---|---------|--------|
| 3.1 | **Saved / pinned answers** — bookmark an AI response for later | ✅ Done |
| 3.2 | **Workflow status panel** — slide-over showing all submitted requests + approval state | ✅ Done |
| 3.3 | **Chat export** — download current conversation as markdown | ✅ Done |
| 3.4 | **Multi-department search** — RAG searches across all depts the user belongs to | ✅ Done |

---

## Phase 4 — Advanced / integrations

Larger features requiring additional infrastructure or external integrations.

| # | Feature | Status |
|---|---------|--------|
| 4.1 | **Weekly email digest** — popular Q&A summary sent to dept admins | ✅ Done |
| 4.2 | **Embeddable widget** — drop-in chat snippet for the company intranet | ✅ Done |
| 4.3 | **Answer quality dashboard** — admin view of thumbs ratings + low-scoring queries | ✅ Done |

---

## Phase 5 — Mobile, integrations & intelligence

Expansion features that increase reach and deepen the AI experience.

| # | Feature | Status |
|---|---------|--------|
| 5.1 | **Mobile / PWA** — installable web app with push notifications for workflow approvals | ✅ Done |
| 5.2 | **Slack notifications** — workflow approval/rejection alerts posted to a dept Slack channel | ✅ Done |
| 5.3 | **Usage analytics** — super admin dashboard: sessions/day, by-dept, peak hours, top users, top questions | ✅ Done |
| 5.4 | **Document upload** — upload PDFs/DOCX directly in the admin panel; queued for ingestion immediately | ✅ Done |
| 5.5 | **AI improvements** — follow-up question chips, answer confidence dot, auto-split documents >50 pages | ✅ Done |

---

## Phase 6 — Business process automation

Structured tooling to reduce manual, repetitive work across departments.

| # | Feature | Status |
|---|---------|--------|
| 6.1 | **Document expiry alerts** — weekly job emails dept admins when policies/contracts expire within 30 days | ✅ Done |
| 6.2 | **Smart form filler** — describe a task in chat, AI pre-fills the department form template and submits it | ✅ Done |
| 6.3 | **Meeting prep brief** — auto-pull relevant docs, past decisions, and action items before a scheduled meeting | ✅ Done |

---

## Phase 7 — Advanced workflow & cross-department

Deeper automation features requiring more infrastructure.

| # | Feature | Status |
|---|---------|--------|
| 7.1 | **Multi-step approval chains** — sequential approvals (Manager → Finance → Director) before workflow execution | ✅ Done |
| 7.2 | **Recurring task reminders** — user sets a schedule; AI sends a contextual briefing from the knowledge base | ✅ Done |
| 7.3 | **Cross-department request routing** — request raised in one dept, actioned by another, with handoff tracking | ✅ Done |

---

## Status key
- ✅ Done — shipped to production
- 🚧 In progress
- 🔲 Planned
