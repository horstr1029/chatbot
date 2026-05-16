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

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON found in workflow design response')

  const parsed = JSON.parse(jsonMatch[0]) as DesignResult
  if (!parsed.description || !parsed.workflow) {
    throw new Error('Invalid workflow design response structure')
  }

  return parsed
}
