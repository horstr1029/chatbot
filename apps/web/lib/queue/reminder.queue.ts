import { Queue, Worker } from 'bullmq'
import { redis } from '@/lib/redis/client'
import { prisma } from '@/lib/db/client'

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

      const admins = await prisma.user.findMany({
        where: { deptId, role: { in: ['DEPT_ADMIN', 'SUPER_ADMIN'] }, deletedAt: null },
        select: { email: true, name: true },
      })

      process.stdout.write(
        JSON.stringify({
          ts: new Date().toISOString(),
          level: 'warn',
          event: 'workflow_reminder',
          workflowRequestId,
          deptId,
          adminEmails: admins.map((a) => a.email),
          message: `Workflow request ${workflowRequestId} has been pending for 48h`,
        }) + '\n',
      )
    },
    { connection: redis },
  )
}
