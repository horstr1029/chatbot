'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface DeptAssignment {
  deptId: string
  dept: { name: string }
}

interface ManagerRow {
  id: string
  name: string | null
  email: string
  createdAt: Date
  departments: DeptAssignment[]
}

interface DeptOption {
  id: string
  name: string
}

interface ManagersPanelProps {
  managers: ManagerRow[]
  departments: DeptOption[]
}

export function ManagersPanel({ managers, departments }: ManagersPanelProps) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  // Create form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [selectedDepts, setSelectedDepts] = useState<string[]>([])

  // Edit form state
  const [editDepts, setEditDepts] = useState<string[]>([])
  const [editName, setEditName] = useState('')

  function toggleDept(id: string, current: string[], setter: (v: string[]) => void) {
    setter(current.includes(id) ? current.filter((d) => d !== id) : [...current, id])
  }

  async function handleCreate() {
    if (!name.trim() || !email.trim() || selectedDepts.length === 0) return
    setLoading('create')
    await fetch('/api/managers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), email: email.trim(), deptIds: selectedDepts }),
    })
    setLoading(null)
    setAdding(false)
    setName(''); setEmail(''); setSelectedDepts([])
    router.refresh()
  }

  function startEdit(m: ManagerRow) {
    setEditingId(m.id)
    setEditDepts(m.departments.map((d) => d.deptId))
    setEditName(m.name ?? '')
  }

  async function handleUpdate(id: string) {
    setLoading(`edit-${id}`)
    await Promise.all([
      fetch(`/api/managers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deptIds: editDepts }),
      }),
      editName.trim() && fetch(`/api/managers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      }),
    ])
    setLoading(null)
    setEditingId(null)
    router.refresh()
  }

  async function handleDelete(id: string, managerName: string) {
    if (!confirm(`Remove manager "${managerName}"? They will lose access to all their departments.`)) return
    setLoading(`del-${id}`)
    await fetch(`/api/managers/${id}`, { method: 'DELETE' })
    setLoading(null)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-border rounded-lg overflow-hidden">
        {managers.length === 0 && !adding ? (
          <div className="p-8 text-center text-[13px] text-text-muted">No managers yet.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-secondary">
                {['Name', 'Email', 'Departments', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[12px] font-medium text-text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {managers.map((m) => (
                <>
                  <tr key={m.id} className="hover:bg-surface-secondary transition-colors">
                    <td className="px-4 py-3 text-[13px] font-medium text-text-primary">{m.name ?? '—'}</td>
                    <td className="px-4 py-3 text-[12px] text-text-secondary">{m.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {m.departments.map((d) => (
                          <span key={d.deptId} className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-100">
                            {d.dept.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                      <button
                        onClick={() => startEdit(m)}
                        className="text-[12px] text-brand-600 hover:bg-brand-50 px-2 py-1 rounded transition-colors font-medium"
                      >
                        Edit
                      </button>
                      <button
                        disabled={loading === `del-${m.id}`}
                        onClick={() => handleDelete(m.id, m.name ?? m.email)}
                        className="text-[12px] text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors disabled:opacity-50"
                      >
                        {loading === `del-${m.id}` ? '…' : 'Remove'}
                      </button>
                    </td>
                  </tr>
                  {editingId === m.id && (
                    <tr key={`${m.id}-edit`} className="bg-brand-50/30">
                      <td colSpan={4} className="px-4 py-4 space-y-3">
                        <div>
                          <p className="text-[12px] font-medium text-text-primary mb-1.5">Name</p>
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-64 rounded-md border border-border px-3 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
                            placeholder="Full name"
                          />
                        </div>
                        <p className="text-[12px] font-medium text-text-primary">Department assignments</p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {departments.map((d) => (
                            <button
                              key={d.id}
                              onClick={() => toggleDept(d.id, editDepts, setEditDepts)}
                              className={`text-[12px] px-3 py-1.5 rounded-full border transition-colors ${
                                editDepts.includes(d.id)
                                  ? 'bg-brand-600 text-white border-brand-600'
                                  : 'bg-white text-text-secondary border-border hover:border-brand-300'
                              }`}
                            >
                              {d.name}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button
                            disabled={editDepts.length === 0 || loading === `edit-${m.id}`}
                            onClick={() => handleUpdate(m.id)}
                            className="px-3 py-1.5 rounded-md bg-gray-900 text-white text-[12px] font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
                          >
                            {loading === `edit-${m.id}` ? 'Saving…' : 'Save'}
                          </button>
                          <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-[12px] text-text-secondary hover:text-text-primary">
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {adding ? (
        <div className="bg-white border border-border rounded-lg p-5 space-y-4">
          <p className="text-[13px] font-medium text-text-primary">New manager</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[13px] font-medium text-text-primary mb-1 block">Full name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
                placeholder="Jane Smith"
                autoFocus
              />
            </div>
            <div>
              <label className="text-[13px] font-medium text-text-primary mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
                placeholder="jane@company.com"
              />
            </div>
          </div>
          <p className="text-[12px] text-text-muted -mt-1">A temporary password will be generated and emailed to the manager.</p>
          <div>
            <label className="text-[13px] font-medium text-text-primary mb-2 block">
              Assign departments <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {departments.map((d) => (
                <button
                  key={d.id}
                  onClick={() => toggleDept(d.id, selectedDepts, setSelectedDepts)}
                  className={`text-[12px] px-3 py-1.5 rounded-full border transition-colors ${
                    selectedDepts.includes(d.id)
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-text-secondary border-border hover:border-brand-300'
                  }`}
                >
                  {d.name}
                </button>
              ))}
            </div>
            {selectedDepts.length === 0 && (
              <p className="text-[11px] text-amber-600 mt-1.5">Select at least one department.</p>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <button
              disabled={!name.trim() || !email.trim() || selectedDepts.length === 0 || loading === 'create'}
              onClick={handleCreate}
              className="px-4 py-2 rounded-md bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {loading === 'create' ? 'Creating…' : 'Create manager'}
            </button>
            <button
              onClick={() => { setAdding(false); setName(''); setEmail(''); setSelectedDepts([]) }}
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
          Add manager
        </button>
      )}
    </div>
  )
}
