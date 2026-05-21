import { prisma } from '@/lib/db/client'
import { deptMiddleware, requireRole } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'
import { invalidateDept, getDept } from '@/lib/dept/getDept'
import { Errors } from '@/lib/errors'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  systemPrompt: z.string().optional(),
  llmModel: z.string().optional(),
  embedModel: z.string().optional(),
  slackWebhookUrl: z.string().url().or(z.literal('')).optional().nullable(),
  webSearchEnabled: z.boolean().optional(),
})

type RouteContext = { params: { id: string } }

export const GET = withErrorHandler(async (_req, ctx) => {
  const { params } = ctx as RouteContext
  const authCtx = await deptMiddleware()

  // MANAGER can only fetch their own dept; super_admin can fetch any
  if (authCtx.role !== 'SUPER_ADMIN' && authCtx.dept_id !== params.id) {
    throw Errors.FORBIDDEN()
  }

  const dept = await getDept(params.id)
  return apiResponse.success(dept)
})

export const PUT = withErrorHandler(async (req, ctx) => {
  const { params } = ctx as RouteContext
  const authCtx = await deptMiddleware()

  if (authCtx.role !== 'SUPER_ADMIN' && authCtx.dept_id !== params.id) {
    throw Errors.FORBIDDEN()
  }
  requireRole(authCtx.role, 'MANAGER')

  const body = updateSchema.parse(await req.json())

  const dept = await prisma.department.update({ where: { id: params.id }, data: body })
  await invalidateDept(params.id)

  return apiResponse.success(dept)
})

export const DELETE = withErrorHandler(async (_req, ctx) => {
  const { params } = ctx as RouteContext
  const authCtx = await deptMiddleware()
  requireRole(authCtx.role, 'SUPER_ADMIN')

  await prisma.department.delete({ where: { id: params.id } })
  await invalidateDept(params.id)

  return apiResponse.success({ deleted: true })
})
