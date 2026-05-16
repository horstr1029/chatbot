export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db/client'
import { deptMiddleware, requireRole } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'
import { Errors } from '@/lib/errors'
import { z } from 'zod'

type Ctx = { params: { id: string } }

const createSchema = z.object({
  name: z.string().min(1),
  sourceType: z.enum(['GOOGLE_DRIVE', 'SHAREPOINT', 'LOCAL']),
  sourceUrl: z.string().optional(),
  sourcePath: z.string().optional(),
  isGlobal: z.boolean().optional(),
})

export const GET = withErrorHandler(async (_req, ctx) => {
  const { params } = ctx as Ctx
  const authCtx = await deptMiddleware()
  if (authCtx.role !== 'SUPER_ADMIN' && authCtx.dept_id !== params.id) throw Errors.FORBIDDEN()

  const sources = await prisma.documentSource.findMany({
    where: { deptId: params.id, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  })
  return apiResponse.success(sources)
})

export const POST = withErrorHandler(async (req, ctx) => {
  const { params } = ctx as Ctx
  const authCtx = await deptMiddleware()
  requireRole(authCtx.role, 'DEPT_ADMIN')
  if (authCtx.role !== 'SUPER_ADMIN' && authCtx.dept_id !== params.id) throw Errors.FORBIDDEN()

  const body = createSchema.parse(await req.json())
  const source = await prisma.documentSource.create({
    data: { ...body, deptId: params.id },
  })
  return apiResponse.success(source, undefined, 201)
})
