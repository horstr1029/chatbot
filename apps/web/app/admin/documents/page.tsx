import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/client'
import { DocumentsPanel } from '@/components/admin/DocumentsPanel'

export default async function DocumentsPage() {
  const session = await getSession()
  if (!session.isLoggedIn) redirect('/login')
  const deptId = session.deptId
  if (!deptId) redirect('/chat')

  const sources = await prisma.documentSource.findMany({
    where: { deptId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text-primary">Document Sources</h1>
        <p className="text-[13px] text-text-secondary mt-1">
          Manage the document sources indexed for your department.
        </p>
      </div>
      <DocumentsPanel deptId={deptId} sources={sources} />
    </div>
  )
}
