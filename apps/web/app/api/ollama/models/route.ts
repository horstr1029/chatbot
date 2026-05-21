export const dynamic = 'force-dynamic'

import { deptMiddleware, requireRole } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'

interface OllamaModel {
  name: string
  modified_at: string
  size: number
}

interface OllamaTagsResponse {
  models: OllamaModel[]
}

export const GET = withErrorHandler(async () => {
  const ctx = await deptMiddleware()
  requireRole(ctx.role, 'MANAGER')

  const ollamaUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'

  try {
    const res = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(3000) })
    if (!res.ok) throw new Error('Ollama returned non-OK status')
    const data: OllamaTagsResponse = await res.json()
    const models = data.models.map((m) => ({ name: m.name }))
    return apiResponse.success({ available: true, models })
  } catch {
    return apiResponse.success({ available: false, models: [] })
  }
})
