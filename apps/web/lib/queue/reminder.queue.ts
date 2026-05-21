import { Queue, Worker } from 'bullmq'
import { redis } from '@/lib/redis/client'
import { makeBullMQConnection } from '@/lib/redis/bullmq'
import { prisma } from '@/lib/db/client'
import { sendWorkflowReminderEmail } from '@/lib/email/mailer'
import { logger } from '@/lib/logger'

interface WorkflowReminderJob {
  workflowRequestId: string
  deptId: string
}

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000

export const reminderQueue = new Queue<WorkflowReminderJob>('workflow-reminders', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: { count: 50 },
  },
})

export async function scheduleWorkflowReminder(workflowRequestId: string, deptId: string) {
  await reminderQueue.add(
    'pending-reminder',
    { workflowRequestId, deptId },
    { delay: FORTY_EIGHT_HOURS_MS, jobId: `reminder-${workflowRequestId}` },
  )
}

export async function cancelWorkflowReminder(workflowRequestId: string) {
  const job = await reminderQueue.getJob(`reminder-${workflowRequestId}`)
  if (job) await job.remove()
}

export function startReminderWorker() {
  return new Worker<WorkflowReminderJob>(
    'workflow-reminders',
    async (job) => {
      const { workflowRequestId, deptId } = job.data

      const request = await prisma.workflowRequest.findUnique({
        where: { id: workflowRequestId },
      })

      if (!request || request.status !== 'PENDING') return

      const dept = await prisma.department.findUnique({ where: { id: deptId }, select: { name: true } })
      const adminMemberships = await prisma.userDepartment.findMany({
        where: { deptId, role: 'MANAGER' },
        select: { user: { select: { email: true, name: true } } },
      })
      const admins = adminMemberships.map((m) => m.user)

      logger.warn('workflow_reminder', {
        workflowRequestId,
        deptId,
        adminEmails: admins.map((a) => a.email),
      })

      await sendWorkflowReminderEmail(
        admins,
        dept?.name ?? deptId,
        workflowRequestId,
        request.description,
      )
    },
    { connection: makeBullMQConnection() },
  )
}
