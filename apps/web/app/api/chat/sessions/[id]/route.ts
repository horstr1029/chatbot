export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db/client'
import { deptMiddleware } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'
import { Errors } from '@/lib/errors'

type RouteContext = { params: { id: string } }

// GET — load a single session with full message history
export const GET = withErrorHandler(async (_req, ctx) => {
  const { params } = ctx as RouteContext
  const authCtx = await deptMiddleware()

  const session = await prisma.chatSession.findFirst({
    where: { id: params.id, userId: authCtx.user_id },
  })

  if (!session) throw Errors.NOT_FOUND('Session')

  return apiResponse.success(session)
})

// DELETE — soft-delete by removing messages and marking updatedAt
export const DELETE = withErrorHandler(async (_req, ctx) => {
  const { params } = ctx as RouteContext
  const authCtx = await deptMiddleware()

  await prisma.chatSession.deleteMany({
    where: { id: params.id, userId: authCtx.user_id },
  })

  return apiResponse.success({ deleted: true })
})
