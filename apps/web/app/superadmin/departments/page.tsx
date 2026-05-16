import { prisma } from '@/lib/db/client'
import { DepartmentsPanel } from '@/components/admin/DepartmentsPanel'

export default async function DepartmentsPage() {
  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          members: true,
          documentSources: { where: { deletedAt: null } },
        },
      },
    },
  })

  const rows = departments.map((d) => ({
    id: d.id,
    name: d.name,
    llmModel: d.llmModel,
    _count: { users: d._count.members, documentSources: d._count.documentSources },
  }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text-primary">Departments</h1>
        <p className="text-[13px] text-text-secondary mt-1">Create and manage all departments.</p>
      </div>
      <DepartmentsPanel departments={rows} />
    </div>
  )
}
