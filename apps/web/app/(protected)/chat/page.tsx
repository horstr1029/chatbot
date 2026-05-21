import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/client'
import { getDept } from '@/lib/dept/getDept'
import { ChatInterface } from '@/components/chat/ChatInterface'

export default async function ChatPage() {
  const session = await getSession()
  if (!session.isLoggedIn) redirect('/login')
  if (!session.deptId) redirect('/pending')

  const [dept, sessions, memberships] = await Promise.all([
    getDept(session.deptId),
    prisma.chatSession.findMany({
      where: { userId: session.userId },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      select: { id: true, title: true, updatedAt: true },
    }),
    prisma.userDepartment.findMany({
      where: { userId: session.userId },
      select: { deptId: true, dept: { select: { name: true } } },
      orderBy: { dept: { name: 'asc' } },
    }),
  ])

  const displayName = session.name ?? session.email
  const initials = displayName
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const availableDepts = memberships.map((m) => ({ id: m.deptId, name: m.dept.name }))

  return (
    <ChatInterface
      deptName={dept.name}
      deptId={dept.id}
      userName={displayName}
      userRole={session.role}
      isSuperAdmin={session.isSuperAdmin ?? false}
      initials={initials}
      sessions={sessions}
      availableDepts={availableDepts}
    />
  )
}
