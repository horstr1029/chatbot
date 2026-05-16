import type { Department } from '@prisma/client'
import { getLLMClient } from './router'

export type Intent = 'DOC_QUESTION' | 'WORKFLOW_REQUEST' | 'GENERAL_CHAT'

const VALID_INTENTS = new Set<Intent>(['DOC_QUESTION', 'WORKFLOW_REQUEST', 'GENERAL_CHAT'])

const PROMPT = (message: string) =>
  `Classify this message as one of: DOC_QUESTION, WORKFLOW_REQUEST, GENERAL_CHAT.
- DOC_QUESTION: asking about information in company documents
- WORKFLOW_REQUEST: asking to automate, create, trigger, or build a process/workflow
- GENERAL_CHAT: greetings, clarifications, or off-topic

Message: "${message}"
Respond with only the classification label.`

export async function detectIntent(message: string, dept: Department): Promise<Intent> {
  const { client } = getLLMClient(dept)

  const res = await client.chat.completions.create({
    model: dept.llmModel,
    max_tokens: 10,
    messages: [{ role: 'user', content: PROMPT(message) }],
  })

  const label = (res.choices[0].message.content ?? '').trim().toUpperCase()
  if (VALID_INTENTS.has(label as Intent)) return label as Intent
  return 'GENERAL_CHAT'
}
