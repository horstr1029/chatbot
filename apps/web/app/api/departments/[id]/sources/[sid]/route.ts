export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db/client'
import { deptMiddleware, requireRole } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'
import { Errors } from '@/lib/errors'

type Ctx = { params: { id: string; sid: string } }

export const DELETE = withErrorHandler(async (_req, ctx) => {
  const { params } = ctx as Ctx
  const authCtx = await deptMiddleware()
  requireRole(authCtx.role, 'DEPT_ADMIN')
  if (authCtx.role !== 'SUPER_ADMIN' && authCtx.dept_id !== params.id) throw Errors.FORBIDDEN()

  const source = await prisma.documentSource.findFirst({
    where: { id: params.sid, deptId: params.id, deletedAt: null },
  })
  if (!source) throw Errors.NOT_FOUND('DocumentSource')

  await prisma.documentSource.update({
    where: { id: params.sid },
    data: { deletedAt: new Date() },
  })
  return apiResponse.success({ deleted: true })
})
