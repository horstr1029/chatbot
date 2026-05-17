import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'

function ollamaProvider() {
  return createOpenAI({
    baseURL: (process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434') + '/v1',
    apiKey: 'ollama',
  })
}

export async function generateSuggestions(
  question: string,
  answer: string,
  model: string,
): Promise<string[]> {
  try {
    const { text } = await generateText({
      model: ollamaProvider()(model),
      system: 'Generate exactly 3 short follow-up questions the user might ask next. Output ONLY the 3 questions, one per line, no numbering, no extra text.',
      prompt: `User: ${question.slice(0, 400)}\n\nAssistant: ${answer.slice(0, 600)}\n\nFollow-up questions:`,
      maxTokens: 120,
    })
    return text
      .split('\n')
      .map((l) => l.replace(/^[-•*\d.]+\s*/, '').trim())
      .filter((l) => l.length > 8 && l.length < 140)
      .slice(0, 3)
  } catch {
    return []
  }
}
