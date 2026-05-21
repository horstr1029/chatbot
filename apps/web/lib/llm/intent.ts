import type { Department } from '@prisma/client'
import { getLLMClient } from './router'

export type Intent = 'DOC_QUESTION' | 'WORKFLOW_REQUEST' | 'FORM_REQUEST' | 'REMINDER_REQUEST' | 'CROSS_DEPT_REQUEST' | 'LEAVE_BALANCE_QUERY' | 'GENERAL_CHAT'

const VALID_INTENTS = new Set<Intent>(['DOC_QUESTION', 'WORKFLOW_REQUEST', 'FORM_REQUEST', 'REMINDER_REQUEST', 'CROSS_DEPT_REQUEST', 'LEAVE_BALANCE_QUERY', 'GENERAL_CHAT'])

const PROMPT = (message: string) =>
  `Classify the user message below into exactly one of: DOC_QUESTION, WORKFLOW_REQUEST, FORM_REQUEST, REMINDER_REQUEST, CROSS_DEPT_REQUEST, LEAVE_BALANCE_QUERY, GENERAL_CHAT.

Definitions:
- DOC_QUESTION: asking about, searching for, or listing company documents, files, policies, or information stored in the knowledge base (e.g. "what documents do you have?", "show me the HR policy", "what files are available?", "find the leave application form")
- WORKFLOW_REQUEST: explicitly asking to automate, build, create, trigger, or run a process or workflow (e.g. "create an onboarding workflow", "automate my leave request", "set up a reminder process")
- FORM_REQUEST: asking to fill in, submit, or complete a form or application (e.g. "submit a leave request", "fill in the expense form", "I need to request leave", "I want to apply for", "submit a request for", "apply for leave")
- REMINDER_REQUEST: asking to set up a recurring reminder or scheduled check (e.g. "remind me every Monday", "send me a weekly summary", "alert me on the 1st of each month", "notify me daily at 9am")
- CROSS_DEPT_REQUEST: asking to send a request or task to another department (e.g. "ask Finance to review my budget", "send a request to HR", "I need IT to help with", "route this to Legal")
- LEAVE_BALANCE_QUERY: asking about their own leave balance, days available, or leave entitlement (e.g. "how many leave days do I have?", "what is my leave balance?", "how many days off do I have left?", "do I have any leave available?")
- GENERAL_CHAT: greetings, thank-you, off-topic, clarifications, or anything that doesn't fit the above

Rules:
- Questions about WHAT documents exist are DOC_QUESTION, not WORKFLOW_REQUEST or FORM_REQUEST
- Only classify as WORKFLOW_REQUEST if the user explicitly asks to build or automate something
- Classify as FORM_REQUEST if the user wants to submit or fill a concrete request or application
- Classify as REMINDER_REQUEST only if the user wants a recurring/scheduled notification — not a one-off reminder
- Classify as CROSS_DEPT_REQUEST if the user explicitly wants to involve or route something to a different department
- Classify as LEAVE_BALANCE_QUERY if the user is asking how many leave days they have remaining

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
