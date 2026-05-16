export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db/client'
import { deptMiddleware, requireRole } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'
import { Errors } from '@/lib/errors'
import { z } from 'zod'

type Ctx = { params: { id: string } }

const updateSchema = z.object({
  userId: z.string(),
  role: z.enum(['MEMBER', 'DEPT_ADMIN', 'SUPER_ADMIN']).optional(),
  remove: z.boolean().optional(),
})

export const GET = withErrorHandler(async (_req, ctx) => {
  const { params } = ctx as Ctx
  const authCtx = await deptMiddleware()
  requireRole(authCtx.role, 'DEPT_ADMIN')
  if (authCtx.role !== 'SUPER_ADMIN' && authCtx.dept_id !== params.id) throw Errors.FORBIDDEN()

  const users = await prisma.user.findMany({
    where: { deptId: params.id, deletedAt: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })
  return apiResponse.success(users)
})

export const POST = withErrorHandler(async (req, ctx) => {
  const { params } = ctx as Ctx
  const authCtx = await deptMiddleware()
  requireRole(authCtx.role, 'DEPT_ADMIN')
  if (authCtx.role !== 'SUPER_ADMIN' && authCtx.dept_id !== params.id) throw Errors.FORBIDDEN()

  const body = updateSchema.parse(await req.json())
  const user = await prisma.user.findUnique({ where: { id: body.userId } })
  if (!user) throw Errors.NOT_FOUND('User')

  if (body.remove) {
    await prisma.user.update({
      where: { id: body.userId },
      data: { deletedAt: new Date() },
    })
    return apiResponse.success({ removed: true })
  }

  await prisma.user.update({
    where: { id: body.userId },
    data: {
      ...(body.role ? { role: body.role } : {}),
      deptId: params.id,
    },
  })
  return apiResponse.success({ updated: true })
})
