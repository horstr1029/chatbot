export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db/client'
import { deptMiddleware, requireRole } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'
import { notifyUser } from '@/lib/push/webpush'
import { Errors } from '@/lib/errors'
import { z } from 'zod'

type RouteContext = { params: { id: string } }

const patchSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED']).optional(),
  response: z.string().optional(),
})

export const PATCH = withErrorHandler(async (req, ctx) => {
  const { params } = ctx as RouteContext
  const authCtx = await deptMiddleware()
  requireRole(authCtx.role, 'MANAGER')

  const body = patchSchema.parse(await req.json())

  const existing = await prisma.crossDeptRequest.findUnique({
    where: { id: params.id },
    include: {
      requestedBy: { select: { id: true } },
      fromDept: { select: { name: true } },
    },
  })
  if (!existing) throw Errors.NOT_FOUND('CrossDeptRequest')
  if (existing.toDeptId !== authCtx.dept_id) throw Errors.FORBIDDEN()

  const updated = await prisma.crossDeptRequest.update({
    where: { id: params.id },
    data: {
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.response !== undefined ? { response: body.response } : {}),
      ...(body.status === 'RESOLVED' ? { resolvedAt: new Date() } : {}),
    },
    include: {
      fromDept: { select: { name: true } },
      toDept: { select: { name: true } },
      requestedBy: { select: { name: true, email: true } },
    },
  })

  // Notify original requester
  await notifyUser(existing.requestedBy.id, {
    title: 'Cross-dept request updated',
    body: `Your request "${existing.title}" has been ${body.status === 'RESOLVED' ? 'resolved' : 'updated'}.`,
    url: '/chat',
  })

  return apiResponse.success(updated)
})

export const DELETE = withErrorHandler(async (_req, ctx) => {
  const { params } = ctx as RouteContext
  const authCtx = await deptMiddleware()
  requireRole(authCtx.role, 'MANAGER')

  const existing = await prisma.crossDeptRequest.findUnique({
    where: { id: params.id },
  })
  if (!existing) throw Errors.NOT_FOUND('CrossDeptRequest')
  if (existing.fromDeptId !== authCtx.dept_id) throw Errors.FORBIDDEN()
  if (existing.status !== 'OPEN') {
    return apiResponse.error('INVALID_STATUS', 'Only OPEN requests can be cancelled', 400)
  }

  await prisma.crossDeptRequest.update({
    where: { id: params.id },
    data: { status: 'CANCELLED' },
  })

  return apiResponse.success({ cancelled: true })
})
