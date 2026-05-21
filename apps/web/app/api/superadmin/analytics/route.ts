export const dynamic = 'force-dynamic'

import { deptMiddleware } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/client'
import { apiResponse } from '@/lib/api/response'

export async function GET() {
  let ctx
  try { ctx = await deptMiddleware() } catch { return apiResponse.error('UNAUTHORIZED', 'Unauthorized', 401) }
  if (ctx.role !== 'SUPER_ADMIN') return apiResponse.error('FORBIDDEN', 'Forbidden', 403)

  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [allSessions, recentSessions, depts, userCount] = await Promise.all([
    prisma.chatSession.findMany({
      where: { updatedAt: { gte: since30 } },
      select: { userId: true, deptId: true, createdAt: true, messages: true },
      take: 2000,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.chatSession.findMany({
      where: { updatedAt: { gte: since7 } },
      select: { userId: true, createdAt: true },
      take: 500,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.department.findMany({ select: { id: true, name: true } }),
    prisma.user.count({ where: { deletedAt: null } }),
  ])

  // Sessions per day (last 30 days)
  const byDay: Record<string, number> = {}
  for (const s of allSessions) {
    const day = s.createdAt.toISOString().slice(0, 10)
    byDay[day] = (byDay[day] ?? 0) + 1
  }
  const sessionsPerDay = Object.entries(byDay)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Sessions per department
  const deptMap = Object.fromEntries(depts.map((d) => [d.id, d.name]))
  const byDept: Record<string, number> = {}
  for (const s of allSessions) {
    const name = deptMap[s.deptId] ?? s.deptId
    byDept[name] = (byDept[name] ?? 0) + 1
  }
  const sessionsPerDept = Object.entries(byDept)
    .map(([dept, count]) => ({ dept, count }))
    .sort((a, b) => b.count - a.count)

  // Peak hours (last 30 days) — group by hour of day UTC
  const byHour: Record<number, number> = {}
  for (const s of allSessions) {
    const h = s.createdAt.getUTCHours()
    byHour[h] = (byHour[h] ?? 0) + 1
  }
  const peakHours = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: byHour[h] ?? 0 }))

  // Most active users (last 7 days)
  const byUser: Record<string, number> = {}
  for (const s of recentSessions) {
    byUser[s.userId] = (byUser[s.userId] ?? 0) + 1
  }
  const topUserIds = Object.entries(byUser)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => id)

  const users = await prisma.user.findMany({
    where: { id: { in: topUserIds } },
    select: { id: true, name: true, email: true },
  })
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name ?? u.email]))
  const activeUsers = topUserIds.map((id) => ({ name: userMap[id] ?? id, sessions: byUser[id] }))

  // Top questions (last 7 days)
  const questions: string[] = []
  for (const s of recentSessions.slice(0, 100)) {
    const full = await prisma.chatSession.findUnique({
      where: { id: (s as unknown as { id: string }).id },
      select: { messages: true },
    })
    const msgs = (full?.messages ?? []) as { role: string; content: string }[]
    const first = msgs.find((m) => m.role === 'user')
    if (first) questions.push(first.content.slice(0, 120))
  }

  return apiResponse.success({
    totalSessions30d: allSessions.length,
    totalUsers: userCount,
    sessionsPerDay,
    sessionsPerDept,
    peakHours,
    activeUsers,
    topQuestions: questions.slice(0, 15),
  })
}
