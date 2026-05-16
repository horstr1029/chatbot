import { prisma } from '@/lib/db/client'
import Link from 'next/link'

export default async function SuperAdminPage() {
  const [deptCount, userCount, sourceCount, pendingCount] = await Promise.all([
    prisma.department.count(),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.documentSource.count({ where: { deletedAt: null } }),
    prisma.workflowRequest.count({ where: { status: 'PENDING' } }),
  ])

  const stats = [
    { label: 'Departments', value: deptCount, href: '/superadmin/departments' },
    { label: 'Total users', value: userCount, href: null },
    { label: 'Document sources', value: sourceCount, href: null },
    { label: 'Pending workflows', value: pendingCount, href: null },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text-primary">Super Admin</h1>
        <p className="text-[13px] text-text-secondary mt-1">System-wide overview.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white border border-border rounded-lg p-5">
            <p className="text-[12px] font-medium text-text-muted uppercase tracking-wide">{s.label}</p>
            <p className="text-3xl font-semibold text-text-primary mt-1">{s.value}</p>
            {s.href && (
              <Link href={s.href} className="text-[12px] text-brand-600 hover:underline mt-2 inline-block">
                Manage →
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
