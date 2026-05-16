import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/client'
import { WorkflowsTable } from '@/components/admin/WorkflowsTable'

export default async function WorkflowsPage() {
  const session = await getSession()
  if (!session.isLoggedIn) redirect('/login')
  const deptId = session.deptId
  if (!deptId) redirect('/chat')

  const requests = await prisma.workflowRequest.findMany({
    where: { deptId },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    include: {
      requestedBy: { select: { name: true, email: true } },
      approvedBy: { select: { name: true, email: true } },
    },
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text-primary">Workflow Requests</h1>
        <p className="text-[13px] text-text-secondary mt-1">
          Review and approve workflow automation requests from your team.
        </p>
      </div>
      <WorkflowsTable requests={requests} />
    </div>
  )
}
