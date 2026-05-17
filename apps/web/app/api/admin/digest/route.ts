import { deptMiddleware, requireRole } from '@/lib/auth/middleware'
import { triggerDigestNow } from '@/lib/queue/digest.queue'
import { apiResponse } from '@/lib/api/response'

export async function POST() {
  let ctx
  try {
    ctx = await deptMiddleware()
  } catch {
    return apiResponse.error('UNAUTHORIZED', 'Unauthorized', 401)
  }
  requireRole(ctx.role, 'DEPT_ADMIN')

  await triggerDigestNow(ctx.dept_id)
  return apiResponse.success({ queued: true })
}
