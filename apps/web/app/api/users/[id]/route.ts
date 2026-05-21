export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { deptMiddleware, requireRole } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'
import { z } from 'zod'

type RouteContext = { params: { id: string } }

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  moveToDeptId: z.string().optional(),
  fromDeptId: z.string().optional(),
})

export const PATCH = withErrorHandler(async (req, ctx) => {
  const { params } = ctx as RouteContext
  const authCtx = await deptMiddleware()
  requireRole(authCtx.role, 'MANAGER')

  const body = patchSchema.parse(await req.json())

  if (body.name !== undefined) {
    await prisma.user.update({
      where: { id: params.id },
      data: { name: body.name },
    })
  }

  if (body.moveToDeptId && body.fromDeptId) {
    requireRole(authCtx.role, 'SUPER_ADMIN')
    await prisma.$transaction(async (tx) => {
      await tx.userDepartment.delete({
        where: { userId_deptId: { userId: params.id, deptId: body.fromDeptId! } },
      })
      await tx.userDepartment.upsert({
        where: { userId_deptId: { userId: params.id, deptId: body.moveToDeptId! } },
        create: { userId: params.id, deptId: body.moveToDeptId!, role: 'MEMBER' },
        update: {},
      })
    })
  }

  return NextResponse.json(apiResponse.success({ updated: true }))
})
