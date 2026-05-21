export const dynamic = 'force-dynamic'

import { deptMiddleware } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'
import { accrueIfDue } from '@/lib/leave/balance'
import { prisma } from '@/lib/db/client'

export const GET = withErrorHandler(async () => {
  const ctx = await deptMiddleware()
  const { balance } = await accrueIfDue(ctx.user_id, ctx.dept_id)
  const record = await prisma.leaveBalance.findUnique({
    where: { userId_deptId: { userId: ctx.user_id, deptId: ctx.dept_id } },
  })
  return apiResponse.success({
    balance,
    yearlyAllocation: record?.yearlyAllocation ?? 15,
    monthlyAccrual: record?.monthlyAccrual ?? 1.25,
  })
})
