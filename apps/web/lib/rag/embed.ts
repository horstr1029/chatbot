import OpenAI from 'openai'
import type { Department } from '@prisma/client'

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

export async function embedQuery(query: string, dept: Department): Promise<number[]> {
  if (dept.embedModel === 'nomic-embed-text') {
    return embedOllama(query, dept.embedModel)
  }
  return embedOpenAI(query, dept.embedModel)
}

async function embedOpenAI(text: string, model: string): Promise<number[]> {
  const res = await getOpenAI().embeddings.create({ model, input: text })
  return res.data[0].embedding
}

async function embedOllama(text: string, model: string): Promise<number[]> {
  const base = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
  const res = await fetch(`${base}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt: text }),
  })
  if (!res.ok) throw new Error(`Ollama embed error: ${res.status}`)
  const data = await res.json()
  return data.embedding as number[]
}
