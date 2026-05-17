export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db/client'
import { deptMiddleware } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'
import { Errors } from '@/lib/errors'

type Ctx = { params: { id: string } }

export const DELETE = withErrorHandler(async (_req, ctx) => {
  const { params } = ctx as Ctx
  const authCtx = await deptMiddleware()

  const saved = await prisma.savedMessage.findUnique({ where: { id: params.id } })
  if (!saved || saved.userId !== authCtx.user_id) throw Errors.NOT_FOUND()

  await prisma.savedMessage.delete({ where: { id: params.id } })
  return apiResponse.success({ ok: true })
})
