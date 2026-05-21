export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db/client'
import { deptMiddleware } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'
import { Errors } from '@/lib/errors'
import { notifyUser } from '@/lib/push/webpush'
import { sendWorkflowApprovalRequestEmail } from '@/lib/email/mailer'
import { getDept } from '@/lib/dept/getDept'
import { scheduleWorkflowReminder } from '@/lib/queue/reminder.queue'
import { z } from 'zod'

const bodySchema = z.object({
  templateId: z.string().min(1),
  values: z.record(z.string()),
})

export const POST = withErrorHandler(async (req) => {
  const ctx = await deptMiddleware()
  const body = bodySchema.parse(await req.json())

  const template = await prisma.formTemplate.findUnique({
    where: { id: body.templateId },
  })
  if (!template) throw Errors.NOT_FOUND('FormTemplate')
  if (template.deptId !== ctx.dept_id) throw Errors.DEPT_MISMATCH()

  const dept = await getDept(ctx.dept_id)
  const chain = dept.approvalChain as { stepOrder: number; label: string; deptId: string }[] | null

  const description = `${template.name} submitted by user — ${Object.entries(body.values)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ')
    .slice(0, 200)}`

  const [wfRecord, requester] = await Promise.all([
    prisma.workflowRequest.create({
      data: {
        userMessage: description,
        description,
        n8nWorkflowId: '',
        n8nResumeUrl: null,
        status: 'PENDING',
        deptId: ctx.dept_id,
        requestedById: ctx.user_id,
      },
    }),
    prisma.user.findUnique({ where: { id: ctx.user_id }, select: { name: true, email: true } }),
  ])

  const requesterName = requester?.name ?? requester?.email ?? 'A user'

  if (chain && chain.length > 0) {
    await prisma.workflowApprovalStep.createMany({
      data: chain.map((s) => ({
        workflowId: wfRecord.id,
        stepOrder: s.stepOrder,
        label: s.label,
        approvingDeptId: s.deptId,
      })),
    })

    const firstStep = chain[0]
    const firstAdmins = await prisma.userDepartment.findMany({
      where: { deptId: firstStep.deptId, role: 'DEPT_ADMIN' },
      include: { user: { select: { name: true, email: true } } },
    })
    await Promise.all([
      ...firstAdmins.map(({ userId }) =>
        notifyUser(userId, {
          title: `${template.name} submitted`,
          body: description.slice(0, 80),
          url: '/admin/workflows',
        }),
      ),
      sendWorkflowApprovalRequestEmail(
        firstAdmins.map((a) => ({ email: a.user.email, name: a.user.name })),
        dept.name,
        requesterName,
        description,
        firstStep.label,
      ),
    ])
  } else {
    const deptAdmins = await prisma.userDepartment.findMany({
      where: { deptId: ctx.dept_id, role: 'DEPT_ADMIN' },
      include: { user: { select: { name: true, email: true } } },
    })
    await Promise.all([
      ...deptAdmins.map(({ userId }) =>
        notifyUser(userId, {
          title: `${template.name} submitted`,
          body: description.slice(0, 80),
          url: '/admin/workflows',
        }),
      ),
      sendWorkflowApprovalRequestEmail(
        deptAdmins.map((a) => ({ email: a.user.email, name: a.user.name })),
        dept.name,
        requesterName,
        description,
      ),
    ])
  }

  await scheduleWorkflowReminder(wfRecord.id, ctx.dept_id)

  return apiResponse.success({ id: wfRecord.id })
})
