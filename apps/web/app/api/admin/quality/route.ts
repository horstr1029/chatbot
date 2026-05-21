import { deptMiddleware, requireRole } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/client'
import { apiResponse } from '@/lib/api/response'

export async function GET() {
  let ctx
  try {
    ctx = await deptMiddleware()
  } catch {
    return apiResponse.error('UNAUTHORIZED', 'Unauthorized', 401)
  }
  requireRole(ctx.role, 'MANAGER')

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [allFeedback, recentDown] = await Promise.all([
    prisma.messageFeedback.findMany({
      where: { deptId: ctx.dept_id, createdAt: { gte: since } },
      select: { rating: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.messageFeedback.findMany({
      where: { deptId: ctx.dept_id, rating: -1 },
      select: { messageId: true, sessionId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ])

  const totalUp = allFeedback.filter((f) => f.rating === 1).length
  const totalDown = allFeedback.filter((f) => f.rating === -1).length

  // Build weekly breakdown (last 4 weeks)
  const buckets: Record<string, { up: number; down: number }> = {}
  for (const f of allFeedback) {
    const d = f.createdAt
    const monday = new Date(d)
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    const key = monday.toISOString().slice(0, 10)
    if (!buckets[key]) buckets[key] = { up: 0, down: 0 }
    if (f.rating === 1) buckets[key].up++
    else buckets[key].down++
  }
  const weeklyBreakdown = Object.entries(buckets)
    .map(([date, counts]) => ({ date, ...counts }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Resolve message content from sessions
  const sessionIds = Array.from(new Set(recentDown.map((f) => f.sessionId)))
  const sessions = await prisma.chatSession.findMany({
    where: { id: { in: sessionIds }, deptId: ctx.dept_id },
    select: { id: true, messages: true },
  })
  const sessionMap = Object.fromEntries(sessions.map((s) => [s.id, s.messages]))

  const lowScoringQueries = recentDown.map((f) => {
    const msgs = (sessionMap[f.sessionId] ?? []) as { id?: string; role: string; content: string }[]
    const msg = msgs.find((m) => m.id === f.messageId)
    const idx = msg ? msgs.indexOf(msg) : -1
    const question = idx > 0 ? msgs[idx - 1]?.content?.slice(0, 200) : null
    return {
      messageId: f.messageId,
      sessionId: f.sessionId,
      createdAt: f.createdAt,
      answer: msg?.content?.slice(0, 200) ?? null,
      question,
    }
  })

  return apiResponse.success({ totalUp, totalDown, weeklyBreakdown, lowScoringQueries })
}
