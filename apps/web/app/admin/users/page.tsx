import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/client'
import { UsersPanel } from '@/components/admin/UsersPanel'

export default async function UsersPage() {
  const session = await getSession()
  if (!session.isLoggedIn) redirect('/login')
  const deptId = session.deptId
  if (!deptId) redirect('/chat')

  const members = await prisma.userDepartment.findMany({
    where: { deptId },
    orderBy: { createdAt: 'asc' },
    select: {
      role: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true, deletedAt: true } },
    },
  })

  const users = members
    .filter((m) => !m.user.deletedAt)
    .map((m) => ({ ...m.user, role: m.role, createdAt: m.createdAt }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text-primary">Team Members</h1>
        <p className="text-[13px] text-text-secondary mt-1">
          Manage users and roles in your department.
        </p>
      </div>
      <UsersPanel deptId={deptId} currentUserRole={session.role} users={users} />
    </div>
  )
}
