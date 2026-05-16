export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db/client'
import { deptMiddleware, requireRole } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'
import { n8nClient } from '@/lib/n8n/client'
import { cancelWorkflowReminder } from '@/lib/queue/reminder.queue'
import { Errors } from '@/lib/errors'
import { z } from 'zod'

type RouteContext = { params: { id: string } }

const schema = z.object({ reason: z.string().min(1) })

export const POST = withErrorHandler(async (req, ctx) => {
  const { params } = ctx as RouteContext
  const authCtx = await deptMiddleware()
  requireRole(authCtx.role, 'DEPT_ADMIN')

  const { reason } = schema.parse(await req.json())

  const request = await prisma.workflowRequest.findUnique({ where: { id: params.id } })
  if (!request) throw Errors.NOT_FOUND('WorkflowRequest')
  if (request.deptId !== authCtx.dept_id) throw Errors.DEPT_MISMATCH()
  if (request.status !== 'PENDING') throw Errors.FORBIDDEN()

  await prisma.$transaction(async (tx) => {
    await tx.workflowRequest.update({
      where: { id: params.id },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
        approvedById: authCtx.user_id,
      },
    })
  })

  await cancelWorkflowReminder(params.id)

  if (request.n8nResumeUrl) {
    await n8nClient.resumeExecution(request.n8nResumeUrl, {
      approved: false,
      reason,
    })
  }

  return apiResponse.success({ rejected: true })
})
