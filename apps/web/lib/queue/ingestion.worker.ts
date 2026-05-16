import { Worker, type Job } from 'bullmq'
import { redis } from '@/lib/redis/client'
import { prisma } from '@/lib/db/client'
import type { IngestionJobData } from './ingestion.queue'

const INGESTION_URL = process.env.INGESTION_SERVICE_URL ?? 'http://localhost:8000'

async function processJob(job: Job<IngestionJobData>) {
  const { data } = job

  switch (data.type) {
    case 'SYNC_FILE':
      await syncFile(data)
      break
    case 'DELETE_FILE':
      await deleteFile(data)
      break
    case 'FULL_RESYNC':
      await fullResync(data)
      break
  }
}

async function syncFile(data: Extract<IngestionJobData, { type: 'SYNC_FILE' }>) {
  const res = await fetch(`${INGESTION_URL}/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file_bytes: data.fileBytes,
      file_name: data.fileName,
      mime_type: data.mimeType,
      dept_ids: data.deptIds,
      source_id: data.sourceId,
      source_name: data.sourceName,
      source_url: data.sourceUrl,
    }),
  })

  if (!res.ok) {
    throw new Error(`Ingestion service error: ${res.status} ${await res.text()}`)
  }

  await prisma.documentSource.updateMany({
    where: { id: data.sourceId },
    data: { lastSynced: new Date() },
  })
}

async function deleteFile(data: Extract<IngestionJobData, { type: 'DELETE_FILE' }>) {
  const res = await fetch(`${INGESTION_URL}/source/${data.sourceId}`, {
    method: 'DELETE',
  })

  if (!res.ok) {
    throw new Error(`Ingestion delete error: ${res.status} ${await res.text()}`)
  }
}

async function fullResync(data: Extract<IngestionJobData, { type: 'FULL_RESYNC' }>) {
  const sources = await prisma.documentSource.findMany({
    where: { deptId: data.deptId, deletedAt: null },
  })

  // Re-queue each source as a SYNC_FILE job — connectors handle fetching bytes
  // This is a trigger; actual file fetching happens in the connector layer (TASK-07)
  for (const source of sources) {
    await prisma.documentSource.update({
      where: { id: source.id },
      data: { lastSynced: null },
    })
  }
}

export function startIngestionWorker() {
  const worker = new Worker<IngestionJobData>('ingestion', processJob, {
    connection: redis,
    concurrency: 5,
  })

  worker.on('failed', (job, err) => {
    console.error(`[ingestion] job ${job?.id} failed:`, err.message)
  })

  return worker
}
