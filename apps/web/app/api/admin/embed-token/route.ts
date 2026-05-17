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
  const dept = await prisma.department.update({
    where: { id: ctx.dept_id },
    data: { widgetToken: token },
    select: { widgetToken: true },
  })

  return apiResponse.success({ token: dept.widgetToken })
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
    data: { widgetToken: null },
  })

  return apiResponse.success({ token: null })
}
