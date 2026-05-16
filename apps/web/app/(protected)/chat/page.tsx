import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/client'
import { getDept } from '@/lib/dept/getDept'
import { ChatInterface } from '@/components/chat/ChatInterface'

export default async function ChatPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({
    where: { clerkId: userId, deletedAt: null },
    select: { id: true, name: true, email: true, role: true, deptId: true },
  })

  if (!user?.deptId) redirect('/pending')

  const [dept, sessions] = await Promise.all([
    getDept(user.deptId),
    prisma.chatSession.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      select: { id: true, title: true, updatedAt: true },
    }),
  ])

  const displayName = user.name ?? user.email
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
      userRole={user.role}
      initials={initials}
      sessions={sessions}
    />
  )
}
