import { prisma } from '@/lib/db/client'
import { DepartmentsPanel } from '@/components/admin/DepartmentsPanel'

export default async function DepartmentsPage() {
  const [departments, users] = await Promise.all([
    prisma.department.findMany({
      orderBy: { name: 'asc' },
      include: {
        members: {
          where: { role: 'MANAGER' },
          select: { user: { select: { id: true, name: true, email: true } } },
        },
        _count: {
          select: {
            members: true,
            documentSources: { where: { deletedAt: null } },
          },
        },
      },
    }),
    prisma.user.findMany({
      where: { deletedAt: null, isSuperAdmin: false },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true },
    }),
  ])

  const rows = departments.map((d) => ({
    id: d.id,
    name: d.name,
    llmModel: d.llmModel,
    managers: d.members.map((m) => m.user),
    _count: { users: d._count.members, documentSources: d._count.documentSources },
  }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text-primary">Departments</h1>
        <p className="text-[13px] text-text-secondary mt-1">Create and manage all departments.</p>
      </div>
      <DepartmentsPanel departments={rows} users={users} />
    </div>
  )
}
