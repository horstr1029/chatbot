import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

export type FormField = {
  name: string
  label: string
  type: 'text' | 'date' | 'select' | 'textarea' | 'number'
  required?: boolean
  options?: string[]
}

function ollamaProvider() {
  return createOpenAI({
    baseURL: (process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434') + '/v1',
    apiKey: 'ollama',
  })
}

function buildPrompt(description: string, fields: FormField[]): string {
  const fieldList = fields
    .map((f) => {
      const optionNote = f.type === 'select' && f.options?.length
        ? ` (options: ${f.options.join(', ')})`
        : ''
      return `- ${f.name} (${f.type}${optionNote}): ${f.label}`
    })
    .join('\n')

  return `You are a form-filling assistant. Given the user's description and a list of form fields, extract the relevant information and return ONLY a valid JSON object mapping each field name to its value. If information for a field is missing, use an empty string.

User description: "${description}"

Form fields:
${fieldList}

Return only a JSON object like: {"fieldName": "value", ...}
Do not include any explanation or markdown.`
}

export async function fillForm(
  description: string,
  template: { id: string; name: string; fields: FormField[] },
  model: string,
): Promise<Record<string, string>> {
  const provider = ollamaProvider()

  const { text } = await generateText({
    model: provider(model),
    prompt: buildPrompt(description, template.fields),
  })

  // Extract JSON from response — handle potential markdown fences
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    // Return empty map if parse fails
    return Object.fromEntries(template.fields.map((f) => [f.name, '']))
  }

  try {
    const parsed: unknown = JSON.parse(jsonMatch[0])
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return Object.fromEntries(template.fields.map((f) => [f.name, '']))
    }

    const result: Record<string, string> = {}
    for (const field of template.fields) {
      const val = (parsed as Record<string, unknown>)[field.name]
      result[field.name] = typeof val === 'string' ? val : val != null ? String(val) : ''
    }
    return result
  } catch {
    return Object.fromEntries(template.fields.map((f) => [f.name, '']))
  }
}
