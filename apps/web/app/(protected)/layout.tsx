import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session.isLoggedIn) redirect('/login')
  if (!session.deptId) {
    if (session.role === 'SUPER_ADMIN') redirect('/superadmin')
    redirect('/pending')
  }
  return <>{children}</>
}
