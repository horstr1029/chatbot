import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { AuditLogPanel } from '@/components/admin/AuditLogPanel'

export default async function AuditPage() {
  const session = await getSession()
  if (!session.isLoggedIn || !session.isSuperAdmin) redirect('/login')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text-primary">Audit Log</h1>
        <p className="text-[13px] text-text-secondary mt-1">System-wide record of significant actions.</p>
      </div>
      <AuditLogPanel />
    </div>
  )
}
