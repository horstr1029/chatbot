import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db/client'
import { SuperAdminNav } from '@/components/admin/SuperAdminNav'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({
    where: { clerkId: userId, deletedAt: null },
    select: { role: true },
  })

  if (user?.role !== 'SUPER_ADMIN') redirect('/chat')

  return (
    <div className="min-h-screen bg-surface-secondary">
      <SuperAdminNav />
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
