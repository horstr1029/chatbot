import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import type { Department } from '@prisma/client'
import { retrieve } from '@/lib/rag/retrieve'
import { buildContext } from '@/lib/rag/buildContext'

function ollamaProvider() {
  return createOpenAI({
    baseURL: (process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434') + '/v1',
    apiKey: 'ollama',
  })
}

export async function generateMeetingBrief(
  title: string,
  agenda: string,
  dept: Department,
  extraDeptIds: string[],
): Promise<ReturnType<typeof streamText>> {
  const query = `${title} ${agenda}`.trim()
  const chunks = await retrieve(query, dept, extraDeptIds)
  const { contextBlock } = buildContext(chunks)

  const systemPrompt = [
    'You are preparing a meeting brief for a corporate meeting.',
    'Given the context documents, write a concise briefing covering:',
    '1. Key background and relevant context',
    '2. Relevant policies or procedures that apply',
    '3. Open questions or items that need clarification',
    '4. 3–5 suggested agenda points',
    'Be specific and cite sources by name when referencing documents.',
    'Write in clear, professional prose. Keep the brief under 600 words.',
    contextBlock ? `\n## Available documents:\n${contextBlock}` : '\nNo relevant documents found — provide a general meeting brief structure.',
  ].join('\n')

  const userPrompt = agenda
    ? `Meeting title: ${title}\nProposed agenda: ${agenda}\n\nPlease write a meeting brief.`
    : `Meeting title: ${title}\n\nPlease write a meeting brief.`

  return streamText({
    model: ollamaProvider()(dept.llmModel),
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })
}
