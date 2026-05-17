import { Worker, type Job } from 'bullmq'
import { makeBullMQConnection } from '@/lib/redis/bullmq'
import { prisma } from '@/lib/db/client'
import type { IngestionJobData } from './ingestion.queue'

const INGESTION_URL = process.env.INGESTION_SERVICE_URL ?? 'http://localhost:8001'

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
  const where = {
    deptId: data.deptId,
    deletedAt: null as null,
    ...(data.sourceId ? { id: data.sourceId } : {}),
  }

  const sources = await prisma.documentSource.findMany({
    where,
    include: {
      dept: { select: { id: true } },
    },
  })

  const dept = await prisma.department.findUnique({
    where: { id: data.deptId },
    select: { members: { select: { deptId: true } } },
  })

  for (const source of sources) {
    if (source.sourceType === 'LOCAL') continue

    try {
      const res = await fetch(`${INGESTION_URL}/resync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_id: source.id,
          source_name: source.name,
          source_type: source.sourceType,
          folder_id: source.sourcePath ?? undefined,
          source_url: source.sourceUrl ?? undefined,
          dept_ids: [data.deptId],
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Resync failed: ${res.status} ${text}`)
      }

      const result = await res.json() as { files_processed: number; chunks_upserted: number; errors: string[] }

      await prisma.documentSource.update({
        where: { id: source.id },
        data: { lastSynced: new Date() },
      })

      if (result.errors?.length) {
        process.stderr.write(`[ingestion] resync ${source.id} partial errors: ${result.errors.join('; ')}\n`)
      }

      process.stdout.write(JSON.stringify({
        ts: new Date().toISOString(), level: 'info', event: 'resync_complete',
        sourceId: source.id, sourceName: source.name,
        filesProcessed: result.files_processed, chunksUpserted: result.chunks_upserted,
      }) + '\n')
    } catch (err) {
      process.stderr.write(`[ingestion] resync failed for source ${source.id}: ${err}\n`)
      throw err
    }
  }
}

export function startIngestionWorker() {
  const worker = new Worker<IngestionJobData>('ingestion', processJob, {
    connection: makeBullMQConnection(),
    concurrency: 3,
  })

  worker.on('failed', (job, err) => {
    process.stderr.write(`[ingestion] job ${job?.id} failed: ${err.message}\n`)
  })

  worker.on('completed', (job) => {
    process.stdout.write(JSON.stringify({
      ts: new Date().toISOString(), level: 'info', event: 'job_completed', jobId: job.id, type: job.data.type,
    }) + '\n')
  })

  return worker
}
