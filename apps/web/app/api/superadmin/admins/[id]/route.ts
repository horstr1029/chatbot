export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db/client'
import { deptMiddleware, requireRole } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'
import { getSession } from '@/lib/auth/session'

export const DELETE = withErrorHandler(async (req: Request, ctx: unknown) => {
  const { id } = (ctx as { params: { id: string } }).params

  const authCtx = await deptMiddleware()
  requireRole(authCtx.role, 'SUPER_ADMIN')

  const session = await getSession()
  if (id === session.userId) {
    return apiResponse.error('FORBIDDEN', 'You cannot remove your own super admin access.')
  }

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) return apiResponse.error('NOT_FOUND', 'User not found.')
  if (!user.isSuperAdmin) return apiResponse.error('CONFLICT', 'User is not a super admin.')

  await prisma.user.update({ where: { id }, data: { isSuperAdmin: false } })

  return apiResponse.success({ id })
})
