'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { UserRole } from '@prisma/client'

const ROLE_LABELS: Record<UserRole, string> = {
  MEMBER: 'Member',
  DEPT_ADMIN: 'Dept Admin',
  SUPER_ADMIN: 'Super Admin',
}

interface UserRow {
  id: string
  name: string | null
  email: string
  role: UserRole
  createdAt: Date
}

interface UsersPanelProps {
  deptId: string
  currentUserRole: UserRole
  users: UserRow[]
}

export function UsersPanel({ deptId, currentUserRole, users }: UsersPanelProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function handleRoleChange(userId: string, role: UserRole) {
    setLoading(userId)
    await fetch(`/api/departments/${deptId}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    })
    setLoading(null)
    router.refresh()
  }

  async function handleRemove(userId: string) {
    if (!confirm('Remove this user from the department?')) return
    setLoading(`remove-${userId}`)
    await fetch(`/api/departments/${deptId}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, remove: true }),
    })
    setLoading(null)
    router.refresh()
  }

  const canEditRole = currentUserRole === 'SUPER_ADMIN' || currentUserRole === 'DEPT_ADMIN'

  return (
    <div className="bg-white border border-border rounded-lg overflow-hidden">
      {users.length === 0 ? (
        <div className="p-8 text-center text-[13px] text-text-muted">No users in this department.</div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-surface-secondary">
              {['Name', 'Email', 'Role', 'Joined', ''].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-[12px] font-medium text-text-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-surface-secondary transition-colors">
                <td className="px-4 py-3 text-[13px] text-text-primary font-medium">
                  {u.name ?? '—'}
                </td>
                <td className="px-4 py-3 text-[13px] text-text-secondary">{u.email}</td>
                <td className="px-4 py-3">
                  {canEditRole ? (
                    <select
                      value={u.role}
                      disabled={loading === u.id}
                      onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                      className="rounded border border-border px-2 py-1 text-[12px] text-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-600 disabled:opacity-50"
                    >
                      <option value="MEMBER">Member</option>
                      <option value="DEPT_ADMIN">Dept Admin</option>
                      {currentUserRole === 'SUPER_ADMIN' && (
                        <option value="SUPER_ADMIN">Super Admin</option>
                      )}
                    </select>
                  ) : (
                    <span className="text-[12px] text-text-secondary">{ROLE_LABELS[u.role]}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-[12px] text-text-muted">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    disabled={loading === `remove-${u.id}`}
                    onClick={() => handleRemove(u.id)}
                    className="text-[12px] text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors disabled:opacity-50"
                  >
                    {loading === `remove-${u.id}` ? '…' : 'Remove'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
