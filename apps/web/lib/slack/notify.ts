export async function sendSlackNotification(webhookUrl: string, text: string) {
  try {
    const url = new URL(webhookUrl)
    if (!url.hostname.endsWith('.slack.com')) return
    await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
  } catch {
    // Slack notification failure is non-fatal
  }
}
