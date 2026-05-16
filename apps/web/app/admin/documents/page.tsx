import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/client'
import { DocumentsPanel } from '@/components/admin/DocumentsPanel'

export default async function DocumentsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({
    where: { clerkId: userId, deletedAt: null },
    select: { deptId: true },
  })
  if (!user?.deptId) redirect('/chat')

  const sources = await prisma.documentSource.findMany({
    where: { deptId: user.deptId, deletedAt: null },
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
      <DocumentsPanel deptId={user.deptId} sources={sources} />
    </div>
  )
}
