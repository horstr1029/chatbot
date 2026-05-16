import { prisma } from '@/lib/db/client'
import { ingestionQueue } from '@/lib/queue/ingestion.queue'
import { apiResponse } from '@/lib/api/response'

export async function POST(req: Request) {
  const url = new URL(req.url)

  // MS Graph sends a validationToken query param during subscription setup
  const validationToken = url.searchParams.get('validationToken')
  if (validationToken) {
    return new Response(validationToken, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  let body: { value?: Array<{ clientState?: string; changeType?: string }> }
  try {
    body = await req.json()
  } catch {
    return apiResponse.error('INVALID_REQUEST', 'Invalid JSON body', 400)
  }

  for (const notification of body.value ?? []) {
    const { clientState, changeType } = notification
    if (!clientState) continue

    // clientState encodes sourceId — set when registering the subscription
    const source = await prisma.documentSource.findUnique({
      where: { id: clientState, deletedAt: null },
      select: { id: true, deptId: true },
    })

    if (!source) continue

    if (changeType === 'deleted') {
      await ingestionQueue.add('job', {
        type: 'DELETE_FILE',
        sourceId: source.id,
      })
    } else {
      await ingestionQueue.add('job', {
        type: 'FULL_RESYNC',
        deptId: source.deptId,
      })
    }
  }

  return apiResponse.success({ received: true })
}
