export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db/client'
import { deptMiddleware, requireRole } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'
import { n8nClient } from '@/lib/n8n/client'
import { cancelWorkflowReminder } from '@/lib/queue/reminder.queue'
import { notifyUser } from '@/lib/push/webpush'
import { sendSlackNotification } from '@/lib/slack/notify'
import { sendWorkflowApprovalRequestEmail, sendLeaveApprovalEmail } from '@/lib/email/mailer'
import { Errors } from '@/lib/errors'

type RouteContext = { params: { id: string } }

export const POST = withErrorHandler(async (_req, ctx) => {
  const { params } = ctx as RouteContext
  const authCtx = await deptMiddleware()
  requireRole(authCtx.role, 'MANAGER')

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
      // Notify the next step's dept admins (push + email)
      const nextStep = remainingSteps[0]
      const nextAdmins = await prisma.userDepartment.findMany({
        where: { deptId: nextStep.approvingDeptId, role: 'MANAGER' },
        include: { user: { select: { name: true, email: true } } },
      })
      const submitter = await prisma.user.findUnique({
        where: { id: request.requestedById },
        select: { name: true, email: true },
      })
      const requesterName = submitter?.name ?? submitter?.email ?? 'A user'
      await Promise.all([
        ...nextAdmins.map(({ userId }) =>
          notifyUser(userId, {
            title: 'Workflow approval needed',
            body: `${request.description.slice(0, 80)} (step: ${nextStep.label})`,
            url: '/admin/workflows',
          }),
        ),
        sendWorkflowApprovalRequestEmail(
          nextAdmins.map((a) => ({ email: a.user.email, name: a.user.name })),
          dept?.name ?? '',
          requesterName,
          request.description,
          nextStep.label,
        ),
      ])
      return apiResponse.success({ approved: true, allStepsComplete: false })
    }

    // All steps approved — finalize
    await prisma.$transaction(async (tx) => {
      await tx.workflowRequest.update({
        where: { id: params.id },
        data: { status: 'APPROVED', approvedById: authCtx.user_id, approvedAt: new Date() },
      })
    })

    await cancelWorkflowReminder(params.id)
    await finalizeApproval(request, dept, approver?.email ?? 'admin')
    return apiResponse.success({ approved: true, allStepsComplete: true })
  }

  // ── Single-step (legacy) approval logic ───────────────────────
  if (request.deptId !== authCtx.dept_id) throw Errors.DEPT_MISMATCH()

  await prisma.$transaction(async (tx) => {
    await tx.workflowRequest.update({
      where: { id: params.id },
      data: { status: 'APPROVED', approvedById: authCtx.user_id, approvedAt: new Date() },
    })
  })

  await cancelWorkflowReminder(params.id)
  await finalizeApproval(request, dept, approver?.email ?? 'admin')
  return apiResponse.success({ approved: true })
})

type WorkflowReq = Awaited<ReturnType<typeof prisma.workflowRequest.findUnique>> & object
type DeptInfo = { slackWebhookUrl: string | null; name: string } | null

async function finalizeApproval(request: NonNullable<WorkflowReq>, dept: DeptInfo, approverEmail: string) {
  await notifyUser(request.requestedById, {
    title: 'Workflow approved',
    body: request.description.slice(0, 100),
    url: '/chat',
  })

  if (dept?.slackWebhookUrl) {
    await sendSlackNotification(
      dept.slackWebhookUrl,
      `✅ *Workflow approved* in ${dept.name}\n>${request.description}\nApproved by ${approverEmail}`,
    )
  }

  if (request.n8nResumeUrl) {
    await n8nClient.resumeExecution(request.n8nResumeUrl, { approved: true, approvedBy: approverEmail })
    await prisma.workflowRequest.update({ where: { id: request.id }, data: { status: 'EXECUTED' } })
  }

  if (request.isLeaveRequest && request.leaveDays != null) {
    const requester = await prisma.user.findUnique({
      where: { id: request.requestedById },
      select: { email: true, name: true },
    })

    const leaveRecord = await prisma.leaveBalance.findUnique({
      where: { userId_deptId: { userId: request.requestedById, deptId: request.deptId } },
    })

    if (leaveRecord) {
      const newBalance = leaveRecord.balance - request.leaveDays
      await prisma.leaveBalance.update({
        where: { id: leaveRecord.id },
        data: { balance: newBalance },
      })

      if (requester?.email && request.leaveStartDate && request.leaveEndDate) {
        await sendLeaveApprovalEmail(
          requester.email,
          requester.name,
          request.leaveType ?? 'Leave',
          request.leaveStartDate,
          request.leaveEndDate,
          request.leaveDays,
          newBalance,
        )
      }
    }
  }
}
