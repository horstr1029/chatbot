'use client'

import { useState } from 'react'

interface AdminUser {
  id: string
  name: string
  email: string
  createdAt: string
  isSelf: boolean
}

interface SuperAdminsPanelProps {
  admins: AdminUser[]
}

export function SuperAdminsPanel({ admins: initial }: SuperAdminsPanelProps) {
  const [admins, setAdmins] = useState(initial)
  const [email, setEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setAdding(true)
    try {
      const res = await fetch('/api/superadmin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setError(json.error ?? 'Failed to add admin.')
        return
      }
      setAdmins((prev) => [...prev, { ...json.data, isSelf: false }])
      setEmail('')
    } finally {
      setAdding(false)
    }
  }

  async function handleRemove(id: string) {
    if (!confirm('Remove super admin access from this user?')) return
    const res = await fetch(`/api/superadmin/admins/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (!res.ok || json.error) {
      alert(json.error ?? 'Failed to remove admin.')
      return
    }
    setAdmins((prev) => prev.filter((a) => a.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-border rounded-lg p-5">
        <h2 className="text-[13px] font-semibold text-text-primary mb-1">Add super admin</h2>
        <p className="text-[12px] text-text-secondary mb-4">
          The user must already have an account. They will gain full super admin access on their next login.
        </p>
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="email"
            placeholder="user@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1 rounded-md border border-border px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={adding || !email}
            className="px-4 py-2 rounded-md bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {adding ? 'Adding…' : 'Add'}
          </button>
        </form>
        {error && <p className="text-[12px] text-red-600 mt-2">{error}</p>}
      </div>

      <div className="bg-white border border-border rounded-lg overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border bg-surface-secondary">
              <th className="text-left px-4 py-2.5 font-medium text-text-secondary">Name</th>
              <th className="text-left px-4 py-2.5 font-medium text-text-secondary">Email</th>
              <th className="text-left px-4 py-2.5 font-medium text-text-secondary">Added</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {admins.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3 text-text-primary font-medium">
                  {a.name}
                  {a.isSelf && (
                    <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 font-medium">you</span>
                  )}
                </td>
                <td className="px-4 py-3 text-text-secondary">{a.email}</td>
                <td className="px-4 py-3 text-text-muted">
                  {new Date(a.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  {!a.isSelf && (
                    <button
                      onClick={() => handleRemove(a.id)}
                      className="text-[12px] text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                    >
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {admins.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-text-muted text-[12px]">
                  No super admins found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
