import OpenAI from 'openai'
import type { Department } from '@prisma/client'

export type LLMClient = { type: 'ollama'; client: OpenAI }

export function getLLMClient(dept: Department): LLMClient {
  const client = new OpenAI({
    baseURL: (process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434') + '/v1',
    apiKey: 'ollama',
  })
  return { type: 'ollama', client }
}
