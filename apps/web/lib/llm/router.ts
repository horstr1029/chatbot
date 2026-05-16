import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import type { Department } from '@prisma/client'

export type LLMClient =
  | { type: 'anthropic'; client: Anthropic }
  | { type: 'ollama'; client: OpenAI }

const anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const ollamaClient = new OpenAI({
  baseURL: (process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434') + '/v1',
  apiKey: 'ollama',
})

export function getLLMClient(dept: Department): LLMClient {
  if (dept.llmModel.startsWith('claude-')) {
    return { type: 'anthropic', client: anthropicClient }
  }
  return { type: 'ollama', client: ollamaClient }
}
