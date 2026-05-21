import { prisma } from '@/lib/db/client'
import { deptMiddleware } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'
import { notifyUser } from '@/lib/push/webpush'
import { Errors } from '@/lib/errors'
import { z } from 'zod'

const schema = z.object({ content: z.string().min(1).max(2000) })

type RouteContext = { params: { id: string } }

export const POST = withErrorHandler(async (req, rawCtx) => {
  const { params } = rawCtx as RouteContext
  const ctx = await deptMiddleware()
  const { content } = schema.parse(await req.json())

  const request = await prisma.crossDeptRequest.findUnique({
    where: { id: params.id },
    select: { id: true, fromDeptId: true, toDeptId: true, title: true, status: true },
  })

  if (!request) throw Errors.NOT_FOUND('Request')

  const isParticipant = request.fromDeptId === ctx.dept_id || request.toDeptId === ctx.dept_id
  if (!isParticipant) return apiResponse.error('FORBIDDEN', 'Not a participant', 403)
  if (request.status === 'RESOLVED' || request.status === 'CANCELLED') {
    return apiResponse.error('INVALID_STATUS', 'Cannot message on a closed request', 400)
  }

  const [message] = await prisma.$transaction([
    prisma.crossDeptMessage.create({
      data: { requestId: params.id, userId: ctx.user_id, deptId: ctx.dept_id ?? '', content },
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.crossDeptRequest.update({
      where: { id: params.id },
      data: { status: request.status === 'OPEN' ? 'IN_PROGRESS' : request.status },
    }),
  ])

  // Notify the other dept's managers
  const otherDeptId = ctx.dept_id === request.fromDeptId ? request.toDeptId : request.fromDeptId
  const otherManagers = await prisma.userDepartment.findMany({
    where: { deptId: otherDeptId, role: 'MANAGER' },
    select: { userId: true },
  })
  const senderName = message.user.name ?? message.user.email
  for (const { userId } of otherManagers) {
    await notifyUser(userId, {
      title: `New message on: ${request.title}`,
      body: `${senderName}: ${content.slice(0, 100)}`,
      url: '/admin/cross-dept',
    })
  }

  return apiResponse.success(
    {
      ...message,
      createdAt: message.createdAt.toISOString(),
    },
    undefined,
    201,
  )
})
