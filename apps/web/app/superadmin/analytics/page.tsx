import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { AnalyticsPanel } from '@/components/admin/AnalyticsPanel'

export default async function AnalyticsPage() {
  const session = await getSession()
  if (!session.isLoggedIn || session.role !== 'SUPER_ADMIN') redirect('/login')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text-primary">Usage Analytics</h1>
        <p className="text-[13px] text-text-secondary mt-1">System-wide activity across all departments.</p>
      </div>
      <AnalyticsPanel />
    </div>
  )
}
