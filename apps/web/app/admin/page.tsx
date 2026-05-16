import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/client'

export default async function AdminDashboardPage() {
  const session = await getSession()
  if (!session.isLoggedIn) redirect('/login')
  const deptId = session.deptId
  if (!deptId) redirect('/chat')

  const [userCount, docCount, pendingCount, totalWorkflows] = await Promise.all([
    prisma.user.count({ where: { deptId: deptId, deletedAt: null } }),
    prisma.documentSource.count({ where: { deptId: deptId, deletedAt: null } }),
    prisma.workflowRequest.count({ where: { deptId: deptId, status: 'PENDING' } }),
    prisma.workflowRequest.count({ where: { deptId: deptId } }),
  ])

  const stats = [
    { label: 'Team members', value: userCount },
    { label: 'Document sources', value: docCount },
    { label: 'Pending workflows', value: pendingCount, highlight: pendingCount > 0 },
    { label: 'Total workflows', value: totalWorkflows },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text-primary">Admin Dashboard</h1>
        <p className="text-[13px] text-text-secondary mt-1">Overview of your department.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white border border-border rounded-lg p-5">
            <p className="text-[12px] text-text-muted mb-1">{s.label}</p>
            <p className={`text-2xl font-semibold ${s.highlight ? 'text-amber-600' : 'text-text-primary'}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
