'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogoutButton } from '@/components/auth/LogoutButton'
import { AdminHelpPanel } from './AdminHelpPanel'

interface AdminNavProps {
  deptName: string
  role: string
  pendingCount: number
  incomingRequestsCount: number
}

export function AdminNav({ deptName, role, pendingCount, incomingRequestsCount }: AdminNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [helpOpen, setHelpOpen] = useState(false)

  const links = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/workflows', label: 'Workflows', badge: pendingCount > 0 ? pendingCount : null },
    { href: '/admin/cross-dept', label: 'Requests', badge: incomingRequestsCount > 0 ? incomingRequestsCount : null },
    { href: '/admin/documents', label: 'Documents' },
    { href: '/admin/form-templates', label: 'Forms' },
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/announcements', label: 'Announcements' },
    { href: '/admin/quality', label: 'Quality' },
    { href: '/admin/settings', label: 'Settings' },
  ]

  async function handleExitDept() {
    await fetch('/api/auth/switch-dept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deptId: null }),
    })
    router.push('/superadmin')
    router.refresh()
  }

  return (
    <>
    <header className="bg-white border-b border-border">
      <div className="max-w-6xl mx-auto px-4 h-[52px] flex items-center gap-3 overflow-x-auto">
        {role === 'SUPER_ADMIN' ? (
          <button
            onClick={handleExitDept}
            className="text-[14px] font-semibold text-text-primary mr-2 hover:text-brand-600 transition-colors"
          >
            ← Super Admin
          </button>
        ) : (
          <Link href="/chat" className="text-[14px] font-semibold text-text-primary mr-2">
            ← {deptName}
          </Link>
        )}
        <div className="text-[13px] text-text-muted px-2 py-0.5 bg-surface-tertiary rounded font-medium">
          {deptName}
        </div>
        <nav className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto">
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
