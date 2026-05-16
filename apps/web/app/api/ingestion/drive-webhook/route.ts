import { headers } from 'next/headers'
import { prisma } from '@/lib/db/client'
import { ingestionQueue } from '@/lib/queue/ingestion.queue'
import { apiResponse } from '@/lib/api/response'

// Google Drive push notifications arrive as POST with resource state in headers
export async function POST(req: Request) {
  const headerMap = await headers()
  const state = headerMap.get('x-goog-resource-state')
  const channelId = headerMap.get('x-goog-channel-id')
  const resourceId = headerMap.get('x-goog-resource-id')

  // Sync notification (not the initial "sync" handshake)
  if (!state || state === 'sync' || !channelId || !resourceId) {
    return apiResponse.success({ received: true })
  }

  // channelId encodes sourceId — set when registering the watch
  const source = await prisma.documentSource.findUnique({
    where: { id: channelId, deletedAt: null },
    select: { id: true, deptId: true, name: true, dept: { select: { id: true } } },
  })

  if (!source) return apiResponse.success({ received: true })

  if (state === 'trash' || state === 'remove') {
    await ingestionQueue.add('job', {
      type: 'DELETE_FILE',
      sourceId: source.id,
    })
  } else {
    // 'update' | 'add' — worker will re-fetch via connector
    await ingestionQueue.add('job', {
      type: 'FULL_RESYNC',
      deptId: source.deptId,
    })
  }

  return apiResponse.success({ received: true })
}
