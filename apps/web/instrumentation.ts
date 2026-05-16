export async function register() {
  // Only run in Node.js runtime (not edge), and only once per process
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startIngestionWorker } = await import('@/lib/queue/ingestion.worker')
    const { startReminderWorker } = await import('@/lib/queue/reminder.queue')
    startIngestionWorker()
    startReminderWorker()
  }
}
