import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

function ollamaProvider() {
  return createOpenAI({
    baseURL: (process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434') + '/v1',
    apiKey: 'ollama',
  })
}

export interface ParsedReminder {
  title: string
  topic: string
  cronExpr: string
  scheduleLabel: string
}

const PROMPT = (message: string) => `
Extract reminder information from the user message below. Return a JSON object with exactly these fields:
- title: short description of what to be reminded about (e.g. "Check weekly report")
- topic: a search topic string to look up in the knowledge base (e.g. "weekly report finance")
- cronExpr: a valid cron expression (e.g. "0 9 * * 1" for every Monday at 9am)
- scheduleLabel: a human-readable schedule label (e.g. "Every Monday at 9am")

Common cron patterns:
- Every Monday at 9am: "0 9 * * 1"
- Every day at 9am: "0 9 * * *"
- Every weekday at 9am: "0 9 * * 1-5"
- Every 1st of month at 9am: "0 9 1 * *"
- Every Friday at 5pm: "0 17 * * 5"

If no clear schedule can be determined from the message, return null.

Message: "${message}"

Return ONLY valid JSON (no markdown, no explanation). Example:
{"title":"Check weekly report","topic":"weekly report","cronExpr":"0 9 * * 1","scheduleLabel":"Every Monday at 9am"}
`

export async function parseReminder(
  message: string,
  model: string,
): Promise<ParsedReminder | null> {
  try {
    const { text } = await generateText({
      model: ollamaProvider()(model),
      prompt: PROMPT(message),
    })

    const clean = text.trim()
    if (clean === 'null' || clean === '') return null

    // Extract JSON from response — model may wrap it in markdown
    const jsonMatch = clean.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const parsed: unknown = JSON.parse(jsonMatch[0])
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('title' in parsed) ||
      !('topic' in parsed) ||
      !('cronExpr' in parsed) ||
      !('scheduleLabel' in parsed)
    ) {
      return null
    }

    const result = parsed as Record<string, unknown>
    if (
      typeof result.title !== 'string' ||
      typeof result.topic !== 'string' ||
      typeof result.cronExpr !== 'string' ||
      typeof result.scheduleLabel !== 'string'
    ) {
      return null
    }

    return {
      title: result.title,
      topic: result.topic,
      cronExpr: result.cronExpr,
      scheduleLabel: result.scheduleLabel,
    }
  } catch {
    return null
  }
}
