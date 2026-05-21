export const dynamic = 'force-dynamic'

import { streamText, StreamData } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { deptMiddleware } from '@/lib/auth/middleware'
import { getDept } from '@/lib/dept/getDept'
import { detectIntent } from '@/lib/llm/intent'
import { retrieve } from '@/lib/rag/retrieve'
import { buildContext } from '@/lib/rag/buildContext'
import { buildSystemPrompt } from '@/lib/llm/systemPrompt'
import { designWorkflow } from '@/lib/n8n/designer'
import { n8nClient } from '@/lib/n8n/client'
import { prisma } from '@/lib/db/client'
import { apiResponse } from '@/lib/api/response'
import { rateLimit } from '@/lib/api/rateLimit'
import { scheduleWorkflowReminder } from '@/lib/queue/reminder.queue'
import { fillForm } from '@/lib/llm/formFiller'
import type { FormField } from '@/lib/llm/formFiller'
import { parseReminder } from '@/lib/llm/reminderParser'
import { nextCronRun } from '@/lib/queue/reminder-user.queue'
import { notifyUser } from '@/lib/push/webpush'
import { sendWorkflowApprovalRequestEmail } from '@/lib/email/mailer'
import { z } from 'zod'

function log(level: 'info' | 'warn' | 'error', event: string, data?: object) {
  process.stdout.write(JSON.stringify({ ts: new Date().toISOString(), level, event, ...data }) + '\n')
}

function ollamaProvider() {
  return createOpenAI({
    baseURL: (process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434') + '/v1',
    apiKey: 'ollama',
  })
}

const bodySchema = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })),
})

export async function POST(req: Request) {
  let ctx
  try {
    ctx = await deptMiddleware()
  } catch {
    return apiResponse.error('UNAUTHORIZED', 'Unauthorized', 401)
  }

  try {
    await rateLimit(`chat:${ctx.user_id}`, 20, 60)
  } catch {
    log('warn', 'rate_limit_exceeded', { user_id: ctx.user_id })
    return apiResponse.error('RATE_LIMITED', 'Too many requests. Please wait a moment.', 429)
  }

  const body = bodySchema.safeParse(await req.json())
  if (!body.success) return apiResponse.error('INVALID_REQUEST', 'Invalid body', 400)

  const { messages } = body.data
  const userMessage = messages.at(-1)?.content ?? ''
  const dept = await getDept(ctx.dept_id)

  log('info', 'chat_request', { user_id: ctx.user_id, dept_id: ctx.dept_id, model: dept.llmModel })

  const intent = await detectIntent(userMessage, dept)

  // ── Workflow request path ──────────────────────────────────────
  if (intent === 'WORKFLOW_REQUEST') {
    const replyText = await handleWorkflowRequest(userMessage, dept.id, ctx.user_id, dept)
    const result = await streamText({
      model: ollamaProvider()(dept.llmModel),
      messages: [{ role: 'user', content: replyText }],
      system: 'Repeat the message exactly as given, word for word.',
    })
    return result.toDataStreamResponse({ headers: { 'x-intent': intent } })
  }

  // ── Reminder request path ─────────────────────────────────────
  if (intent === 'REMINDER_REQUEST') {
    const parsed = await parseReminder(userMessage, dept.llmModel)
    if (parsed) {
      const nextRunAt = nextCronRun(parsed.cronExpr)
      await prisma.reminder.create({
        data: {
          userId: ctx.user_id,
          deptId: ctx.dept_id,
          title: parsed.title,
          topic: parsed.topic,
          cronExpr: parsed.cronExpr,
          scheduleLabel: parsed.scheduleLabel,
          nextRunAt,
          active: true,
        },
      })
      const replyText = `Done! I've set a reminder: "${parsed.title}" — ${parsed.scheduleLabel}. You'll receive a push notification and a knowledge-base briefing each time.`
      const result = await streamText({
        model: ollamaProvider()(dept.llmModel),
        messages: [{ role: 'user', content: replyText }],
        system: 'Repeat the message exactly as given, word for word.',
      })
      return result.toDataStreamResponse({ headers: { 'x-intent': 'REMINDER_REQUEST' } })
    }
    // Fall through to general chat if parsing failed
  }

  // ── Cross-dept request path ────────────────────────────────────
  if (intent === 'CROSS_DEPT_REQUEST') {
    const replyText = `To send a request to another department, click the globe icon in the top bar. You can describe your request and select the target department from there.`
    const result = await streamText({
      model: ollamaProvider()(dept.llmModel),
      messages: [{ role: 'user', content: replyText }],
      system: 'Repeat the message exactly as given, word for word.',
    })
    return result.toDataStreamResponse({ headers: { 'x-intent': 'CROSS_DEPT_REQUEST' } })
  }

  // ── Form request path ──────────────────────────────────────────
  if (intent === 'FORM_REQUEST') {
    const formResult = await handleFormRequest(userMessage, ctx.dept_id, dept.llmModel)
    if (formResult) {
      const { template, filled } = formResult
      const replyText = "I've pre-filled the form below — review and submit when ready."
      const sd = new StreamData()
      sd.append({ type: 'form', template, filled })
      const result = await streamText({
        model: ollamaProvider()(dept.llmModel),
        messages: [{ role: 'user', content: replyText }],
        system: 'Repeat the message exactly as given, word for word.',
        onFinish: () => sd.close(),
      })
      return result.toDataStreamResponse({
        headers: { 'x-intent': 'FORM_REQUEST' },
        data: sd,
      })
    }
    // No templates — fall through to normal chat
  }

  // ── RAG / general path ─────────────────────────────────────────
  let context: { contextBlock: string; citations: { id: string; name: string; url: string; text: string }[]; avgScore: number | null } =
    { contextBlock: '', citations: [], avgScore: null }
  if (intent === 'DOC_QUESTION') {
    const memberships = await prisma.userDepartment.findMany({
      where: { userId: ctx.user_id },
      select: { deptId: true },
    })
    const extraDeptIds = memberships.map((m) => m.deptId).filter((id) => id !== dept.id)
    const chunks = await retrieve(userMessage, dept, extraDeptIds)
    context = buildContext(chunks)
  }

  const systemPrompt = buildSystemPrompt(dept, context)
  const model = ollamaProvider()(dept.llmModel)

  try {
    const result = await streamText({ model, system: systemPrompt, messages })
    return result.toDataStreamResponse({
      headers: {
        'x-citations': JSON.stringify(context.citations),
        'x-intent': intent,
        'x-confidence': context.avgScore !== null ? String(context.avgScore) : '',
      },
    })
  } catch {
    const errorResult = await streamText({
      model: ollamaProvider()('mistral:7b-instruct'),
      messages: [{ role: 'user', content: 'repeat exactly: AI model unavailable. Please contact your admin.' }],
      system: 'Repeat the message exactly as given, word for word.',
    })
    return errorResult.toDataStreamResponse({ headers: { 'x-citations': '[]', 'x-intent': intent, 'x-confidence': '' } })
  }
}

async function handleFormRequest(
  userMessage: string,
  deptId: string,
  llmModel: string,
): Promise<{ template: { id: string; name: string; fields: FormField[] }; filled: Record<string, string> } | null> {
  const templates = await prisma.formTemplate.findMany({
    where: { deptId, active: true },
    orderBy: { createdAt: 'desc' },
  })

  if (templates.length === 0) return null

  // Find best matching template — check if any template name words appear in userMessage
  const lower = userMessage.toLowerCase()
  let best = templates[0]
  let bestScore = 0

  for (const t of templates) {
    const words = t.name.toLowerCase().split(/\s+/)
    const score = words.filter((w) => w.length > 2 && lower.includes(w)).length
    if (score > bestScore) {
      bestScore = score
      best = t
    }
  }

  const fields = best.fields as FormField[]
  const filled = await fillForm(userMessage, { id: best.id, name: best.name, fields }, llmModel)
  return { template: { id: best.id, name: best.name, fields }, filled }
}

async function handleWorkflowRequest(
  userMessage: string,
  deptId: string,
  userId: string,
  dept: Awaited<ReturnType<typeof getDept>>,
): Promise<string> {
  try {
    const { description, workflow } = await designWorkflow(userMessage, dept)

    const n8nWorkflow = await n8nClient.createWorkflow({
      name: description.slice(0, 80),
      active: false,
      tags: [{ id: '', name: `dept:${deptId}` }],
      nodes: (workflow.nodes as unknown[]) ?? [],
      connections: workflow.connections ?? {},
    })

    const n8nResumeUrl = await n8nClient.getExecutionResumeUrl(n8nWorkflow.id)

    const [wfRecord, requester] = await Promise.all([
      prisma.workflowRequest.create({
        data: {
          userMessage,
          description,
          n8nWorkflowId: n8nWorkflow.id,
          n8nResumeUrl,
          status: 'PENDING',
          deptId,
          requestedById: userId,
        },
      }),
      prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),
    ])
    const requesterName = requester?.name ?? requester?.email ?? 'A user'

    // ── Multi-step approval chain ──────────────────────────────
    const chain = dept.approvalChain as { stepOrder: number; label: string; deptId: string }[] | null
    if (chain && chain.length > 0) {
      await prisma.workflowApprovalStep.createMany({
        data: chain.map((s) => ({
          workflowId: wfRecord.id,
          stepOrder: s.stepOrder,
          label: s.label,
          approvingDeptId: s.deptId,
        })),
      })

      // Notify first step's dept admins (push + email)
      const firstStep = chain[0]
      const firstAdmins = await prisma.userDepartment.findMany({
        where: { deptId: firstStep.deptId, role: 'DEPT_ADMIN' },
        include: { user: { select: { name: true, email: true } } },
      })
      await Promise.all([
        ...firstAdmins.map(({ userId: adminId }) =>
          notifyUser(adminId, {
            title: 'Workflow approval needed',
            body: description.slice(0, 80),
            url: '/admin/workflows',
          }),
        ),
        sendWorkflowApprovalRequestEmail(
          firstAdmins.map((a) => ({ email: a.user.email, name: a.user.name })),
          dept.name,
          requesterName,
          description,
          firstStep.label,
        ),
      ])
    } else {
      // Single-step: notify this dept's admins (push + email)
      const deptAdmins = await prisma.userDepartment.findMany({
        where: { deptId, role: 'DEPT_ADMIN' },
        include: { user: { select: { name: true, email: true } } },
      })
      await Promise.all([
        ...deptAdmins.map(({ userId: adminId }) =>
          notifyUser(adminId, {
            title: 'Workflow approval needed',
            body: description.slice(0, 80),
            url: '/admin/workflows',
          }),
        ),
        sendWorkflowApprovalRequestEmail(
          deptAdmins.map((a) => ({ email: a.user.email, name: a.user.name })),
          dept.name,
          requesterName,
          description,
        ),
      ])
    }
    // ── End approval notifications ─────────────────────────────

    await scheduleWorkflowReminder(wfRecord.id, deptId)

    const chainNote = chain && chain.length > 0
      ? ` This request requires ${chain.length} approval step${chain.length > 1 ? 's' : ''}.`
      : ''

    return `Your workflow request has been submitted for admin approval.\n\n**Workflow:** ${description}\n\nYou'll be notified once an admin reviews it.${chainNote}`
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return `I understood your workflow request but couldn't create it automatically: ${msg}\n\nPlease contact your admin to set it up manually.`
  }
}
