export const dynamic = 'force-dynamic'

import { deptMiddleware, requireRole } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/client'
import { ingestionQueue } from '@/lib/queue/ingestion.queue'
import { apiResponse } from '@/lib/api/response'
import { z } from 'zod'

const schema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string(),
  fileBytes: z.string(), // base64
  expiresAt: z.string().nullable().optional(),
})

export async function POST(req: Request) {
  let ctx
  try { ctx = await deptMiddleware() } catch { return apiResponse.error('UNAUTHORIZED', 'Unauthorized', 401) }
  requireRole(ctx.role, 'MANAGER')

  const body = schema.safeParse(await req.json())
  if (!body.success) return apiResponse.error('INVALID_REQUEST', 'Invalid body', 400)

  const { fileName, mimeType, fileBytes, expiresAt } = body.data

  const dept = await prisma.department.findUnique({
    where: { id: ctx.dept_id },
    select: { id: true },
  })
  if (!dept) return apiResponse.error('NOT_FOUND', 'Department not found', 404)

  const source = await prisma.documentSource.create({
    data: {
      name: fileName,
      sourceType: 'LOCAL',
      deptId: ctx.dept_id,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  })

  await ingestionQueue.add('job', {
    type: 'SYNC_FILE',
    sourceId: source.id,
    sourceName: fileName,
    sourceUrl: null,
    deptIds: [ctx.dept_id],
    fileBytes,
    fileName,
    mimeType,
  })

  return apiResponse.success({ sourceId: source.id, queued: true })
}
