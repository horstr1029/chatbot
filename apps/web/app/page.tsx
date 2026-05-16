import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'

export default async function HomePage() {
  const session = await getSession()
  if (session.isLoggedIn) {
    if (!session.deptId && session.role === 'SUPER_ADMIN') redirect('/superadmin')
    redirect('/chat')
  }
  redirect('/login')
}
