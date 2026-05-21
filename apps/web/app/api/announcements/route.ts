export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db/client'
import { deptMiddleware, requireRole } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'
import { z } from 'zod'

const createSchema = z.object({ content: z.string().min(1).max(500) })

export const GET = withErrorHandler(async () => {
  const ctx = await deptMiddleware()

  const announcements = await prisma.announcement.findMany({
    where: { deptId: ctx.dept_id, active: true },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  return apiResponse.success(announcements)
})

export const POST = withErrorHandler(async (req) => {
  const ctx = await deptMiddleware()
  requireRole(ctx.role, 'MANAGER')

  const { content } = createSchema.parse(await req.json())

  const announcement = await prisma.announcement.create({
    data: { deptId: ctx.dept_id, content, createdById: ctx.user_id },
  })

  return apiResponse.success(announcement, undefined, 201)
})
