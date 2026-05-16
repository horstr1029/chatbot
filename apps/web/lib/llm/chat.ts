import type { Department } from '@prisma/client'
import { getLLMClient } from './router'
import { detectIntent } from './intent'
import { retrieve } from '@/lib/rag/retrieve'
import { buildContext } from '@/lib/rag/buildContext'
import { buildSystemPrompt } from './systemPrompt'
import type { CitationSource } from '@/lib/rag/buildContext'

export type ChatMessage = { role: 'user' | 'assistant'; content: string }

export type StreamResult = {
  stream: ReadableStream
  citations: CitationSource[]
  intent: string
}

export async function streamChat(
  userMessage: string,
  history: ChatMessage[],
  dept: Department,
): Promise<StreamResult> {
  const intent = await detectIntent(userMessage, dept)

  let citations: CitationSource[] = []
  let context = { contextBlock: '', citations: [] as CitationSource[] }

  if (intent === 'DOC_QUESTION') {
    const chunks = await retrieve(userMessage, dept)
    context = buildContext(chunks)
    citations = context.citations
  }

  if (intent === 'WORKFLOW_REQUEST') {
    // Workflow path handled in TASK-12 — return placeholder stream for now
    const placeholder = 'Your workflow request has been received. This feature is coming soon.'
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(placeholder))
        controller.close()
      },
    })
    return { stream, citations: [], intent }
  }

  const systemPrompt = buildSystemPrompt(dept, context)
  const { type, client } = getLLMClient(dept)
  const messages = [...history, { role: 'user' as const, content: userMessage }]

  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (type === 'anthropic') {
          const anthropic = client as import('@anthropic-ai/sdk').default
          const s = anthropic.messages.stream({
            model: dept.llmModel,
            max_tokens: 2048,
            system: systemPrompt,
            messages,
          })
          for await (const chunk of s) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              controller.enqueue(new TextEncoder().encode(chunk.delta.text))
            }
          }
        } else {
          const ollama = client as import('openai').default
          const s = await ollama.chat.completions.create({
            model: dept.llmModel,
            stream: true,
            messages: [{ role: 'system', content: systemPrompt }, ...messages],
          })
          for await (const chunk of s) {
            const text = chunk.choices[0]?.delta?.content ?? ''
            if (text) controller.enqueue(new TextEncoder().encode(text))
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'LLM error'
        controller.enqueue(new TextEncoder().encode(`\n\n[Error: ${msg}]`))
      } finally {
        controller.close()
      }
    },
  })

  return { stream, citations, intent }
}
