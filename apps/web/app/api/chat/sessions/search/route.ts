export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db/client'
import { deptMiddleware } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'

export const GET = withErrorHandler(async (req) => {
  const ctx = await deptMiddleware()
  const q = new URL(req.url).searchParams.get('q')?.trim() ?? ''

  if (!q || q.length < 2) return apiResponse.success([])

  const sessions = await prisma.$queryRaw<{ id: string; title: string | null; updatedAt: Date }[]>`
    SELECT id, title, "updatedAt"
    FROM "ChatSession"
    WHERE "userId" = ${ctx.user_id}
      AND messages::text ILIKE ${'%' + q + '%'}
    ORDER BY "updatedAt" DESC
    LIMIT 20
  `

  return apiResponse.success(sessions)
})
