import type { Department } from '@prisma/client'
import { getLLMClient } from './router'

export type Intent = 'DOC_QUESTION' | 'WORKFLOW_REQUEST' | 'GENERAL_CHAT'

const VALID_INTENTS = new Set<Intent>(['DOC_QUESTION', 'WORKFLOW_REQUEST', 'GENERAL_CHAT'])

const PROMPT = (message: string) =>
  `Classify the user message below into exactly one of: DOC_QUESTION, WORKFLOW_REQUEST, GENERAL_CHAT.

Definitions:
- DOC_QUESTION: asking about, searching for, or listing company documents, files, policies, or information stored in the knowledge base (e.g. "what documents do you have?", "show me the HR policy", "what files are available?", "find the leave application form")
- WORKFLOW_REQUEST: explicitly asking to automate, build, create, trigger, or run a process or workflow (e.g. "create an onboarding workflow", "automate my leave request", "set up a reminder process")
- GENERAL_CHAT: greetings, thank-you, off-topic, clarifications, or anything that doesn't fit the above

Rules:
- Questions about WHAT documents exist are DOC_QUESTION, not WORKFLOW_REQUEST
- Only classify as WORKFLOW_REQUEST if the user explicitly asks to build or automate something

Message: "${message}"
Respond with only the classification label, nothing else.`

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
