export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db/client'
import { deptMiddleware, requireRole } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'
import { z } from 'zod'

type RouteContext = { params: { id: string } }

const updateSchema = z.object({
  deptIds: z.array(z.string()).min(1, 'Assign at least one department'),
})

const patchSchema = z.object({
  name: z.string().min(1),
})

// PATCH — update a manager's name
export const PATCH = withErrorHandler(async (req, ctx) => {
  const { params } = ctx as RouteContext
  const authCtx = await deptMiddleware()
  requireRole(authCtx.role, 'SUPER_ADMIN')

  const { name } = patchSchema.parse(await req.json())

  await prisma.user.update({
    where: { id: params.id },
    data: { name },
  })

  return apiResponse.success({ updated: true })
})

// PUT — update a manager's department assignments
export const PUT = withErrorHandler(async (req, ctx) => {
  const { params } = ctx as RouteContext
  const authCtx = await deptMiddleware()
  requireRole(authCtx.role, 'SUPER_ADMIN')

  const { deptIds } = updateSchema.parse(await req.json())

  await prisma.$transaction(async (tx) => {
    // Remove all existing MANAGER memberships for this user
    await tx.userDepartment.deleteMany({
      where: { userId: params.id, role: 'MANAGER' },
    })
    // Re-create for the new set
    await Promise.all(
      deptIds.map((deptId) =>
        tx.userDepartment.upsert({
          where: { userId_deptId: { userId: params.id, deptId } },
          create: { userId: params.id, deptId, role: 'MANAGER' },
          update: { role: 'MANAGER' },
        })
      )
    )
  })

  return apiResponse.success({ updated: true })
})

// DELETE — remove all manager roles (soft-delete if no other memberships)
export const DELETE = withErrorHandler(async (_req, ctx) => {
  const { params } = ctx as RouteContext
  const authCtx = await deptMiddleware()
  requireRole(authCtx.role, 'SUPER_ADMIN')

  await prisma.$transaction(async (tx) => {
    await tx.userDepartment.deleteMany({
      where: { userId: params.id, role: 'MANAGER' },
    })
    // If user has no remaining memberships, soft-delete them
    const remaining = await tx.userDepartment.count({ where: { userId: params.id } })
    if (remaining === 0) {
      await tx.user.update({
        where: { id: params.id },
        data: { deletedAt: new Date() },
      })
    }
  })

  return apiResponse.success({ deleted: true })
})
