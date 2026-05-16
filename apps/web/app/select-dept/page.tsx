import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/client'
import { SelectDeptClient } from './SelectDeptClient'

export default async function SelectDeptPage() {
  const session = await getSession()
  if (!session.isLoggedIn) redirect('/login')
  if (session.deptId) redirect('/chat')

  const depts = await prisma.userDepartment.findMany({
    where: { userId: session.userId },
    select: { deptId: true, role: true, dept: { select: { name: true } } },
    orderBy: { dept: { name: 'asc' } },
  })

  if (depts.length === 0) redirect('/pending')
  if (depts.length === 1) {
    // shouldn't happen (login auto-selects single dept) but handle gracefully
    redirect('/chat')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-secondary">
      <div className="bg-white border border-border rounded-lg p-8 w-full max-w-sm">
        <div className="mb-6">
          <p className="text-[14px] font-semibold text-text-primary">Company Chatbot</p>
          <h1 className="text-xl font-semibold text-text-primary mt-1">Select department</h1>
          <p className="text-[13px] text-text-muted mt-1">
            You belong to multiple departments. Choose one to continue.
          </p>
        </div>
        <SelectDeptClient depts={depts.map((d) => ({ id: d.deptId, name: d.dept.name, role: d.role }))} />
      </div>
    </div>
  )
}
