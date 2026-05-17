export const dynamic = 'force-dynamic'

import { streamText } from 'ai'
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

  // ── RAG / general path ─────────────────────────────────────────
  let context = { contextBlock: '', citations: [] as { id: string; name: string; url: string; text: string }[] }
  if (intent === 'DOC_QUESTION') {
    const chunks = await retrieve(userMessage, dept)
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
      },
    })
  } catch {
    const errorResult = await streamText({
      model: ollamaProvider()('mistral:7b-instruct'),
      messages: [{ role: 'user', content: 'repeat exactly: AI model unavailable. Please contact your admin.' }],
      system: 'Repeat the message exactly as given, word for word.',
    })
    return errorResult.toDataStreamResponse({ headers: { 'x-citations': '[]', 'x-intent': intent } })
  }
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

    const wfRecord = await prisma.workflowRequest.create({
      data: {
        userMessage,
        description,
        n8nWorkflowId: n8nWorkflow.id,
        n8nResumeUrl,
        status: 'PENDING',
        deptId,
        requestedById: userId,
      },
    })

    await scheduleWorkflowReminder(wfRecord.id, deptId)

    return `Your workflow request has been submitted for admin approval.\n\n**Workflow:** ${description}\n\nYou'll be notified once an admin reviews it.`
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return `I understood your workflow request but couldn't create it automatically: ${msg}\n\nPlease contact your admin to set it up manually.`
  }
}
