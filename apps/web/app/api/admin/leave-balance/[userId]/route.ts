export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db/client'
import { deptMiddleware, requireRole } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'
import { getOrCreateBalance } from '@/lib/leave/balance'
import { Errors } from '@/lib/errors'
import { z } from 'zod'

type RouteContext = { params: { userId: string } }

export const GET = withErrorHandler(async (_req, ctx) => {
  const { params } = ctx as RouteContext
  const authCtx = await deptMiddleware()
  requireRole(authCtx.role, 'DEPT_ADMIN')

  const record = await getOrCreateBalance(params.userId, authCtx.dept_id)
  return apiResponse.success(record)
})

const putSchema = z.object({
  yearlyAllocation: z.number().int().min(0).optional(),
  monthlyAccrual: z.number().min(0).optional(),
  balance: z.number().optional(),
  resetBalance: z.boolean().optional(),
})

export const PUT = withErrorHandler(async (req, ctx) => {
  const { params } = ctx as RouteContext
  const authCtx = await deptMiddleware()
  requireRole(authCtx.role, 'DEPT_ADMIN')

  const body = putSchema.parse(await req.json())

  const record = await prisma.leaveBalance.findUnique({
    where: { userId_deptId: { userId: params.userId, deptId: authCtx.dept_id } },
  })
  if (!record) throw Errors.NOT_FOUND('LeaveBalance')

  const updated = await prisma.leaveBalance.update({
    where: { id: record.id },
    data: {
      ...(body.yearlyAllocation !== undefined && { yearlyAllocation: body.yearlyAllocation }),
      ...(body.monthlyAccrual !== undefined && { monthlyAccrual: body.monthlyAccrual }),
      ...(body.balance !== undefined && { balance: body.balance }),
      ...(body.resetBalance === true && { balance: 0 }),
    },
  })

  return apiResponse.success(updated)
})
