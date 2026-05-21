'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface DeptRow {
  id: string
  name: string
  llmModel: string
  manager: { id: string; name: string | null; email: string } | null
  _count: { users: number; documentSources: number }
}

interface UserOption {
  id: string
  name: string | null
  email: string
}

interface DepartmentsPanelProps {
  departments: DeptRow[]
  users: UserOption[]
}

export function DepartmentsPanel({ departments, users }: DepartmentsPanelProps) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [managerId, setManagerId] = useState('')
  const [loading, setLoading] = useState<string | null>(null)

  async function handleManage(deptId: string) {
    setLoading(`manage-${deptId}`)
    await fetch('/api/auth/switch-dept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deptId }),
    })
    router.push('/admin')
    router.refresh()
  }

  async function handleAdd() {
    if (!name.trim() || !managerId) return
    setLoading('add')
    await fetch('/api/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), managerId }),
    })
    setLoading(null)
    setAdding(false)
    setName('')
    setManagerId('')
    router.refresh()
  }

  async function handleDelete(id: string, deptName: string) {
    if (!confirm(`Delete department "${deptName}"? This cannot be undone.`)) return
    setLoading(`del-${id}`)
    await fetch(`/api/departments/${id}`, { method: 'DELETE' })
    setLoading(null)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-border rounded-lg overflow-hidden">
        {departments.length === 0 && !adding ? (
          <div className="p-8 text-center text-[13px] text-text-muted">No departments yet.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-secondary">
                {['Name', 'Manager', 'LLM model', 'Users', 'Sources', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[12px] font-medium text-text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {departments.map((d) => (
                <tr key={d.id} className="hover:bg-surface-secondary transition-colors">
                  <td className="px-4 py-3 text-[13px] font-medium text-text-primary">{d.name}</td>
                  <td className="px-4 py-3 text-[12px] text-text-secondary">
                    {d.manager ? (
                      <span>{d.manager.name ?? d.manager.email}</span>
                    ) : (
                      <span className="text-amber-600 font-medium">None assigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-text-muted font-mono">{d.llmModel}</td>
                  <td className="px-4 py-3 text-[13px] text-text-secondary">{d._count.users}</td>
                  <td className="px-4 py-3 text-[13px] text-text-secondary">{d._count.documentSources}</td>
                  <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                    <button
                      disabled={loading === `manage-${d.id}`}
                      onClick={() => handleManage(d.id)}
                      className="text-[12px] text-brand-600 hover:bg-brand-50 px-2 py-1 rounded transition-colors disabled:opacity-50 font-medium"
                    >
                      {loading === `manage-${d.id}` ? '…' : 'Manage'}
                    </button>
                    <button
                      disabled={loading === `del-${d.id}`}
                      onClick={() => handleDelete(d.id, d.name)}
                      className="text-[12px] text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors disabled:opacity-50"
                    >
                      {loading === `del-${d.id}` ? '…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {adding ? (
        <div className="bg-white border border-border rounded-lg p-5 space-y-3">
          <p className="text-[13px] font-medium text-text-primary">New department</p>
          <div>
            <label className="text-[13px] font-medium text-text-primary mb-1 block">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="w-full rounded-md border border-border px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
              placeholder="e.g. Finance"
              autoFocus
            />
          </div>
          <div>
            <label className="text-[13px] font-medium text-text-primary mb-1 block">
              Manager <span className="text-red-500">*</span>
            </label>
            <select
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
            >
              <option value="">Select a manager…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name ? `${u.name} (${u.email})` : u.email}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-text-muted mt-1">
              The manager will be added as a Dept Admin and receive all form submissions for this department.
            </p>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              disabled={!name.trim() || !managerId || loading === 'add'}
              onClick={handleAdd}
              className="px-4 py-2 rounded-md bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {loading === 'add' ? 'Creating…' : 'Create'}
            </button>
            <button
              onClick={() => { setAdding(false); setName(''); setManagerId('') }}
              className="px-4 py-2 text-[13px] text-text-secondary hover:text-text-primary"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-[13px] font-medium text-brand-600 hover:text-brand-700"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add department
        </button>
      )}
    </div>
  )
}
