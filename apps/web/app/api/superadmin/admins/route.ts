export const dynamic = 'force-dynamic'

import { z } from 'zod'
import { prisma } from '@/lib/db/client'
import { deptMiddleware, requireRole } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'
import { auditLog } from '@/lib/audit/log'
import { getSession } from '@/lib/auth/session'

const addSchema = z.object({ email: z.string().email() })

export const POST = withErrorHandler(async (req: Request) => {
  const ctx = await deptMiddleware()
  requireRole(ctx.role, 'SUPER_ADMIN')

  const body = await req.json()
  const { email } = addSchema.parse(body)

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  if (!user) return apiResponse.error('NOT_FOUND', 'No user with that email address exists.')
  if (user.isSuperAdmin) return apiResponse.error('CONFLICT', 'User is already a super admin.')

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { isSuperAdmin: true },
    select: { id: true, name: true, email: true, createdAt: true },
  })

  const session = await getSession()
  await auditLog({ userId: ctx.user_id, userEmail: session.email ?? '', action: 'SUPERADMIN_GRANTED', targetId: user.id, targetType: 'User', meta: { targetEmail: user.email } })

  return apiResponse.success(updated)
})
