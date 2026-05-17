export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db/client'
import { deptMiddleware, requireRole } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'

export const GET = withErrorHandler(async () => {
  const ctx = await deptMiddleware()
  requireRole(ctx.role, 'DEPT_ADMIN')

  const requests = await prisma.workflowRequest.findMany({
    where: { deptId: ctx.dept_id },
    orderBy: { createdAt: 'desc' },
    include: {
      requestedBy: { select: { name: true, email: true } },
      approvedBy: { select: { name: true, email: true } },
      approvalSteps: {
        orderBy: { stepOrder: 'asc' },
        select: {
          id: true,
          stepOrder: true,
          label: true,
          status: true,
          approvedAt: true,
          rejectionReason: true,
          approvedBy: { select: { name: true, email: true } },
        },
      },
    },
  })

  return apiResponse.success(requests)
})
