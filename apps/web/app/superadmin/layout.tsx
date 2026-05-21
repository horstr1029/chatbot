import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { SuperAdminNav } from '@/components/admin/SuperAdminNav'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session.isLoggedIn) redirect('/login')
  if (!session.isSuperAdmin && session.role !== 'SUPER_ADMIN') redirect('/chat')

  return (
    <div className="min-h-screen bg-surface-secondary">
      <SuperAdminNav />
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
