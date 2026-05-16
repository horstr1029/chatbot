'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogoutButton } from '@/components/auth/LogoutButton'

interface AdminNavProps {
  deptName: string
  role: string
  pendingCount: number
}

export function AdminNav({ deptName, role, pendingCount }: AdminNavProps) {
  const pathname = usePathname()

  const links = [
    { href: '/admin', label: 'Dashboard' },
    {
      href: '/admin/workflows',
      label: 'Workflows',
      badge: pendingCount > 0 ? pendingCount : null,
    },
    { href: '/admin/documents', label: 'Documents' },
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/settings', label: 'Settings' },
    ...(role === 'SUPER_ADMIN' ? [{ href: '/superadmin', label: 'Super Admin' }] : []),
  ]

  return (
    <header className="bg-white border-b border-border">
      <div className="max-w-6xl mx-auto px-6 h-[52px] flex items-center gap-6">
        <Link href="/chat" className="text-[14px] font-semibold text-text-primary mr-2">
          ← {deptName}
        </Link>
        <nav className="flex items-center gap-1 flex-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`relative px-3 py-1.5 rounded-md text-[13px] transition-colors flex items-center gap-1.5 ${
                pathname === l.href
                  ? 'bg-brand-50 text-brand-700 font-medium'
                  : 'text-text-secondary hover:bg-surface-tertiary'
              }`}
            >
              {l.label}
              {l.badge != null && (
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-semibold">
                  {l.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <LogoutButton />
      </div>
    </header>
  )
}
