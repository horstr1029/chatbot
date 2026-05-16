export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db/client'
import { deptMiddleware, requireRole } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'
import { n8nClient } from '@/lib/n8n/client'
import { cancelWorkflowReminder } from '@/lib/queue/reminder.queue'
import { Errors } from '@/lib/errors'

type RouteContext = { params: { id: string } }

export const POST = withErrorHandler(async (_req, ctx) => {
  const { params } = ctx as RouteContext
  const authCtx = await deptMiddleware()
  requireRole(authCtx.role, 'DEPT_ADMIN')

  const request = await prisma.workflowRequest.findUnique({ where: { id: params.id } })
  if (!request) throw Errors.NOT_FOUND('WorkflowRequest')
  if (request.deptId !== authCtx.dept_id) throw Errors.DEPT_MISMATCH()
  if (request.status !== 'PENDING') {
    throw Errors.FORBIDDEN()
  }

  const approver = await prisma.user.findUnique({
    where: { id: authCtx.user_id },
    select: { email: true },
  })

  await prisma.$transaction(async (tx) => {
    await tx.workflowRequest.update({
      where: { id: params.id },
      data: {
        status: 'APPROVED',
        approvedById: authCtx.user_id,
        approvedAt: new Date(),
      },
    })
  })

  await cancelWorkflowReminder(params.id)

  if (request.n8nResumeUrl) {
    await n8nClient.resumeExecution(request.n8nResumeUrl, {
      approved: true,
      approvedBy: approver?.email ?? 'admin',
    })

    await prisma.workflowRequest.update({
      where: { id: params.id },
      data: { status: 'EXECUTED' },
    })
  }

  return apiResponse.success({ approved: true })
})
