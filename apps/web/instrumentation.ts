export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startIngestionWorker } = await import('@/lib/queue/ingestion.worker')
    const { startReminderWorker } = await import('@/lib/queue/reminder.queue')
    const { startDigestWorker } = await import('@/lib/queue/digest.queue')
    const { startExpiryWorker } = await import('@/lib/queue/expiry.queue')
    const { startReminderUserWorker } = await import('@/lib/queue/reminder-user.queue')
    startIngestionWorker()
    startReminderWorker()
    startDigestWorker()
    startExpiryWorker()
    startReminderUserWorker()
  }
}
