# Company Chatbot — Full Specification

## 1. Product Summary

A department-scoped internal AI chatbot with two capabilities:

1. **Document Q&A** — employees ask questions and get answers grounded in company documents
   from Google Drive, SharePoint/OneDrive, and local/server file stores.

2. **Workflow automation** — employees describe what they need and the chatbot designs an
   n8n workflow on the fly. A department admin must approve before execution.

Every feature is scoped by department. The installation team sees installation docs and
installation workflow templates. HR sees HR docs and HR workflows. They cannot cross-read.

---

## 2. User Roles

| Role | Permissions |
|---|---|
| `member` | Chat, ask doc questions, request workflows (pending approval) |
| `dept_admin` | All member permissions + approve/reject workflows + manage dept users + configure dept settings |
| `super_admin` | All dept_admin permissions across all departments + create/delete departments + assign LLM models |

---

## 3. Department Configuration

Each department has independently configurable:

- **Name** — display name shown in the UI
- **System prompt** — custom persona and instructions injected into every LLM call
- **LLM model** — `claude-sonnet-4-20250514` (default) or any Ollama model slug (e.g. `llama3.2`, `mistral`)
- **Embedding model** — `text-embedding-3-small` (default) or `nomic-embed-text` (Ollama local)
- **Document sources** — which Google Drive folders, SharePoint sites, or local paths are indexed
- **Workflow templates** — which n8n workflow templates are available to this dept
- **Admin approvers** — list of `dept_admin` users who receive approval requests

---

## 4. Document Ingestion Pipeline

### 4.1 Source connectors

**Google Drive**
- Auth: OAuth2 service account with domain-wide delegation
- Sync method: Drive API `files.watch` push notifications to `/api/ingestion/drive-webhook`
- Supported types: Docs, Sheets (exported as text), PDFs, DOCX, PPTX, TXT
- Metadata stored: `file_id`, `name`, `mime_type`, `modified_time`, `dept_ids[]`

**SharePoint / OneDrive**
- Auth: Azure AD app registration with `Files.Read.All` permission
- Sync method: Microsoft Graph change notifications (delta queries + subscription webhooks)
- Supported types: Word, Excel (first sheet as text), PDF, PPTX, TXT
- Metadata stored: `item_id`, `site_id`, `name`, `modified_time`, `dept_ids[]`

**Local / server files**
- Sync method: `watchdog` Python library watching configured directories
- Runs as a daemon inside the ingestion service container
- Supported types: PDF, DOCX, PPTX, XLSX, TXT, MD
- Metadata stored: `file_path`, `name`, `modified_time`, `dept_ids[]`

### 4.2 Processing steps

1. File change detected → job queued in BullMQ (`ingestion` queue)
2. Worker picks up job → downloads file bytes
3. **Parse** — `Unstructured.io` normalizes to clean text + extracts tables
4. **Chunk** — recursive character splitter, 512 tokens, 64-token overlap
5. **Embed** — batch embed chunks (OpenAI or Ollama depending on dept config)
6. **Upsert** — store vectors in Qdrant collection `company_docs` with payload:
   ```json
   {
     "text": "...",
     "source_id": "uuid",
     "source_name": "Q3 Report.pdf",
     "source_url": "https://...",
     "dept_ids": ["uuid1", "global"],
     "chunk_index": 3,
     "modified_at": "2025-01-01T00:00:00Z"
   }
   ```
7. Update `document_sources` table with `last_synced` timestamp

### 4.3 Global documents

Documents tagged with `dept_ids: ["global"]` are accessible to all departments.
Use for: employee handbook, IT policy, office directories.

---

## 5. RAG Retrieval

### 5.1 Query-time flow

```
user message
  → embed query (same model as dept's embedding config)
  → Qdrant search with filter: dept_ids contains dept_id OR "global"
  → top-5 chunks returned
  → injected into LLM system prompt as context
  → LLM streams response
  → source citations appended to response
```

### 5.2 Metadata filter (Qdrant)

```python
Filter(must=[
    FieldCondition(
        key="dept_ids",
        match=MatchAny(any=[dept_id, "global"])
    )
])
```

### 5.3 System prompt structure

```
{dept.system_prompt}

You are an assistant for the {dept.name} department.
Answer questions based only on the provided company documents.
If the answer is not in the documents, say so clearly.
Always cite the source document name when using information from it.

## Relevant documents:
{retrieved_chunks}

## Available workflow actions:
{workflow_summary_for_dept}
```

---

## 6. Intent Detection

Before every user message is processed, a lightweight intent classification determines routing:

**Prompt:**
```
Classify this message as one of: DOC_QUESTION, WORKFLOW_REQUEST, GENERAL_CHAT.
- DOC_QUESTION: asking about information in company documents
- WORKFLOW_REQUEST: asking to automate, create, trigger, or build a process/workflow
- GENERAL_CHAT: greetings, clarifications, or off-topic

Message: "{user_message}"
Respond with only the classification label.
```

- `DOC_QUESTION` → RAG pipeline
- `WORKFLOW_REQUEST` → n8n workflow designer
- `GENERAL_CHAT` → direct LLM response (no retrieval)

---

## 7. LLM Routing

### 7.1 Claude (default)

```typescript
import Anthropic from '@anthropic-ai/sdk'
const client = new Anthropic()

// Streaming response
const stream = await client.messages.stream({
  model: dept.llm_model,  // e.g. "claude-sonnet-4-20250514"
  max_tokens: 2048,
  system: systemPrompt,
  messages: conversationHistory,
})
```

### 7.2 Ollama (local fallback)

Ollama exposes an OpenAI-compatible API at `http://localhost:11434/v1`.
Use the OpenAI SDK pointed at the Ollama base URL:

```typescript
import OpenAI from 'openai'
const ollama = new OpenAI({
  baseURL: process.env.OLLAMA_BASE_URL + '/v1',
  apiKey: 'ollama',  // required but ignored
})

const stream = await ollama.chat.completions.create({
  model: dept.llm_model,  // e.g. "llama3.2", "mistral"
  stream: true,
  messages: [{ role: 'system', content: systemPrompt }, ...conversationHistory],
})
```

### 7.3 Model selector logic

```typescript
function getLLMClient(dept: Department) {
  if (dept.llm_model.startsWith('claude-')) {
    return { client: anthropicClient, type: 'anthropic' }
  }
  return { client: ollamaClient, type: 'ollama' }
}
```

---

## 8. n8n Workflow Integration

### 8.1 Workflow request flow

1. Intent detector returns `WORKFLOW_REQUEST`
2. Fetch available workflow templates tagged for this dept from n8n API
3. Send to Claude with a workflow-design system prompt (see below)
4. Claude returns a valid n8n workflow JSON + human-readable description
5. POST workflow JSON to n8n API → workflow created in "inactive" state
6. Insert `workflow_requests` record with status `pending`
7. Notify dept admin(s) via email (n8n SMTP node) and/or Slack
8. Return to user: "Your workflow request has been sent for approval."

### 8.2 Workflow design system prompt

```
You are an n8n workflow architect. Design a workflow based on the user's request.

Available node types for this department:
{dept_available_nodes}

Rules:
- Every workflow MUST start with a Webhook trigger node
- Every workflow MUST include a Wait node immediately after the trigger (for admin approval)
- Every workflow MUST include an IF node checking {{ $json.approved === true }}
- The true branch contains the actual work nodes
- The false branch sends a rejection notification
- The final node MUST be an HTTP Request node POSTing status to: {callback_url}
- Maximum 15 nodes per workflow
- Only use nodes from the available node types list above

User request: "{user_message}"

Respond with a JSON object containing:
{
  "description": "Plain English description of what this workflow does",
  "workflow": { ...valid n8n workflow JSON... }
}
```

### 8.3 Admin approval flow

**Approval request notification** (sent to dept_admin):
- Summary of workflow + what it will do
- Link to admin panel: `{APP_URL}/admin/workflows/{request_id}`
- Approve button → calls `POST /api/workflows/{request_id}/approve`
- Reject button → calls `POST /api/workflows/{request_id}/reject`

**On approval:**
```typescript
// 1. Update DB record
await prisma.workflowRequest.update({
  where: { id: requestId },
  data: { status: 'approved', approvedBy: adminId, approvedAt: new Date() }
})

// 2. Resume n8n execution (sends signal to the Wait node)
await fetch(request.n8nResumeUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ approved: true, approvedBy: admin.email })
})

// 3. Notify requesting user via chat status update (SSE)
```

**On rejection:**
```typescript
// 1. Update DB record
await prisma.workflowRequest.update({
  where: { id: requestId },
  data: { status: 'rejected', rejectedBy: adminId, rejectionReason: reason }
})

// 2. Resume n8n with approved: false
await fetch(request.n8nResumeUrl, {
  method: 'POST',
  body: JSON.stringify({ approved: false, reason })
})
```

---

## 9. Database Schema (Prisma)

```prisma
model Department {
  id            String   @id @default(cuid())
  name          String
  systemPrompt  String?  @db.Text
  llmModel      String   @default("claude-sonnet-4-20250514")
  embedModel    String   @default("text-embedding-3-small")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  users             User[]
  documentSources   DocumentSource[]
  workflowRequests  WorkflowRequest[]
}

model User {
  id         String     @id @default(cuid())
  clerkId    String     @unique
  email      String     @unique
  name       String?
  role       UserRole   @default(MEMBER)
  deptId     String
  dept       Department @relation(fields: [deptId], references: [id])
  createdAt  DateTime   @default(now())

  workflowRequests   WorkflowRequest[] @relation("requestedBy")
  workflowApprovals  WorkflowRequest[] @relation("approvedBy")
}

enum UserRole {
  MEMBER
  DEPT_ADMIN
  SUPER_ADMIN
}

model DocumentSource {
  id          String     @id @default(cuid())
  name        String
  sourceType  SourceType
  sourceUrl   String?
  sourcePath  String?
  deptId      String
  dept        Department @relation(fields: [deptId], references: [id])
  isGlobal    Boolean    @default(false)
  lastSynced  DateTime?
  createdAt   DateTime   @default(now())
}

enum SourceType {
  GOOGLE_DRIVE
  SHAREPOINT
  LOCAL
}

model WorkflowRequest {
  id              String                @id @default(cuid())
  userMessage     String                @db.Text
  description     String                @db.Text
  n8nWorkflowId   String?
  n8nResumeUrl    String?
  status          WorkflowRequestStatus @default(PENDING)
  rejectionReason String?
  deptId          String
  dept            Department            @relation(fields: [deptId], references: [id])
  requestedById   String
  requestedBy     User                  @relation("requestedBy", fields: [requestedById], references: [id])
  approvedById    String?
  approvedBy      User?                 @relation("approvedBy", fields: [approvedById], references: [id])
  approvedAt      DateTime?
  createdAt       DateTime              @default(now())
  updatedAt       DateTime              @updatedAt
}

enum WorkflowRequestStatus {
  PENDING
  APPROVED
  REJECTED
  EXECUTED
  FAILED
}

model ChatSession {
  id        String    @id @default(cuid())
  userId    String
  deptId    String
  messages  Json      @default("[]")
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}
```

---

## 10. API Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/chat` | member | Send message, stream response |
| GET | `/api/chat/history` | member | Fetch session history |
| GET | `/api/departments` | super_admin | List all departments |
| POST | `/api/departments` | super_admin | Create department |
| PUT | `/api/departments/:id` | dept_admin | Update dept config |
| GET | `/api/departments/:id/users` | dept_admin | List dept users |
| POST | `/api/departments/:id/users` | dept_admin | Add user to dept |
| GET | `/api/departments/:id/sources` | dept_admin | List doc sources |
| POST | `/api/departments/:id/sources` | dept_admin | Add doc source |
| DELETE | `/api/departments/:id/sources/:sid` | dept_admin | Remove doc source |
| GET | `/api/workflows` | dept_admin | List workflow requests for dept |
| POST | `/api/workflows/:id/approve` | dept_admin | Approve workflow |
| POST | `/api/workflows/:id/reject` | dept_admin | Reject workflow |
| POST | `/api/ingestion/drive-webhook` | service | Google Drive push notification |
| POST | `/api/ingestion/sharepoint-webhook` | service | SharePoint change notification |

---

## 11. Frontend Pages

| Route | Component | Auth |
|---|---|---|
| `/` | Landing / login redirect | public |
| `/chat` | Main chat interface | member |
| `/admin` | Dept admin dashboard | dept_admin |
| `/admin/workflows` | Pending workflow approvals | dept_admin |
| `/admin/documents` | Document source management | dept_admin |
| `/admin/users` | User management | dept_admin |
| `/admin/settings` | Dept settings (system prompt, LLM model) | dept_admin |
| `/superadmin` | Super admin panel | super_admin |
| `/superadmin/departments` | Create/manage all departments | super_admin |

---

## 12. Non-Functional Requirements

- **Streaming** — LLM responses must stream token-by-token using Vercel AI SDK `useChat`
- **Latency** — First token should appear within 2 seconds of user sending message
- **Security** — Department isolation is enforced at the DB query level, not just UI
- **Approval timeout** — n8n Wait nodes expire after 72 hours; send reminder at 48h
- **Offline resilience** — If Ollama is configured but unavailable, log error and return graceful message
- **Audit log** — All workflow approvals/rejections are permanently recorded in the DB
