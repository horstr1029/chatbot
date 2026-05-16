import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/client'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({
    where: { clerkId: userId, deletedAt: null },
    select: { deptId: true },
  })

  if (!user || !user.deptId) redirect('/pending')

  return <>{children}</>
}
