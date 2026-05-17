import { deptMiddleware } from '@/lib/auth/middleware'
import { getDept } from '@/lib/dept/getDept'
import { generateSuggestions } from '@/lib/llm/suggestions'
import { apiResponse } from '@/lib/api/response'
import { z } from 'zod'

const schema = z.object({
  question: z.string().max(1000),
  answer: z.string().max(2000),
})

export async function POST(req: Request) {
  let ctx
  try { ctx = await deptMiddleware() } catch { return apiResponse.error('UNAUTHORIZED', 'Unauthorized', 401) }

  const body = schema.safeParse(await req.json())
  if (!body.success) return apiResponse.error('INVALID_REQUEST', 'Invalid body', 400)

  const dept = await getDept(ctx.dept_id)
  const suggestions = await generateSuggestions(body.data.question, body.data.answer, dept.llmModel)

  return apiResponse.success({ suggestions })
}
