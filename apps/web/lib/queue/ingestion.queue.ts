import { Queue } from 'bullmq'
import { redis } from '@/lib/redis/client'

export type JobType = 'SYNC_FILE' | 'DELETE_FILE' | 'FULL_RESYNC'

export type SyncFileJob = {
  type: 'SYNC_FILE'
  sourceId: string
  sourceName: string
  sourceUrl: string | null
  deptIds: string[]
  fileBytes: string   // base64
  fileName: string
  mimeType: string
}

export type DeleteFileJob = {
  type: 'DELETE_FILE'
  sourceId: string
}

export type FullResyncJob = {
  type: 'FULL_RESYNC'
  deptId: string
}

export type IngestionJobData = SyncFileJob | DeleteFileJob | FullResyncJob

export const ingestionQueue = new Queue<IngestionJobData>('ingestion', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
})
