export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db/client'
import { deptMiddleware } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'
import { z } from 'zod'

const schema = z.object({
  messageId: z.string().min(1),
  sessionId: z.string().min(1),
  rating: z.union([z.literal(1), z.literal(-1)]),
})

export const POST = withErrorHandler(async (req) => {
  const authCtx = await deptMiddleware()
  const body = schema.parse(await req.json())

  await prisma.messageFeedback.upsert({
    where: { messageId_userId: { messageId: body.messageId, userId: authCtx.user_id } },
    create: {
      messageId: body.messageId,
      sessionId: body.sessionId,
      userId: authCtx.user_id,
      deptId: authCtx.dept_id ?? '',
      rating: body.rating,
    },
    update: { rating: body.rating },
  })

  return apiResponse.success({ ok: true })
})
