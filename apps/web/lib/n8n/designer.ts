import OpenAI from 'openai'
import type { Department } from '@prisma/client'
import { getTemplatesForDept, summariseTemplates } from './templates'

const CALLBACK_URL = `${process.env.NEXT_PUBLIC_APP_URL}/api/workflows/callback`

type DesignResult = {
  description: string
  workflow: Record<string, unknown>
}

export async function designWorkflow(
  userMessage: string,
  dept: Department,
): Promise<DesignResult> {
  const templates = await getTemplatesForDept(dept.id)
  const templateSummary = summariseTemplates(templates)

  const availableNodes = templates
    .flatMap((t) => t.nodeTypes)
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(', ') || 'Webhook, Wait, IF, HTTP Request, Send Email'

  const systemPrompt = `You are an n8n workflow architect. Design a workflow based on the user's request.

Available node types for this department:
${availableNodes}

Available templates:
${templateSummary}

Rules:
- Every workflow MUST start with a Webhook trigger node
- Every workflow MUST include a Wait node immediately after the trigger (for admin approval)
- Every workflow MUST include an IF node checking {{ $json.approved === true }}
- The true branch contains the actual work nodes
- The false branch sends a rejection notification
- The final node MUST be an HTTP Request node POSTing status to: ${CALLBACK_URL}
- Maximum 15 nodes per workflow
- Only use nodes from the available node types list above

Respond with a JSON object containing:
{
  "description": "Plain English description of what this workflow does",
  "workflow": { ...valid n8n workflow JSON... }
}`

  const client = new OpenAI({
    baseURL: (process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434') + '/v1',
    apiKey: 'ollama',
  })

  const res = await client.chat.completions.create({
    model: dept.llmModel,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  })

  const text = res.choices[0]?.message?.content ?? ''

  // Extract outermost JSON object — find balanced braces
  const start = text.indexOf('{')
  if (start === -1) throw new Error('No JSON found in workflow design response')
  let depth = 0
  let end = -1
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++
    else if (text[i] === '}') { depth--; if (depth === 0) { end = i; break } }
  }
  if (end === -1) throw new Error('Malformed JSON in workflow design response')
  const jsonStr = text.slice(start, end + 1)

  // Strip trailing commas before } or ] (common LLM output issue)
  const cleaned = jsonStr.replace(/,(\s*[}\]])/g, '$1')

  let parsed: DesignResult
  try {
    parsed = JSON.parse(cleaned) as DesignResult
  } catch (e) {
    throw new Error(`Could not parse workflow JSON: ${e instanceof Error ? e.message : String(e)}`)
  }

  if (!parsed.description || !parsed.workflow) {
    throw new Error('Invalid workflow design response structure')
  }

  return parsed
}
