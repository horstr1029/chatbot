export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db/client'
import { deptMiddleware, requireRole } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'
import { getSession } from '@/lib/auth/session'

export const DELETE = withErrorHandler(async (_req: Request, { params }: { params: { id: string } }) => {
  const ctx = await deptMiddleware()
  requireRole(ctx.role, 'SUPER_ADMIN')

  const session = await getSession()
  if (params.id === session.userId) {
    return apiResponse.error('FORBIDDEN', 'You cannot remove your own super admin access.')
  }

  const user = await prisma.user.findUnique({ where: { id: params.id } })
  if (!user) return apiResponse.error('NOT_FOUND', 'User not found.')
  if (!user.isSuperAdmin) return apiResponse.error('CONFLICT', 'User is not a super admin.')

  await prisma.user.update({
    where: { id: params.id },
    data: { isSuperAdmin: false },
  })

  return apiResponse.success({ id: params.id })
})
