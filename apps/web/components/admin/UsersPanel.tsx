'use client'

import { useState, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import type { DeptRole } from '@prisma/client'
import type { UserRole } from '@/lib/auth/types'

const ROLE_LABELS: Record<DeptRole, string> = {
  MEMBER: 'Member',
  DEPT_ADMIN: 'Dept Admin',
}

interface LeaveBalance {
  balance: number
  yearlyAllocation: number
  monthlyAccrual: number
}

interface UserRow {
  id: string
  name: string | null
  email: string
  role: DeptRole
  createdAt: string
  leaveBalance: LeaveBalance | null
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
  const [expandedLeave, setExpandedLeave] = useState<string | null>(null)
  const [leaveEdits, setLeaveEdits] = useState<Record<string, { yearlyAllocation: string; monthlyAccrual: string; balance: string }>>({})
  const [leaveSaving, setLeaveSaving] = useState<string | null>(null)

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

  function toggleLeave(userId: string, balance: LeaveBalance | null) {
    if (expandedLeave === userId) {
      setExpandedLeave(null)
      return
    }
    setExpandedLeave(userId)
    if (!leaveEdits[userId]) {
      setLeaveEdits((prev) => ({
        ...prev,
        [userId]: {
          yearlyAllocation: String(balance?.yearlyAllocation ?? 15),
          monthlyAccrual: String(balance?.monthlyAccrual ?? 1.25),
          balance: String(balance?.balance ?? 0),
        },
      }))
    }
  }

  async function saveLeave(userId: string) {
    const edit = leaveEdits[userId]
    if (!edit) return
    setLeaveSaving(userId)
    await fetch(`/api/admin/leave-balance/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        yearlyAllocation: Number(edit.yearlyAllocation),
        monthlyAccrual: Number(edit.monthlyAccrual),
        balance: Number(edit.balance),
      }),
    })
    setLeaveSaving(null)
    router.refresh()
  }

  async function resetLeave(userId: string) {
    if (!confirm('Reset this user\'s leave balance to 0?')) return
    setLeaveSaving(`reset-${userId}`)
    await fetch(`/api/admin/leave-balance/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resetBalance: true }),
    })
    setLeaveSaving(null)
    router.refresh()
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
                {['Name', 'Email', 'Role', 'Leave', 'Joined', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[12px] font-medium text-text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <Fragment key={u.id}>
                  <tr className="hover:bg-surface-secondary transition-colors">
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
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleLeave(u.id, u.leaveBalance)}
                        className="inline-flex items-center gap-1.5 text-[12px] text-text-secondary hover:text-brand-600 transition-colors"
                      >
                        <span
                          className={`font-medium ${u.leaveBalance && u.leaveBalance.balance < 0 ? 'text-red-600' : 'text-green-600'}`}
                        >
                          {u.leaveBalance ? `${u.leaveBalance.balance.toFixed(1)} d` : '—'}
                        </span>
                        <svg
                          className={`w-3 h-3 transition-transform ${expandedLeave === u.id ? 'rotate-180' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
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
                  {expandedLeave === u.id && (
                    <tr key={`${u.id}-leave`} className="bg-surface-secondary">
                      <td colSpan={6} className="px-4 py-4">
                        <div className="flex items-end gap-6">
                          <div>
                            <p className="text-[11px] font-medium text-text-muted mb-1.5">Yearly allocation (days)</p>
                            <input
                              type="number"
                              min="0"
                              value={leaveEdits[u.id]?.yearlyAllocation ?? '15'}
                              onChange={(e) =>
                                setLeaveEdits((prev) => ({
                                  ...prev,
                                  [u.id]: { ...prev[u.id], yearlyAllocation: e.target.value },
                                }))
                              }
                              className="w-24 rounded-md border border-border px-2 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-600"
                            />
                          </div>
                          <div>
                            <p className="text-[11px] font-medium text-text-muted mb-1.5">Monthly accrual (days)</p>
                            <input
                              type="number"
                              min="0"
                              step="0.25"
                              value={leaveEdits[u.id]?.monthlyAccrual ?? '1.25'}
                              onChange={(e) =>
                                setLeaveEdits((prev) => ({
                                  ...prev,
                                  [u.id]: { ...prev[u.id], monthlyAccrual: e.target.value },
                                }))
                              }
                              className="w-24 rounded-md border border-border px-2 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-600"
                            />
                          </div>
                          <div>
                            <p className="text-[11px] font-medium text-text-muted mb-1.5">Current balance (days)</p>
                            <input
                              type="number"
                              step="0.5"
                              value={leaveEdits[u.id]?.balance ?? String(u.leaveBalance?.balance ?? 0)}
                              onChange={(e) =>
                                setLeaveEdits((prev) => ({
                                  ...prev,
                                  [u.id]: { ...prev[u.id], balance: e.target.value },
                                }))
                              }
                              className="w-24 rounded-md border border-border px-2 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-600"
                            />
                          </div>
                          <div className="flex gap-2 ml-auto">
                            <button
                              onClick={() => saveLeave(u.id)}
                              disabled={leaveSaving === u.id}
                              className="px-3 py-1.5 rounded-md bg-gray-900 text-white text-[12px] font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
                            >
                              {leaveSaving === u.id ? 'Saving…' : 'Save'}
                            </button>
                            <button
                              onClick={() => resetLeave(u.id)}
                              disabled={leaveSaving === `reset-${u.id}`}
                              className="px-3 py-1.5 rounded-md border border-border text-[12px] text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                            >
                              {leaveSaving === `reset-${u.id}` ? '…' : 'Reset balance'}
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
