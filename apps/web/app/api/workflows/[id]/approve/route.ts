export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db/client'
import { deptMiddleware, requireRole } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'
import { n8nClient } from '@/lib/n8n/client'
import { cancelWorkflowReminder } from '@/lib/queue/reminder.queue'
import { notifyUser } from '@/lib/push/webpush'
import { sendSlackNotification } from '@/lib/slack/notify'
import { Errors } from '@/lib/errors'

type RouteContext = { params: { id: string } }

export const POST = withErrorHandler(async (_req, ctx) => {
  const { params } = ctx as RouteContext
  const authCtx = await deptMiddleware()
  requireRole(authCtx.role, 'DEPT_ADMIN')

  const request = await prisma.workflowRequest.findUnique({
    where: { id: params.id },
    include: {
      approvalSteps: { orderBy: { stepOrder: 'asc' } },
    },
  })
  if (!request) throw Errors.NOT_FOUND('WorkflowRequest')
  if (request.status !== 'PENDING') throw Errors.FORBIDDEN()

  const approver = await prisma.user.findUnique({
    where: { id: authCtx.user_id },
    select: { email: true },
  })

  const dept = await prisma.department.findUnique({
    where: { id: request.deptId },
    select: { slackWebhookUrl: true, name: true },
  })

  // ── Multi-step approval logic ──────────────────────────────────
  if (request.approvalSteps.length > 0) {
    const pendingStep = request.approvalSteps.find((s) => s.status === 'PENDING')
    if (!pendingStep) throw Errors.FORBIDDEN()
    if (pendingStep.approvingDeptId !== authCtx.dept_id) throw Errors.FORBIDDEN()

    await prisma.workflowApprovalStep.update({
      where: { id: pendingStep.id },
      data: {
        status: 'APPROVED',
        approvedById: authCtx.user_id,
        approvedAt: new Date(),
      },
    })

    const remainingSteps = request.approvalSteps.filter(
      (s) => s.id !== pendingStep.id && s.status === 'PENDING',
    )

    if (remainingSteps.length > 0) {
      // Notify the next step's dept admins
      const nextStep = remainingSteps[0]
      const nextAdmins = await prisma.userDepartment.findMany({
        where: { deptId: nextStep.approvingDeptId, role: 'DEPT_ADMIN' },
        select: { userId: true },
      })
      for (const { userId } of nextAdmins) {
        await notifyUser(userId, {
          title: 'Workflow approval needed',
          body: `${request.description.slice(0, 80)} (step: ${nextStep.label})`,
          url: '/admin/workflows',
        })
      }
      return apiResponse.success({ approved: true, allStepsComplete: false })
    }

    // All steps approved — finalize
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

    await notifyUser(request.requestedById, {
      title: 'Workflow approved',
      body: request.description.slice(0, 100),
      url: '/chat',
    })

    if (dept?.slackWebhookUrl) {
      await sendSlackNotification(
        dept.slackWebhookUrl,
        `✅ *Workflow approved* in ${dept.name}\n>${request.description}\nApproved by ${approver?.email ?? 'admin'}`,
      )
    }

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

    return apiResponse.success({ approved: true, allStepsComplete: true })
  }

  // ── Single-step (legacy) approval logic ───────────────────────
  if (request.deptId !== authCtx.dept_id) throw Errors.DEPT_MISMATCH()

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

  await notifyUser(request.requestedById, {
    title: 'Workflow approved',
    body: request.description.slice(0, 100),
    url: '/chat',
  })

  if (dept?.slackWebhookUrl) {
    await sendSlackNotification(
      dept.slackWebhookUrl,
      `✅ *Workflow approved* in ${dept.name}\n>${request.description}\nApproved by ${approver?.email ?? 'admin'}`,
    )
  }

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
