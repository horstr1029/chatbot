import webpush from 'web-push'

function setup() {
  const pub = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT ?? 'mailto:admin@company.com'
  if (pub && priv) webpush.setVapidDetails(subject, pub, priv)
}
setup()

export function vapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY ?? null
}

export async function sendPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url?: string },
) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
    )
  } catch (err: unknown) {
    if ((err as { statusCode?: number }).statusCode === 410) {
      const { prisma } = await import('@/lib/db/client')
      await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } })
    }
  }
}

export async function notifyUser(userId: string, payload: { title: string; body: string; url?: string }) {
  const { prisma } = await import('@/lib/db/client')
  const subs = await prisma.pushSubscription.findMany({ where: { userId } })
  await Promise.all(subs.map((s) => sendPush(s, payload)))
}
