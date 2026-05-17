import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/client'
import { CrossDeptPanel } from '@/components/admin/CrossDeptPanel'

export default async function CrossDeptPage() {
  const session = await getSession()
  if (!session.isLoggedIn) redirect('/login')
  const deptId = session.deptId
  if (!deptId) redirect('/chat')

  if (session.role !== 'DEPT_ADMIN' && session.role !== 'SUPER_ADMIN') {
    redirect('/chat')
  }

  const [requests, allDepts] = await Promise.all([
    prisma.crossDeptRequest.findMany({
      where: {
        OR: [{ fromDeptId: deptId }, { toDeptId: deptId }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        fromDept: { select: { name: true } },
        toDept: { select: { name: true } },
        requestedBy: { select: { name: true, email: true } },
      },
    }),
    prisma.department.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ])

  return (
    <CrossDeptPanel
      requests={requests.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        resolvedAt: r.resolvedAt?.toISOString() ?? null,
        status: r.status as 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CANCELLED',
      }))}
      deptId={deptId}
      allDepts={allDepts}
    />
  )
}
