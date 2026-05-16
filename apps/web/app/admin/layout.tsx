import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/client'
import { AdminNav } from '@/components/admin/AdminNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session.isLoggedIn) redirect('/login')

  if (!session.deptId || (session.role !== 'DEPT_ADMIN' && session.role !== 'SUPER_ADMIN')) {
    redirect('/chat')
  }

  const pendingCount = await prisma.workflowRequest.count({
    where: { deptId: session.deptId, status: 'PENDING' },
  })

  const deptName = await prisma.department
    .findUnique({ where: { id: session.deptId }, select: { name: true } })
    .then((d) => d?.name ?? '')

  return (
    <div className="min-h-screen bg-surface-secondary">
      <AdminNav deptName={deptName} role={session.role} pendingCount={pendingCount} />
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
