'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DeptRole } from '@prisma/client'
import type { UserRole } from '@/lib/auth/types'

const ROLE_LABELS: Record<DeptRole, string> = {
  MEMBER: 'Member',
  DEPT_ADMIN: 'Dept Admin',
}

interface UserRow {
  id: string
  name: string | null
  email: string
  role: DeptRole
  createdAt: Date
}

interface UsersPanelProps {
  deptId: string
  currentUserRole: UserRole
  users: UserRow[]
}

const defaultForm = { name: '', email: '', role: 'MEMBER' as DeptRole }

export function UsersPanel({ deptId, currentUserRole, users }: UsersPanelProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const canEdit = currentUserRole === 'SUPER_ADMIN' || currentUserRole === 'DEPT_ADMIN'

  async function handleRoleChange(userId: string, role: DeptRole) {
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError('')
    setCreating(true)
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, deptId }),
    })
    setCreating(false)
    if (res.ok) {
      setForm(defaultForm)
      router.refresh()
    } else {
      const body = await res.json()
      setCreateError(body.error ?? 'Failed to create user')
    }
  }

  return (
    <div className="space-y-5">
      {canEdit && (
        <div className="bg-white border border-border rounded-lg p-5">
          <p className="text-[13px] font-semibold text-text-primary mb-4">Add User</p>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[13px] font-medium text-text-primary mb-1 block">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-md border border-border px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-brand-600"
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <label className="text-[13px] font-medium text-text-primary mb-1 block">Email</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-md border border-border px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-brand-600"
                placeholder="jane@company.com"
              />
            </div>
            <div>
              <label className="text-[13px] font-medium text-text-primary mb-1 block">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as DeptRole }))}
                className="w-full rounded-md border border-border px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-brand-600"
              >
                <option value="MEMBER">Member</option>
                <option value="DEPT_ADMIN">Dept Admin</option>
              </select>
            </div>
            <div className="col-span-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 rounded-md bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {creating ? 'Creating…' : 'Create user'}
              </button>
              {createError && <p className="text-[12px] text-red-600">{createError}</p>}
            </div>
          </form>
        </div>
      )}

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
                  <td className="px-4 py-3 text-[13px] text-text-primary font-medium">{u.name ?? '—'}</td>
                  <td className="px-4 py-3 text-[13px] text-text-secondary">{u.email}</td>
                  <td className="px-4 py-3">
                    {canEdit ? (
                      <select
                        value={u.role}
                        disabled={loading === u.id}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as DeptRole)}
                        className="rounded border border-border px-2 py-1 text-[12px] text-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-600 disabled:opacity-50"
                      >
                        <option value="MEMBER">Member</option>
                        <option value="DEPT_ADMIN">Dept Admin</option>
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
    </div>
  )
}
