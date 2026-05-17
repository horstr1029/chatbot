export const dynamic = 'force-dynamic'

import { deptMiddleware } from '@/lib/auth/middleware'
import { getDept } from '@/lib/dept/getDept'
import { generateMeetingBrief } from '@/lib/llm/meetingBrief'
import { apiResponse } from '@/lib/api/response'
import { prisma } from '@/lib/db/client'
import { z } from 'zod'

const bodySchema = z.object({
  title: z.string().min(1),
  agenda: z.string().default(''),
})

export async function POST(req: Request) {
  let ctx
  try {
    ctx = await deptMiddleware()
  } catch {
    return apiResponse.error('UNAUTHORIZED', 'Unauthorized', 401)
  }

  const body = bodySchema.safeParse(await req.json())
  if (!body.success) return apiResponse.error('INVALID_REQUEST', 'Invalid body', 400)

  const dept = await getDept(ctx.dept_id)

  const memberships = await prisma.userDepartment.findMany({
    where: { userId: ctx.user_id },
    select: { deptId: true },
  })
  const extraDeptIds = memberships.map((m) => m.deptId).filter((id) => id !== dept.id)

  const result = await generateMeetingBrief(body.data.title, body.data.agenda, dept, extraDeptIds)
  return result.toDataStreamResponse()
}
