export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db/client'
import { deptMiddleware } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'
import { z } from 'zod'

const saveSchema = z.object({
  messageId: z.string().min(1),
  sessionId: z.string().min(1),
  content: z.string().min(1),
})

export const GET = withErrorHandler(async () => {
  const ctx = await deptMiddleware()
  const saved = await prisma.savedMessage.findMany({
    where: { userId: ctx.user_id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return apiResponse.success(saved)
})

export const POST = withErrorHandler(async (req) => {
  const ctx = await deptMiddleware()
  const body = saveSchema.parse(await req.json())

  const saved = await prisma.savedMessage.upsert({
    where: { userId_messageId: { userId: ctx.user_id, messageId: body.messageId } },
    create: { userId: ctx.user_id, ...body },
    update: {},
  })
  return apiResponse.success(saved, undefined, 201)
})
