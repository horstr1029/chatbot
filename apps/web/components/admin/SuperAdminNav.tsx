'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogoutButton } from '@/components/auth/LogoutButton'

const links = [
  { href: '/superadmin', label: 'Overview' },
  { href: '/superadmin/departments', label: 'Departments' },
  { href: '/superadmin/managers', label: 'Managers' },
  { href: '/superadmin/admins', label: 'Admins' },
  { href: '/superadmin/analytics', label: 'Analytics' },
  { href: '/superadmin/settings', label: 'Settings' },
]

export function SuperAdminNav() {
  const pathname = usePathname()

  return (
    <header className="bg-white border-b border-border">
      <div className="max-w-6xl mx-auto px-6 h-[52px] flex items-center gap-6">
        <span className="text-[14px] font-semibold text-text-primary mr-2">Super Admin</span>
        <nav className="flex items-center gap-1 flex-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-md text-[13px] transition-colors ${
                pathname === l.href
                  ? 'bg-brand-50 text-brand-700 font-medium'
                  : 'text-text-secondary hover:bg-surface-tertiary'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <LogoutButton />
      </div>
    </header>
  )
}
