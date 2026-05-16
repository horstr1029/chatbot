import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/client'
import { UsersPanel } from '@/components/admin/UsersPanel'

export default async function UsersPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({
    where: { clerkId: userId, deletedAt: null },
    select: { deptId: true, role: true },
  })
  if (!user?.deptId) redirect('/chat')

  const users = await prisma.user.findMany({
    where: { deptId: user.deptId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text-primary">Team Members</h1>
        <p className="text-[13px] text-text-secondary mt-1">
          Manage users and roles in your department.
        </p>
      </div>
      <UsersPanel deptId={user.deptId} currentUserRole={user.role} users={users} />
    </div>
  )
}
