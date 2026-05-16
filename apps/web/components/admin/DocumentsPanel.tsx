'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DocumentSource, SourceType } from '@prisma/client'

const SOURCE_LABELS: Record<SourceType, string> = {
  GOOGLE_DRIVE: 'Google Drive',
  SHAREPOINT: 'SharePoint',
  LOCAL: 'Local Path',
}

interface DocumentsPanelProps {
  deptId: string
  sources: DocumentSource[]
}

export function DocumentsPanel({ deptId, sources }: DocumentsPanelProps) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    sourceType: 'LOCAL' as SourceType,
    sourceUrl: '',
    sourcePath: '',
    isGlobal: false,
  })

  async function handleAdd() {
    if (!form.name.trim()) return
    setLoading('add')
    await fetch(`/api/departments/${deptId}/sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setLoading(null)
    setAdding(false)
    setForm({ name: '', sourceType: 'LOCAL', sourceUrl: '', sourcePath: '', isGlobal: false })
    router.refresh()
  }

  async function handleDelete(sid: string) {
    setLoading(sid)
    await fetch(`/api/departments/${deptId}/sources/${sid}`, { method: 'DELETE' })
    setLoading(null)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-border rounded-lg overflow-hidden">
        {sources.length === 0 && !adding ? (
          <div className="p-8 text-center text-[13px] text-text-muted">No document sources added yet.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-secondary">
                {['Name', 'Type', 'Path / URL', 'Last synced', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[12px] font-medium text-text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sources.map((s) => (
                <tr key={s.id} className="hover:bg-surface-secondary transition-colors">
                  <td className="px-4 py-3 text-[13px] text-text-primary">{s.name}</td>
                  <td className="px-4 py-3 text-[13px] text-text-secondary">{SOURCE_LABELS[s.sourceType]}</td>
                  <td className="px-4 py-3 text-[12px] text-text-muted font-mono truncate max-w-[200px]">
                    {s.sourceUrl ?? s.sourcePath ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-text-muted">
                    {s.lastSynced ? new Date(s.lastSynced).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      disabled={loading === s.id}
                      onClick={() => handleDelete(s.id)}
                      className="text-[12px] text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors disabled:opacity-50"
                    >
                      {loading === s.id ? '…' : 'Remove'}
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
          <p className="text-[13px] font-medium text-text-primary">Add document source</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[13px] font-medium text-text-primary mb-1 block">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-md border border-border px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
                placeholder="e.g. HR Policies Drive"
              />
            </div>
            <div>
              <label className="text-[13px] font-medium text-text-primary mb-1 block">Type</label>
              <select
                value={form.sourceType}
                onChange={(e) => setForm((f) => ({ ...f, sourceType: e.target.value as SourceType }))}
                className="w-full rounded-md border border-border px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-brand-600"
              >
                <option value="LOCAL">Local Path</option>
                <option value="GOOGLE_DRIVE">Google Drive</option>
                <option value="SHAREPOINT">SharePoint</option>
              </select>
            </div>
          </div>

          {form.sourceType === 'LOCAL' ? (
            <div>
              <label className="text-[13px] font-medium text-text-primary mb-1 block">Directory path</label>
              <input
                value={form.sourcePath}
                onChange={(e) => setForm((f) => ({ ...f, sourcePath: e.target.value }))}
                className="w-full rounded-md border border-border px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent font-mono"
                placeholder="/data/docs/hr"
              />
            </div>
          ) : (
            <div>
              <label className="text-[13px] font-medium text-text-primary mb-1 block">
                {form.sourceType === 'GOOGLE_DRIVE' ? 'Drive folder URL' : 'SharePoint site URL'}
              </label>
              <input
                value={form.sourceUrl}
                onChange={(e) => setForm((f) => ({ ...f, sourceUrl: e.target.value }))}
                className="w-full rounded-md border border-border px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
                placeholder="https://..."
              />
            </div>
          )}

          <label className="flex items-center gap-2 text-[13px] text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={form.isGlobal}
              onChange={(e) => setForm((f) => ({ ...f, isGlobal: e.target.checked }))}
              className="rounded"
            />
            Mark as global (accessible to all departments)
          </label>

          <div className="flex gap-2 pt-1">
            <button
              disabled={!form.name.trim() || loading === 'add'}
              onClick={handleAdd}
              className="px-4 py-2 rounded-md bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {loading === 'add' ? 'Adding…' : 'Add source'}
            </button>
            <button
              onClick={() => setAdding(false)}
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
          Add source
        </button>
      )}
    </div>
  )
}
