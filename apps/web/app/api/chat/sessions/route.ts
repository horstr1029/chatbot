export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db/client'
import { deptMiddleware } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'
import { z } from 'zod'

const saveSchema = z.object({
  sessionId: z.string().optional(),
  title: z.string().optional(),
  messages: z.array(z.object({
    id: z.string(),
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })),
})

// GET — list last 20 sessions for the current user
export const GET = withErrorHandler(async () => {
  const ctx = await deptMiddleware()

  const sessions = await prisma.chatSession.findMany({
    where: { userId: ctx.user_id },
    orderBy: { updatedAt: 'desc' },
    take: 20,
    select: { id: true, title: true, updatedAt: true },
  })

  return apiResponse.success(sessions)
})

// POST — create or update a session
export const POST = withErrorHandler(async (req) => {
  const ctx = await deptMiddleware()
  const body = saveSchema.parse(await req.json())

  const title = body.title ??
    body.messages.find((m) => m.role === 'user')?.content.slice(0, 60) ??
    'Untitled'

  let session
  if (body.sessionId) {
    session = await prisma.chatSession.updateMany({
      where: { id: body.sessionId, userId: ctx.user_id },
      data: { messages: body.messages, title, updatedAt: new Date() },
    })
    return apiResponse.success({ id: body.sessionId })
  }

  session = await prisma.chatSession.create({
    data: {
      userId: ctx.user_id,
      deptId: ctx.dept_id,
      title,
      messages: body.messages,
    },
    select: { id: true },
  })

  return apiResponse.success({ id: session.id })
})
