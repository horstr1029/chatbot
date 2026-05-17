export async function sendSlackNotification(webhookUrl: string, text: string) {
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
  } catch {
    // Slack notification failure is non-fatal
  }
}
