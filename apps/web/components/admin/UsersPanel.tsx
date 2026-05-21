'use client'

import { useState, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import type { DeptRole } from '@prisma/client'
import type { UserRole } from '@/lib/auth/types'

const ROLE_LABELS: Record<DeptRole, string> = {
  MEMBER: 'Member',
  DEPT_ADMIN: 'Dept Admin',
}

export interface LeaveTypeEntry {
  type: string
  balance: number
  yearlyAllocation: number
}

interface LeaveBalance {
  balance: number
  yearlyAllocation: number
  monthlyAccrual: number
  leaveTypes: LeaveTypeEntry[]
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

interface LeaveEdit {
  yearlyAllocation: string
  monthlyAccrual: string
  balance: string
  leaveTypes: LeaveTypeEntry[]
  newTypeName: string
  newTypeAllocation: string
  newTypeBalance: string
}

const defaultForm = { name: '', email: '', role: 'MEMBER' as DeptRole }

function parseLeaveTypes(raw: unknown): LeaveTypeEntry[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (e): e is LeaveTypeEntry =>
      e !== null &&
      typeof e === 'object' &&
      typeof (e as LeaveTypeEntry).type === 'string' &&
      typeof (e as LeaveTypeEntry).balance === 'number' &&
      typeof (e as LeaveTypeEntry).yearlyAllocation === 'number',
  )
}

export function UsersPanel({ deptId, currentUserRole, users }: UsersPanelProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [expandedLeave, setExpandedLeave] = useState<string | null>(null)
  const [leaveEdits, setLeaveEdits] = useState<Record<string, LeaveEdit>>({})
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
    setLeaveEdits((prev) => ({
      ...prev,
      [userId]: {
        yearlyAllocation: String(balance?.yearlyAllocation ?? 15),
        monthlyAccrual: String(balance?.monthlyAccrual ?? 1.25),
        balance: String(balance?.balance ?? 0),
        leaveTypes: parseLeaveTypes(balance?.leaveTypes),
        newTypeName: '',
        newTypeAllocation: '0',
        newTypeBalance: '0',
      },
    }))
  }

  function updateLeaveType(userId: string, index: number, field: keyof LeaveTypeEntry, value: string) {
    setLeaveEdits((prev) => {
      const edit = prev[userId]
      if (!edit) return prev
      const types = edit.leaveTypes.map((t, i) =>
        i === index ? { ...t, [field]: field === 'type' ? value : Number(value) } : t,
      )
      return { ...prev, [userId]: { ...edit, leaveTypes: types } }
    })
  }

  function removeLeaveType(userId: string, index: number) {
    setLeaveEdits((prev) => {
      const edit = prev[userId]
      if (!edit) return prev
      return { ...prev, [userId]: { ...edit, leaveTypes: edit.leaveTypes.filter((_, i) => i !== index) } }
    })
  }

  function addLeaveType(userId: string) {
    setLeaveEdits((prev) => {
      const edit = prev[userId]
      if (!edit || !edit.newTypeName.trim()) return prev
      const newEntry: LeaveTypeEntry = {
        type: edit.newTypeName.trim(),
        yearlyAllocation: Number(edit.newTypeAllocation) || 0,
        balance: Number(edit.newTypeBalance) || 0,
      }
      return {
        ...prev,
        [userId]: {
          ...edit,
          leaveTypes: [...edit.leaveTypes, newEntry],
          newTypeName: '',
          newTypeAllocation: '0',
          newTypeBalance: '0',
        },
      }
    })
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
        leaveTypes: edit.leaveTypes,
      }),
    })
    setLeaveSaving(null)
    router.refresh()
  }

  async function resetLeave(userId: string) {
    if (!confirm("Reset this user's leave balance to 0?")) return
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

                  {expandedLeave === u.id && leaveEdits[u.id] && (
                    <tr key={`${u.id}-leave`} className="bg-surface-secondary">
                      <td colSpan={6} className="px-4 py-4 space-y-4">

                        {/* Annual Leave */}
                        <div>
                          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wide mb-2">Annual Leave</p>
                          <div className="flex items-end gap-4 flex-wrap">
                            <div>
                              <p className="text-[11px] font-medium text-text-muted mb-1">Yearly allocation (days)</p>
                              <input
                                type="number" min="0"
                                value={leaveEdits[u.id].yearlyAllocation}
                                onChange={(e) => setLeaveEdits((prev) => ({ ...prev, [u.id]: { ...prev[u.id], yearlyAllocation: e.target.value } }))}
                                className="w-24 rounded-md border border-border px-2 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-600"
                              />
                            </div>
                            <div>
                              <p className="text-[11px] font-medium text-text-muted mb-1">Monthly accrual (days)</p>
                              <input
                                type="number" min="0" step="0.25"
                                value={leaveEdits[u.id].monthlyAccrual}
                                onChange={(e) => setLeaveEdits((prev) => ({ ...prev, [u.id]: { ...prev[u.id], monthlyAccrual: e.target.value } }))}
                                className="w-24 rounded-md border border-border px-2 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-600"
                              />
                            </div>
                            <div>
                              <p className="text-[11px] font-medium text-text-muted mb-1">Current balance (days)</p>
                              <input
                                type="number" step="0.5"
                                value={leaveEdits[u.id].balance}
                                onChange={(e) => setLeaveEdits((prev) => ({ ...prev, [u.id]: { ...prev[u.id], balance: e.target.value } }))}
                                className="w-24 rounded-md border border-border px-2 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-600"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Other leave types */}
                        <div>
                          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wide mb-2">Other Leave Types</p>

                          {leaveEdits[u.id].leaveTypes.length > 0 && (
                            <div className="space-y-2 mb-3">
                              {leaveEdits[u.id].leaveTypes.map((lt, idx) => (
                                <div key={idx} className="flex items-center gap-3 flex-wrap">
                                  <div className="w-36">
                                    <p className="text-[10px] text-text-muted mb-0.5">Type</p>
                                    <p className="text-[13px] font-medium text-text-primary px-2 py-1.5">{lt.type}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-text-muted mb-0.5">Allocation</p>
                                    <input
                                      type="number" min="0" step="0.5"
                                      value={lt.yearlyAllocation}
                                      onChange={(e) => updateLeaveType(u.id, idx, 'yearlyAllocation', e.target.value)}
                                      className="w-20 rounded-md border border-border px-2 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-600"
                                    />
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-text-muted mb-0.5">Balance</p>
                                    <input
                                      type="number" step="0.5"
                                      value={lt.balance}
                                      onChange={(e) => updateLeaveType(u.id, idx, 'balance', e.target.value)}
                                      className="w-20 rounded-md border border-border px-2 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-600"
                                    />
                                  </div>
                                  <button
                                    onClick={() => removeLeaveType(u.id, idx)}
                                    className="text-[12px] text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors mt-3"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add new type row */}
                          <div className="flex items-end gap-3 flex-wrap">
                            <div>
                              <p className="text-[11px] font-medium text-text-muted mb-1">Type name</p>
                              <input
                                type="text"
                                value={leaveEdits[u.id].newTypeName}
                                onChange={(e) => setLeaveEdits((prev) => ({ ...prev, [u.id]: { ...prev[u.id], newTypeName: e.target.value } }))}
                                placeholder="e.g. Sick Leave"
                                className="w-36 rounded-md border border-border px-2 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-600"
                              />
                            </div>
                            <div>
                              <p className="text-[11px] font-medium text-text-muted mb-1">Allocation</p>
                              <input
                                type="number" min="0" step="0.5"
                                value={leaveEdits[u.id].newTypeAllocation}
                                onChange={(e) => setLeaveEdits((prev) => ({ ...prev, [u.id]: { ...prev[u.id], newTypeAllocation: e.target.value } }))}
                                className="w-20 rounded-md border border-border px-2 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-600"
                              />
                            </div>
                            <div>
                              <p className="text-[11px] font-medium text-text-muted mb-1">Balance</p>
                              <input
                                type="number" step="0.5"
                                value={leaveEdits[u.id].newTypeBalance}
                                onChange={(e) => setLeaveEdits((prev) => ({ ...prev, [u.id]: { ...prev[u.id], newTypeBalance: e.target.value } }))}
                                className="w-20 rounded-md border border-border px-2 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-600"
                              />
                            </div>
                            <button
                              onClick={() => addLeaveType(u.id)}
                              disabled={!leaveEdits[u.id].newTypeName.trim()}
                              className="px-3 py-1.5 rounded-md border border-border text-[12px] text-text-secondary hover:bg-surface-tertiary disabled:opacity-40 transition-colors"
                            >
                              + Add type
                            </button>
                          </div>
                        </div>

                        {/* Save / Reset */}
                        <div className="flex gap-2 pt-1">
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
                            {leaveSaving === `reset-${u.id}` ? '…' : 'Reset annual balance'}
                          </button>
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
