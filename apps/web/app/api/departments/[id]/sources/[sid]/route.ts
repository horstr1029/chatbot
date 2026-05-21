export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db/client'
import { deptMiddleware, requireRole } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'
import { Errors } from '@/lib/errors'
import { z } from 'zod'

type Ctx = { params: { id: string; sid: string } }

const patchSchema = z.object({
  expiresAt: z.string().datetime().nullable(),
})

export const PATCH = withErrorHandler(async (req, ctx) => {
  const { params } = ctx as Ctx
  const authCtx = await deptMiddleware()
  requireRole(authCtx.role, 'MANAGER')
  if (authCtx.role !== 'SUPER_ADMIN' && authCtx.dept_id !== params.id) throw Errors.FORBIDDEN()

  const body = patchSchema.safeParse(await req.json())
  if (!body.success) return apiResponse.error('INVALID_REQUEST', 'Invalid body', 400)

  const source = await prisma.documentSource.findFirst({
    where: { id: params.sid, deptId: params.id, deletedAt: null },
  })
  if (!source) throw Errors.NOT_FOUND('DocumentSource')

  const updated = await prisma.documentSource.update({
    where: { id: params.sid },
    data: { expiresAt: body.data.expiresAt ? new Date(body.data.expiresAt) : null },
  })
  return apiResponse.success(updated)
})

export const DELETE = withErrorHandler(async (_req, ctx) => {
  const { params } = ctx as Ctx
  const authCtx = await deptMiddleware()
  requireRole(authCtx.role, 'MANAGER')
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
