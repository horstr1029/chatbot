export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db/client'
import { deptMiddleware } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'
import { nextCronRun } from '@/lib/queue/reminder-user.queue'
import { Errors } from '@/lib/errors'
import { z } from 'zod'

const createSchema = z.object({
  title: z.string().min(1),
  topic: z.string().min(1),
  cronExpr: z.string().min(1),
  scheduleLabel: z.string().min(1),
})

const deleteSchema = z.object({
  id: z.string().min(1),
})

export const GET = withErrorHandler(async () => {
  const ctx = await deptMiddleware()

  const reminders = await prisma.reminder.findMany({
    where: { userId: ctx.user_id, active: true },
    orderBy: { createdAt: 'desc' },
  })

  return apiResponse.success(reminders)
})

export const POST = withErrorHandler(async (req) => {
  const ctx = await deptMiddleware()

  const body = createSchema.parse(await req.json())
  const nextRunAt = nextCronRun(body.cronExpr)

  const reminder = await prisma.reminder.create({
    data: {
      userId: ctx.user_id,
      deptId: ctx.dept_id,
      title: body.title,
      topic: body.topic,
      cronExpr: body.cronExpr,
      scheduleLabel: body.scheduleLabel,
      nextRunAt,
      active: true,
    },
  })

  return apiResponse.success(reminder, undefined, 201)
})

export const DELETE = withErrorHandler(async (req) => {
  const ctx = await deptMiddleware()

  const body = deleteSchema.parse(await req.json())

  const reminder = await prisma.reminder.findUnique({ where: { id: body.id } })
  if (!reminder) throw Errors.NOT_FOUND('Reminder')
  if (reminder.userId !== ctx.user_id) throw Errors.FORBIDDEN()

  await prisma.reminder.update({
    where: { id: body.id },
    data: { active: false },
  })

  return apiResponse.success({ deleted: true })
})
