import { Queue, Worker } from 'bullmq'
import { redis } from '@/lib/redis/client'
import { makeBullMQConnection } from '@/lib/redis/bullmq'
import { prisma } from '@/lib/db/client'
import { sendDigestEmail } from '@/lib/email/mailer'

interface DigestJob {
  deptId?: string
}

export const digestQueue = new Queue<DigestJob>('digest', {
  connection: redis,
  defaultJobOptions: { removeOnComplete: true, removeOnFail: { count: 50 } },
})

export async function triggerDigestNow(deptId: string) {
  await digestQueue.add('send-now', { deptId }, { jobId: `digest-now-${deptId}-${Date.now()}` })
}

export function startDigestWorker() {
  digestQueue
    .add('weekly', {}, {
      jobId: 'weekly-digest',
      repeat: { pattern: '0 8 * * 1' },
      removeOnComplete: true,
    })
    .catch(() => {})

  return new Worker<DigestJob>(
    'digest',
    async (job) => {
      const { deptId } = job.data
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

      const depts = deptId
        ? await prisma.department.findMany({ where: { id: deptId } })
        : await prisma.department.findMany()

      for (const dept of depts) {
        const [sessions, feedback] = await Promise.all([
          prisma.chatSession.findMany({
            where: { deptId: dept.id, updatedAt: { gte: since } },
            select: { messages: true },
          }),
          prisma.messageFeedback.findMany({
            where: { deptId: dept.id, createdAt: { gte: since } },
            select: { rating: true },
          }),
        ])

        const thumbsUp = feedback.filter((f) => f.rating === 1).length
        const thumbsDown = feedback.filter((f) => f.rating === -1).length

        const questions: string[] = []
        for (const s of sessions) {
          const msgs = s.messages as { role: string; content: string }[]
          const first = msgs.find((m) => m.role === 'user')
          if (first) questions.push(first.content.slice(0, 120))
        }

        const adminRows = await prisma.userDepartment.findMany({
          where: { deptId: dept.id, role: 'MANAGER' },
          select: { user: { select: { email: true, name: true } } },
        })

        for (const { user } of adminRows) {
          await sendDigestEmail(user.email, user.name, dept.name, {
            sessionCount: sessions.length,
            thumbsUp,
            thumbsDown,
            questions: questions.slice(0, 10),
          })
        }
      }
    },
    { connection: makeBullMQConnection() },
  )
}
