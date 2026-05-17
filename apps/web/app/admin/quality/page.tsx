import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/client'
import { QualityPanel } from '@/components/admin/QualityPanel'

export default async function QualityPage() {
  const session = await getSession()
  if (!session.isLoggedIn) redirect('/login')
  const deptId = session.deptId
  if (!deptId) redirect('/chat')

  const dept = await prisma.department.findUnique({
    where: { id: deptId },
    select: { name: true },
  })
  if (!dept) redirect('/chat')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text-primary">Answer Quality</h1>
        <p className="text-[13px] text-text-secondary mt-1">
          Feedback ratings and low-scoring queries for {dept.name}.
        </p>
      </div>
      <QualityPanel />
    </div>
  )
}
