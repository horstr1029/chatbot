export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db/client'
import { deptMiddleware, requireRole } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'
import { invalidateDept } from '@/lib/dept/getDept'
import { z } from 'zod'

const stepSchema = z.object({
  stepOrder: z.number().int().positive(),
  label: z.string().min(1),
  deptId: z.string().min(1),
})

const putSchema = z.object({
  steps: z.array(stepSchema),
})

export const GET = withErrorHandler(async () => {
  const ctx = await deptMiddleware()
  requireRole(ctx.role, 'DEPT_ADMIN')

  const dept = await prisma.department.findUnique({
    where: { id: ctx.dept_id },
    select: { approvalChain: true },
  })

  const chain = dept?.approvalChain
  const steps = Array.isArray(chain) ? chain : []

  return apiResponse.success(steps)
})

export const PUT = withErrorHandler(async (req) => {
  const ctx = await deptMiddleware()
  requireRole(ctx.role, 'DEPT_ADMIN')

  const body = putSchema.parse(await req.json())

  // Validate that each referenced deptId exists
  const deptIds = body.steps.map((s) => s.deptId)
  const existingDepts = await prisma.department.findMany({
    where: { id: { in: deptIds } },
    select: { id: true },
  })
  const existingIds = new Set(existingDepts.map((d) => d.id))

  for (const deptId of deptIds) {
    if (!existingIds.has(deptId)) {
      return apiResponse.error('INVALID_DEPT', `Department '${deptId}' not found`, 400)
    }
  }

  await prisma.department.update({
    where: { id: ctx.dept_id },
    data: { approvalChain: body.steps },
  })

  await invalidateDept(ctx.dept_id)

  return apiResponse.success({ saved: true })
})
