export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db/client'
import { deptMiddleware } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'
import { notifyUser } from '@/lib/push/webpush'
import { sendSlackNotification } from '@/lib/slack/notify'
import { Errors } from '@/lib/errors'
import { z } from 'zod'

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  toDeptId: z.string().min(1),
})

export const GET = withErrorHandler(async () => {
  const ctx = await deptMiddleware()

  const requests = await prisma.crossDeptRequest.findMany({
    where: {
      OR: [
        { fromDeptId: ctx.dept_id },
        { toDeptId: ctx.dept_id },
      ],
    },
    orderBy: { createdAt: 'desc' },
    include: {
      fromDept: { select: { name: true } },
      toDept: { select: { name: true } },
      requestedBy: { select: { name: true, email: true } },
    },
  })

  return apiResponse.success(requests)
})

export const POST = withErrorHandler(async (req) => {
  const ctx = await deptMiddleware()

  const body = createSchema.parse(await req.json())

  if (body.toDeptId === ctx.dept_id) {
    return apiResponse.error('INVALID_DEPT', 'Target department must be different from your own', 400)
  }

  const targetDept = await prisma.department.findUnique({
    where: { id: body.toDeptId },
    select: { id: true, name: true, slackWebhookUrl: true },
  })
  if (!targetDept) throw Errors.NOT_FOUND('Department')

  const fromDept = await prisma.department.findUnique({
    where: { id: ctx.dept_id },
    select: { name: true },
  })

  const request = await prisma.crossDeptRequest.create({
    data: {
      title: body.title,
      description: body.description,
      fromDeptId: ctx.dept_id,
      toDeptId: body.toDeptId,
      requestedById: ctx.user_id,
      status: 'OPEN',
    },
    include: {
      fromDept: { select: { name: true } },
      toDept: { select: { name: true } },
      requestedBy: { select: { name: true, email: true } },
    },
  })

  // Notify target dept admins
  const targetAdmins = await prisma.userDepartment.findMany({
    where: { deptId: body.toDeptId, role: 'DEPT_ADMIN' },
    select: { userId: true },
  })
  for (const { userId } of targetAdmins) {
    await notifyUser(userId, {
      title: `New request from ${fromDept?.name ?? 'another dept'}`,
      body: body.title,
      url: '/admin/cross-dept',
    })
  }

  if (targetDept.slackWebhookUrl) {
    await sendSlackNotification(
      targetDept.slackWebhookUrl,
      `📨 *New cross-dept request* from ${fromDept?.name ?? 'another dept'}\n*${body.title}*\n${body.description.slice(0, 200)}`,
    )
  }

  return apiResponse.success(request, undefined, 201)
})
