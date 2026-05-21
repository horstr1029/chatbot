import { prisma } from '@/lib/db/client'
import { ManagersPanel } from '@/components/admin/ManagersPanel'

export default async function ManagersPage() {
  const [managers, departments] = await Promise.all([
    prisma.user.findMany({
      where: {
        deletedAt: null,
        departments: { some: { role: 'MANAGER' } },
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        departments: {
          where: { role: 'MANAGER' },
          select: { deptId: true, dept: { select: { name: true } } },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.department.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text-primary">Managers</h1>
        <p className="text-[13px] text-text-secondary mt-1">
          Create manager accounts and assign them to one or more departments. Managers have full
          access to the chat and receive all form submissions for their departments.
        </p>
      </div>
      <ManagersPanel managers={managers} departments={departments} />
    </div>
  )
}
