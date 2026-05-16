'use client'

import { useRouter } from 'next/navigation'

interface LogoutButtonProps {
  className?: string
  children?: React.ReactNode
}

export function LogoutButton({ className, children }: LogoutButtonProps) {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className={className ?? 'text-[12px] text-text-secondary hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-red-50'}
    >
      {children ?? 'Sign out'}
    </button>
  )
}
