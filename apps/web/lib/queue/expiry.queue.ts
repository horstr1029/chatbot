import { Queue, Worker } from 'bullmq'
import { redis } from '@/lib/redis/client'
import { makeBullMQConnection } from '@/lib/redis/bullmq'
import { prisma } from '@/lib/db/client'
import { sendExpiryAlert } from '@/lib/email/mailer'

interface ExpiryJob {
  _trigger?: string
}

export const expiryQueue = new Queue<ExpiryJob>('expiry', {
  connection: redis,
  defaultJobOptions: { removeOnComplete: true, removeOnFail: { count: 50 } },
})

export function startExpiryWorker() {
  expiryQueue
    .add('weekly', {}, {
      jobId: 'weekly-expiry',
      repeat: { pattern: '0 7 * * 0' },
      removeOnComplete: true,
    })
    .catch(() => {})

  return new Worker<ExpiryJob>(
    'expiry',
    async () => {
      const now = new Date()
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

      const sources = await prisma.documentSource.findMany({
        where: {
          expiresAt: { lte: in30Days, gt: now },
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          expiresAt: true,
          deptId: true,
        },
      })

      if (sources.length === 0) return

      // Group by deptId
      const byDept = new Map<string, { name: string; expiresAt: Date }[]>()
      for (const s of sources) {
        if (!s.expiresAt) continue
        const list = byDept.get(s.deptId) ?? []
        list.push({ name: s.name, expiresAt: s.expiresAt })
        byDept.set(s.deptId, list)
      }

      for (const [deptId, expiringSources] of Array.from(byDept.entries())) {
        const dept = await prisma.department.findUnique({ where: { id: deptId } })
        if (!dept) continue

        const adminRows = await prisma.userDepartment.findMany({
          where: { deptId, role: 'DEPT_ADMIN' },
          select: { user: { select: { email: true, name: true } } },
        })

        for (const { user } of adminRows) {
          await sendExpiryAlert(user.email, user.name, dept.name, expiringSources)
        }
      }
    },
    { connection: makeBullMQConnection() },
  )
}
