import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db/client'
import { AdminNav } from '@/components/admin/AdminNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({
    where: { clerkId: userId, deletedAt: null },
    select: { role: true, deptId: true, dept: { select: { name: true } } },
  })

  if (!user?.deptId || (user.role !== 'DEPT_ADMIN' && user.role !== 'SUPER_ADMIN')) {
    redirect('/chat')
  }

  const pendingCount = await prisma.workflowRequest.count({
    where: { deptId: user.deptId, status: 'PENDING' },
  })

  return (
    <div className="min-h-screen bg-surface-secondary">
      <AdminNav
        deptName={user.dept?.name ?? ''}
        role={user.role}
        pendingCount={pendingCount}
      />
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
