export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db/client'
import { deptMiddleware, requireRole } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'
import { Errors } from '@/lib/errors'

type Ctx = { params: { id: string } }

export const DELETE = withErrorHandler(async (_req, ctx) => {
  const { params } = ctx as Ctx
  const authCtx = await deptMiddleware()
  requireRole(authCtx.role, 'DEPT_ADMIN')

  const ann = await prisma.announcement.findUnique({ where: { id: params.id } })
  if (!ann || ann.deptId !== authCtx.dept_id) throw Errors.NOT_FOUND()

  await prisma.announcement.update({ where: { id: params.id }, data: { active: false } })

  return apiResponse.success({ ok: true })
})
