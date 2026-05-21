export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db/client'
import { deptMiddleware, requireRole } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'
import { Errors } from '@/lib/errors'
import { z } from 'zod'

type Ctx = { params: { id: string } }

const updateSchema = z.object({
  userId: z.string(),
  role: z.enum(['MEMBER', 'MANAGER']).optional(),
  remove: z.boolean().optional(),
})

export const GET = withErrorHandler(async (_req, ctx) => {
  const { params } = ctx as Ctx
  const authCtx = await deptMiddleware()
  requireRole(authCtx.role, 'MANAGER')
  if (authCtx.role !== 'SUPER_ADMIN' && authCtx.dept_id !== params.id) throw Errors.FORBIDDEN()

  const members = await prisma.userDepartment.findMany({
    where: { deptId: params.id },
    orderBy: { createdAt: 'asc' },
    select: {
      role: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true, deletedAt: true } },
    },
  })

  const users = members
    .filter((m) => !m.user.deletedAt)
    .map((m) => ({ ...m.user, role: m.role, createdAt: m.createdAt }))

  return apiResponse.success(users)
})

export const POST = withErrorHandler(async (req, ctx) => {
  const { params } = ctx as Ctx
  const authCtx = await deptMiddleware()
  requireRole(authCtx.role, 'MANAGER')
  if (authCtx.role !== 'SUPER_ADMIN' && authCtx.dept_id !== params.id) throw Errors.FORBIDDEN()

  const body = updateSchema.parse(await req.json())

  const membership = await prisma.userDepartment.findUnique({
    where: { userId_deptId: { userId: body.userId, deptId: params.id } },
  })
  if (!membership) throw Errors.NOT_FOUND('User membership')

  if (body.remove) {
    await prisma.userDepartment.delete({
      where: { userId_deptId: { userId: body.userId, deptId: params.id } },
    })
    return apiResponse.success({ removed: true })
  }

  if (body.role) {
    await prisma.userDepartment.update({
      where: { userId_deptId: { userId: body.userId, deptId: params.id } },
      data: { role: body.role },
    })
  }

  return apiResponse.success({ updated: true })
})
