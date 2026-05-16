export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db/client'
import { deptMiddleware, requireRole } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'
import { ingestionQueue } from '@/lib/queue/ingestion.queue'
import { Errors } from '@/lib/errors'

type Ctx = { params: { id: string; sid: string } }

export const POST = withErrorHandler(async (_req, ctx) => {
  const { params } = ctx as Ctx
  const authCtx = await deptMiddleware()
  requireRole(authCtx.role, 'DEPT_ADMIN')
  if (authCtx.role !== 'SUPER_ADMIN' && authCtx.dept_id !== params.id) throw Errors.FORBIDDEN()

  const source = await prisma.documentSource.findFirst({
    where: { id: params.sid, deptId: params.id, deletedAt: null },
    select: { id: true, sourceType: true, deptId: true },
  })
  if (!source) throw Errors.NOT_FOUND('DocumentSource')

  if (source.sourceType === 'LOCAL') {
    return apiResponse.error('UNSUPPORTED', 'Local sources are synced via the ingestion service directly', 400)
  }

  await ingestionQueue.add('job', {
    type: 'FULL_RESYNC',
    deptId: source.deptId,
    sourceId: source.id,
  })

  await prisma.documentSource.update({
    where: { id: source.id },
    data: { lastSynced: new Date() },
  })

  return apiResponse.success({ queued: true })
})
