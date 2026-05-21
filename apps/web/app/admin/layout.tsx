import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/client'
import { AdminNav } from '@/components/admin/AdminNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session.isLoggedIn) redirect('/login')

  if (!session.deptId || (session.role !== 'MANAGER' && session.role !== 'SUPER_ADMIN')) {
    redirect('/chat')
  }

  const [pendingCount, incomingRequestsCount, dept] = await Promise.all([
    prisma.workflowRequest.count({
      where: { deptId: session.deptId, status: 'PENDING' },
    }),
    prisma.crossDeptRequest.count({
      where: { toDeptId: session.deptId, status: { in: ['OPEN', 'IN_PROGRESS'] } },
    }),
    prisma.department.findUnique({ where: { id: session.deptId }, select: { name: true } }),
  ])

  const deptName = dept?.name ?? ''

  return (
    <div className="min-h-screen bg-surface-secondary">
      <AdminNav
        deptName={deptName}
        role={session.role}
        pendingCount={pendingCount}
        incomingRequestsCount={incomingRequestsCount}
      />
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
