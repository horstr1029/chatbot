import { prisma } from '@/lib/db/client'
import { getSession } from '@/lib/auth/session'
import { SuperAdminsPanel } from '@/components/admin/SuperAdminsPanel'

export default async function SuperAdminsPage() {
  const session = await getSession()

  const admins = await prisma.user.findMany({
    where: { isSuperAdmin: true, deletedAt: null },
    select: { id: true, name: true, email: true, createdAt: true },
    orderBy: { name: 'asc' },
  })

  const data = admins.map((a) => ({ ...a, createdAt: a.createdAt.toISOString(), isSelf: a.id === session.userId }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text-primary">Super Admins</h1>
        <p className="text-[13px] text-text-secondary mt-1">
          Manage which users have super admin access. Always keep at least two super admins active.
        </p>
      </div>
      <SuperAdminsPanel admins={data} />
    </div>
  )
}
