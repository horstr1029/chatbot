import { deptMiddleware } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/client'
import { apiResponse, withErrorHandler } from '@/lib/api/response'
import { sendEscalationEmail } from '@/lib/email/mailer'
import { auditLog } from '@/lib/audit/log'
import { z } from 'zod'

const schema = z.object({
  sessionId: z.string().min(1),
  note: z.string().max(500).optional().default(''),
})

export const POST = withErrorHandler(async (req) => {
  const ctx = await deptMiddleware()
  const { sessionId, note } = schema.parse(await req.json())

  const [session, user, dept, manager] = await Promise.all([
    prisma.chatSession.findUnique({
      where: { id: sessionId, userId: ctx.user_id },
      select: { messages: true, deptId: true },
    }),
    prisma.user.findUnique({ where: { id: ctx.user_id }, select: { name: true, email: true } }),
    prisma.department.findUnique({ where: { id: ctx.dept_id ?? '' }, select: { name: true } }),
    prisma.userDepartment.findFirst({
      where: { deptId: ctx.dept_id ?? '', role: 'MANAGER' },
      include: { user: { select: { email: true, name: true } } },
    }),
  ])

  if (!session || !user || !manager) {
    return apiResponse.error('NOT_FOUND', 'Session or manager not found', 404)
  }

  const transcript = (session.messages as { role: string; content: string }[]).slice(-20)

  await sendEscalationEmail({
    to: manager.user.email,
    managerName: manager.user.name,
    fromUserName: user.name ?? user.email,
    deptName: dept?.name ?? 'Unknown',
    note,
    transcript,
  })

  await auditLog({ userId: ctx.user_id, userEmail: user.email, action: 'CHAT_ESCALATED', targetId: sessionId, targetType: 'ChatSession', deptId: ctx.dept_id ?? undefined })

  return apiResponse.success({ sent: true })
})
