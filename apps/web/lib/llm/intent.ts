import type { Department } from '@prisma/client'
import { getLLMClient } from './router'

export type Intent = 'DOC_QUESTION' | 'WORKFLOW_REQUEST' | 'FORM_REQUEST' | 'REMINDER_REQUEST' | 'CROSS_DEPT_REQUEST' | 'LEAVE_BALANCE_QUERY' | 'DIAGRAM_REQUEST' | 'GENERAL_CHAT'

const VALID_INTENTS = new Set<Intent>(['DOC_QUESTION', 'WORKFLOW_REQUEST', 'FORM_REQUEST', 'REMINDER_REQUEST', 'CROSS_DEPT_REQUEST', 'LEAVE_BALANCE_QUERY', 'DIAGRAM_REQUEST', 'GENERAL_CHAT'])

const PROMPT = (message: string) =>
  `Classify the user message below into exactly one of: DOC_QUESTION, WORKFLOW_REQUEST, FORM_REQUEST, REMINDER_REQUEST, CROSS_DEPT_REQUEST, LEAVE_BALANCE_QUERY, DIAGRAM_REQUEST, GENERAL_CHAT.

Definitions:
- DOC_QUESTION: any question about company-specific topics, policies, procedures, rules, equipment, products, guidelines, or information that would likely be found in the company knowledge base (e.g. "what is the leave policy?", "how do I request equipment?", "what are the safety procedures?", "show me the HR policy", "what documents are available?", "explain the onboarding process", "what are the working hours?")
- WORKFLOW_REQUEST: explicitly asking to automate, build, create, trigger, or run a process or workflow (e.g. "create an onboarding workflow", "automate my leave request", "set up a reminder process")
- FORM_REQUEST: asking to fill in, submit, or complete a form or application (e.g. "submit a leave request", "fill in the expense form", "I need to request leave", "I want to apply for", "submit a request for", "apply for leave")
- REMINDER_REQUEST: asking to set up a recurring reminder or scheduled check (e.g. "remind me every Monday", "send me a weekly summary", "alert me on the 1st of each month", "notify me daily at 9am")
- CROSS_DEPT_REQUEST: asking to send a request or task to another department (e.g. "ask Finance to review my budget", "send a request to HR", "I need IT to help with", "route this to Legal")
- LEAVE_BALANCE_QUERY: asking about their own leave balance, days available, or leave entitlement (e.g. "how many leave days do I have?", "what is my leave balance?", "how many days off do I have left?", "do I have any leave available?")
- DIAGRAM_REQUEST: asking to create, draw, generate, or show a diagram, wiring diagram, flowchart, process map, schematic, or any visual representation (e.g. "create a wiring diagram", "draw a flowchart for", "show me the process diagram", "generate a schematic for", "diagram the steps")
- GENERAL_CHAT: greetings, thank-you, off-topic, clarifications, or anything that doesn't fit the above

Rules:
- Default to DOC_QUESTION for any question about company topics, policies, products, procedures, or anything that might be in a knowledge base
- Only classify as WORKFLOW_REQUEST if the user explicitly asks to build or automate something
- Classify as FORM_REQUEST if the user wants to submit or fill a concrete request or application
- Classify as REMINDER_REQUEST only if the user wants a recurring/scheduled notification — not a one-off reminder
- Classify as CROSS_DEPT_REQUEST if the user explicitly wants to involve or route something to a different department
- Classify as LEAVE_BALANCE_QUERY if the user is asking how many leave days they have remaining
- Classify as DIAGRAM_REQUEST if the user explicitly asks to generate, create, or draw any kind of diagram or visual

Message: "${message}"
Respond with only the classification label, nothing else.`

const LEAVE_BALANCE_KEYWORDS = [
  'leave balance', 'leave days', 'days of leave', 'days leave',
  'leave available', 'leave remaining', 'leave entitlement', 'my leave',
]

function quickLeaveBalanceCheck(message: string): boolean {
  const lower = message.toLowerCase()
  return LEAVE_BALANCE_KEYWORDS.some((kw) => lower.includes(kw))
}

export async function detectIntent(message: string, dept: Department): Promise<Intent> {
  if (quickLeaveBalanceCheck(message)) return 'LEAVE_BALANCE_QUERY'

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
