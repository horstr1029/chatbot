'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogoutButton } from '@/components/auth/LogoutButton'
import { AdminHelpPanel } from './AdminHelpPanel'

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
  const [helpOpen, setHelpOpen] = useState(false)

  return (
    <>
    <header className="bg-white border-b border-border">
      <div className="max-w-6xl mx-auto px-4 h-[52px] flex items-center gap-3 overflow-x-auto">
        <span className="text-[14px] font-semibold text-text-primary mr-2">Super Admin</span>
        <nav className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto">
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
        <Link
          href="/chat"
          className="px-3 py-1.5 rounded-md text-[13px] text-text-secondary hover:bg-surface-tertiary transition-colors"
        >
          ← Chat
        </Link>
        <button
          onClick={() => setHelpOpen(true)}
          title="Admin guide"
          className="w-7 h-7 flex items-center justify-center rounded-md border border-border text-text-muted hover:bg-surface-secondary hover:text-text-secondary transition-colors text-[13px] font-semibold"
        >
          ?
        </button>
        <LogoutButton />
      </div>
    </header>
    <AdminHelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  )
}
