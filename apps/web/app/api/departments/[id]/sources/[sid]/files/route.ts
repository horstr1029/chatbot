export const dynamic = 'force-dynamic'

import { QdrantClient } from '@qdrant/js-client-rest'
import { deptMiddleware } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'
import { Errors } from '@/lib/errors'

type Ctx = { params: { id: string; sid: string } }

const COLLECTION = 'company_docs'

function qdrant() {
  return new QdrantClient({
    url: process.env.QDRANT_URL ?? 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY || undefined,
  })
}

export const GET = withErrorHandler(async (_req, ctx) => {
  const { params } = ctx as Ctx
  const authCtx = await deptMiddleware()
  if (authCtx.role !== 'SUPER_ADMIN' && authCtx.dept_id !== params.id) throw Errors.FORBIDDEN()

  const client = qdrant()
  const seen = new Set<string>()
  const files: { name: string; url: string }[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let offset: any = undefined

  do {
    const result = await client.scroll(COLLECTION, {
      filter: {
        must: [{ key: 'source_id', match: { value: params.sid } }],
      },
      with_payload: ['file_name', 'source_url'],
      limit: 250,
      offset,
    })

    for (const point of result.points) {
      const name = point.payload?.file_name as string | undefined
      if (name && !seen.has(name)) {
        seen.add(name)
        files.push({ name, url: (point.payload?.source_url as string) ?? '' })
      }
    }

    offset = result.next_page_offset ?? undefined
  } while (offset !== undefined)

  return apiResponse.success(files)
})
