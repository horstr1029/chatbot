export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db/client'
import { deptMiddleware } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'

export const GET = withErrorHandler(async () => {
  const ctx = await deptMiddleware()

  const requests = await prisma.workflowRequest.findMany({
    where: { requestedById: ctx.user_id },
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: {
      id: true,
      description: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      approvedAt: true,
      rejectionReason: true,
      dept: { select: { name: true } },
    },
  })

  return apiResponse.success(requests)
})
