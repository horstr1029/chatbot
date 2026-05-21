import { QdrantClient } from '@qdrant/js-client-rest'
import type { Department } from '@prisma/client'
import { embedQuery } from './embed'

export type RetrievedChunk = {
  text: string
  sourceId: string
  sourceName: string
  sourceUrl: string
  chunkIndex: number
  score: number
  imageBase64?: string
  imageMediaType?: string
}

const COLLECTION = 'company_docs'
const TOP_K = 5

function qdrant() {
  return new QdrantClient({
    url: process.env.QDRANT_URL ?? 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY || undefined,
  })
}

export async function retrieve(query: string, dept: Department, extraDeptIds: string[] = []): Promise<RetrievedChunk[]> {
  const vector = await embedQuery(query, dept)
  const client = qdrant()
  const deptFilter = [dept.id, ...extraDeptIds, 'global']

  const results = await client.search(COLLECTION, {
    vector,
    limit: TOP_K,
    filter: {
      must: [
        {
          key: 'dept_ids',
          match: { any: deptFilter },
        },
      ],
    },
    with_payload: true,
  })

  const MIN_SCORE = 0.4

  return results
    .filter((r) => r.payload && r.score >= MIN_SCORE)
    .map((r) => ({
      text: r.payload!.text as string,
      sourceId: r.payload!.source_id as string,
      sourceName: r.payload!.source_name as string,
      sourceUrl: r.payload!.source_url as string,
      chunkIndex: r.payload!.chunk_index as number,
      score: r.score,
      imageBase64: r.payload!.image_base64 as string | undefined,
      imageMediaType: r.payload!.image_media_type as string | undefined,
    }))
}
