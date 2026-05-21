import { deptMiddleware, requireRole } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/client'
import { apiResponse } from '@/lib/api/response'
import { randomBytes } from 'crypto'

export async function POST() {
  let ctx
  try {
    ctx = await deptMiddleware()
  } catch {
    return apiResponse.error('UNAUTHORIZED', 'Unauthorized', 401)
  }
  requireRole(ctx.role, 'DEPT_ADMIN')

  const token = randomBytes(24).toString('hex')
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
  const dept = await prisma.department.update({
    where: { id: ctx.dept_id },
    data: { widgetToken: token, widgetTokenExpiresAt: expiresAt },
    select: { widgetToken: true, widgetTokenExpiresAt: true },
  })

  return apiResponse.success({ token: dept.widgetToken, expiresAt: dept.widgetTokenExpiresAt })
}

export async function DELETE() {
  let ctx
  try {
    ctx = await deptMiddleware()
  } catch {
    return apiResponse.error('UNAUTHORIZED', 'Unauthorized', 401)
  }
  requireRole(ctx.role, 'DEPT_ADMIN')

  await prisma.department.update({
    where: { id: ctx.dept_id },
    data: { widgetToken: null, widgetTokenExpiresAt: null },
  })

  return apiResponse.success({ token: null })
}
