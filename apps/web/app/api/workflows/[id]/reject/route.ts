export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db/client'
import { deptMiddleware, requireRole } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'
import { n8nClient } from '@/lib/n8n/client'
import { cancelWorkflowReminder } from '@/lib/queue/reminder.queue'
import { notifyUser } from '@/lib/push/webpush'
import { sendSlackNotification } from '@/lib/slack/notify'
import { sendLeaveRejectionEmail } from '@/lib/email/mailer'
import { Errors } from '@/lib/errors'
import { z } from 'zod'

type RouteContext = { params: { id: string } }

const schema = z.object({ reason: z.string().min(1) })

export const POST = withErrorHandler(async (req, ctx) => {
  const { params } = ctx as RouteContext
  const authCtx = await deptMiddleware()
  requireRole(authCtx.role, 'MANAGER')

  const { reason } = schema.parse(await req.json())

  const request = await prisma.workflowRequest.findUnique({
    where: { id: params.id },
    include: {
      approvalSteps: { orderBy: { stepOrder: 'asc' } },
    },
  })
  if (!request) throw Errors.NOT_FOUND('WorkflowRequest')
  if (request.status !== 'PENDING') throw Errors.FORBIDDEN()

  const dept = await prisma.department.findUnique({
    where: { id: request.deptId },
    select: { slackWebhookUrl: true, name: true },
  })

  // ── Multi-step rejection logic ────────────────────────────────
  if (request.approvalSteps.length > 0) {
    const pendingStep = request.approvalSteps.find((s) => s.status === 'PENDING')
    if (!pendingStep) throw Errors.FORBIDDEN()
    if (pendingStep.approvingDeptId !== authCtx.dept_id) throw Errors.FORBIDDEN()

    await prisma.$transaction(async (tx) => {
      await tx.workflowApprovalStep.update({
        where: { id: pendingStep.id },
        data: {
          status: 'REJECTED',
          approvedById: authCtx.user_id,
          approvedAt: new Date(),
          rejectionReason: reason,
        },
      })
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

    await notifyUser(request.requestedById, {
      title: 'Workflow rejected',
      body: `${request.description.slice(0, 80)} — ${reason}`,
      url: '/chat',
    })

    if (dept?.slackWebhookUrl) {
      await sendSlackNotification(
        dept.slackWebhookUrl,
        `❌ *Workflow rejected* in ${dept.name} (step: ${pendingStep.label})\n>${request.description}\nReason: ${reason}`,
      )
    }

    if (request.n8nResumeUrl) {
      await n8nClient.resumeExecution(request.n8nResumeUrl, { approved: false, reason })
    }

    if (request.isLeaveRequest && request.leaveStartDate && request.leaveEndDate) {
      const requester = await prisma.user.findUnique({
        where: { id: request.requestedById },
        select: { email: true, name: true },
      })
      if (requester?.email) {
        await sendLeaveRejectionEmail(
          requester.email,
          requester.name,
          request.leaveType ?? 'Leave',
          request.leaveStartDate,
          request.leaveEndDate,
          reason,
        )
      }
    }

    return apiResponse.success({ rejected: true })
  }

  // ── Single-step (legacy) rejection logic ─────────────────────
  if (request.deptId !== authCtx.dept_id) throw Errors.DEPT_MISMATCH()

  await prisma.$transaction(async (tx) => {
    await tx.workflowRequest.update({
      where: { id: params.id },
      data: { status: 'REJECTED', rejectionReason: reason, approvedById: authCtx.user_id },
    })
  })

  await cancelWorkflowReminder(params.id)
  await notifyUser(request.requestedById, {
    title: 'Workflow rejected',
    body: `${request.description.slice(0, 80)} — ${reason}`,
    url: '/chat',
  })

  if (dept?.slackWebhookUrl) {
    await sendSlackNotification(
      dept.slackWebhookUrl,
      `❌ *Workflow rejected* in ${dept.name}\n>${request.description}\nReason: ${reason}`,
    )
  }

  if (request.n8nResumeUrl) {
    await n8nClient.resumeExecution(request.n8nResumeUrl, { approved: false, reason })
  }

  if (request.isLeaveRequest && request.leaveStartDate && request.leaveEndDate) {
    const requester = await prisma.user.findUnique({
      where: { id: request.requestedById },
      select: { email: true, name: true },
    })
    if (requester?.email) {
      await sendLeaveRejectionEmail(
        requester.email,
        requester.name,
        request.leaveType ?? 'Leave',
        request.leaveStartDate,
        request.leaveEndDate,
        reason,
      )
    }
  }

  return apiResponse.success({ rejected: true })
})
