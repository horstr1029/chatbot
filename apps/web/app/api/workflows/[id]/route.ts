export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db/client'
import { deptMiddleware } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'
import { Errors } from '@/lib/errors'

type RouteContext = { params: { id: string } }

export const GET = withErrorHandler(async (_req, ctx) => {
  const { params } = ctx as RouteContext
  const authCtx = await deptMiddleware()

  const request = await prisma.workflowRequest.findUnique({
    where: { id: params.id },
    include: {
      requestedBy: { select: { name: true, email: true } },
      approvedBy: { select: { name: true, email: true } },
      approvalSteps: {
        orderBy: { stepOrder: 'asc' },
        include: {
          approvedBy: { select: { name: true, email: true } },
          approvingDept: { select: { name: true } },
        },
      },
    },
  })

  if (!request) throw Errors.NOT_FOUND('WorkflowRequest')

  // Allow access if user is from the request's dept or any step's dept
  const allowedDeptIds = new Set<string>([request.deptId])
  for (const step of request.approvalSteps) {
    allowedDeptIds.add(step.approvingDeptId)
  }

  if (!allowedDeptIds.has(authCtx.dept_id)) throw Errors.FORBIDDEN()

  return apiResponse.success(request)
})
