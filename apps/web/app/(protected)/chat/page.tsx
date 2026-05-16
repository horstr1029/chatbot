import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/client'
import { getDept } from '@/lib/dept/getDept'
import { ChatInterface } from '@/components/chat/ChatInterface'

export default async function ChatPage() {
  const session = await getSession()
  if (!session.isLoggedIn) redirect('/login')
  if (!session.deptId) redirect('/pending')

  const [dept, sessions] = await Promise.all([
    getDept(session.deptId),
    prisma.chatSession.findMany({
      where: { userId: session.userId },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      select: { id: true, title: true, updatedAt: true },
    }),
  ])

  const displayName = session.name ?? session.email
  const initials = displayName
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <ChatInterface
      deptName={dept.name}
      deptId={dept.id}
      userName={displayName}
      userRole={session.role}
      initials={initials}
      sessions={sessions}
    />
  )
}
