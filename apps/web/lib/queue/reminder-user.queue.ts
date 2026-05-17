import { Queue, Worker } from 'bullmq'
import { redis } from '@/lib/redis/client'
import { makeBullMQConnection } from '@/lib/redis/bullmq'
import { prisma } from '@/lib/db/client'
import { notifyUser } from '@/lib/push/webpush'

/**
 * Calculate the next Date a cron expression fires after now.
 * Handles a limited set of common patterns; falls back to 24h from now
 * for anything unrecognised.
 *
 * Supported:
 *   * /N * * * *          every N minutes
 *   0  H * * *            daily at hour H
 *   0  H * * D            weekly on weekday D (0=Sun … 6=Sat) at hour H
 *   0  H * * D1-D2        weekday range at hour H  (e.g. 0 9 * * 1-5)
 *   0  H 1 * *            monthly on 1st at hour H
 */
export function nextCronRun(cronExpr: string): Date {
  const now = new Date()
  const parts = cronExpr.trim().split(/\s+/)
  if (parts.length !== 5) return new Date(now.getTime() + 24 * 60 * 60 * 1000)

  const [minute, hour, dom, , dow] = parts

  // Every N minutes: */N * * * *
  const minuteMatch = minute.match(/^\*\/(\d+)$/)
  if (minuteMatch) {
    const n = parseInt(minuteMatch[1], 10)
    if (n > 0) return new Date(now.getTime() + n * 60 * 1000)
  }

  // Needs a fixed minute and hour
  if (minute === '0' && /^\d+$/.test(hour)) {
    const h = parseInt(hour, 10)

    // Monthly on 1st: 0 H 1 * *
    if (dom === '1' && dow === '*') {
      const candidate = new Date(now)
      candidate.setMinutes(0, 0, 0)
      candidate.setHours(h)
      candidate.setDate(1)
      if (candidate <= now) {
        // Move to next month
        candidate.setMonth(candidate.getMonth() + 1)
        candidate.setDate(1)
        candidate.setHours(h, 0, 0, 0)
      }
      return candidate
    }

    // Weekly or weekday range: 0 H * * D  or  0 H * * D1-D2
    if (dom === '*' && dow !== '*') {
      // Weekday range e.g. 1-5
      const rangeMatch = dow.match(/^(\d+)-(\d+)$/)
      if (rangeMatch) {
        const dStart = parseInt(rangeMatch[1], 10)
        const dEnd = parseInt(rangeMatch[2], 10)
        for (let offset = 0; offset <= 7; offset++) {
          const candidate = new Date(now)
          candidate.setDate(now.getDate() + offset)
          candidate.setHours(h, 0, 0, 0)
          if (candidate <= now) continue
          const wd = candidate.getDay()
          if (wd >= dStart && wd <= dEnd) return candidate
        }
      }

      // Single weekday
      const singleMatch = dow.match(/^(\d+)$/)
      if (singleMatch) {
        const targetDay = parseInt(singleMatch[1], 10)
        for (let offset = 0; offset <= 7; offset++) {
          const candidate = new Date(now)
          candidate.setDate(now.getDate() + offset)
          candidate.setHours(h, 0, 0, 0)
          if (candidate <= now) continue
          if (candidate.getDay() === targetDay) return candidate
        }
      }
    }

    // Daily: 0 H * * *
    if (dom === '*' && dow === '*') {
      const candidate = new Date(now)
      candidate.setHours(h, 0, 0, 0)
      if (candidate > now) return candidate
      candidate.setDate(candidate.getDate() + 1)
      candidate.setHours(h, 0, 0, 0)
      return candidate
    }
  }

  // Fallback: 24h from now
  return new Date(now.getTime() + 24 * 60 * 60 * 1000)
}

interface ReminderCheckJob {
  _tick?: number
}

export const reminderUserQueue = new Queue<ReminderCheckJob>('reminder-user', {
  connection: redis,
  defaultJobOptions: { removeOnComplete: true, removeOnFail: { count: 50 } },
})

export function startReminderUserWorker() {
  reminderUserQueue
    .add(
      'check',
      {},
      {
        jobId: 'reminder-user-check',
        repeat: { pattern: '*/15 * * * *' },
        removeOnComplete: true,
      },
    )
    .catch(() => {})

  return new Worker<ReminderCheckJob>(
    'reminder-user',
    async () => {
      const now = new Date()

      const dueReminders = await prisma.reminder.findMany({
        where: { active: true, nextRunAt: { lte: now } },
        include: { user: { select: { id: true, name: true } } },
      })

      for (const reminder of dueReminders) {
        await notifyUser(reminder.userId, {
          title: reminder.title,
          body: `Your reminder: ${reminder.title}`,
          url: '/chat',
        })

        const next = nextCronRun(reminder.cronExpr)

        await prisma.reminder.update({
          where: { id: reminder.id },
          data: { lastSentAt: now, nextRunAt: next },
        })
      }
    },
    { connection: makeBullMQConnection() },
  )
}
