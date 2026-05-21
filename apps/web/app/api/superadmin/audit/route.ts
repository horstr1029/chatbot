export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db/client'
import { deptMiddleware, requireRole } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'

export const GET = withErrorHandler(async (req) => {
  const ctx = await deptMiddleware()
  requireRole(ctx.role, 'SUPER_ADMIN')

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const deptId = searchParams.get('deptId') ?? undefined
  const action = searchParams.get('action') ?? undefined
  const take = 50

  const where = {
    ...(deptId ? { deptId } : {}),
    ...(action ? { action } : {}),
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * take,
      take,
    }),
    prisma.auditLog.count({ where }),
  ])

  return apiResponse.success({ logs, total, page, pages: Math.ceil(total / take) })
})
