import type { Department } from '@prisma/client'
import { getLLMClient } from './router'
import { detectIntent } from './intent'
import { retrieve } from '@/lib/rag/retrieve'
import { buildContext } from '@/lib/rag/buildContext'
import { buildSystemPrompt, buildDiagramPrompt } from './systemPrompt'
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
  let context: { contextBlock: string; citations: CitationSource[]; avgScore: number | null } =
    { contextBlock: '', citations: [], avgScore: null }

  if (intent === 'DOC_QUESTION' || intent === 'DIAGRAM_REQUEST') {
    const chunks = await retrieve(userMessage, dept)
    context = buildContext(chunks)
    citations = context.citations
  }

  if (intent === 'WORKFLOW_REQUEST') {
    const placeholder = 'Your workflow request has been received and is pending admin approval.'
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(placeholder))
        controller.close()
      },
    })
    return { stream, citations: [], intent }
  }

  const systemPrompt = intent === 'DIAGRAM_REQUEST'
    ? buildDiagramPrompt(dept, context)
    : buildSystemPrompt(dept, context)
  const { client } = getLLMClient(dept)
  const messages = [...history, { role: 'user' as const, content: userMessage }]

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const s = await client.chat.completions.create({
          model: dept.llmModel,
          stream: true,
          messages: [{ role: 'system', content: systemPrompt }, ...messages],
        })
        for await (const chunk of s) {
          const text = chunk.choices[0]?.delta?.content ?? ''
          if (text) controller.enqueue(new TextEncoder().encode(text))
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
