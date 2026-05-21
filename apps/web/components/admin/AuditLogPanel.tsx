'use client'

import { useEffect, useState, useCallback } from 'react'

interface AuditEntry {
  id: string
  userId: string
  userEmail: string
  action: string
  targetId: string | null
  targetType: string | null
  meta: Record<string, unknown> | null
  deptId: string | null
  createdAt: string
}

const ACTION_LABELS: Record<string, string> = {
  USER_ROLE_CHANGED: 'Role changed',
  USER_REMOVED: 'User removed',
  USER_ADDED: 'User added',
  DOCUMENT_ADDED: 'Document added',
  DOCUMENT_DELETED: 'Document deleted',
  WORKFLOW_APPROVED: 'Workflow approved',
  WORKFLOW_REJECTED: 'Workflow rejected',
  DEPT_SETTINGS_SAVED: 'Settings saved',
  SUPERADMIN_GRANTED: 'Super admin granted',
  SUPERADMIN_REVOKED: 'Super admin revoked',
  DEPT_CREATED: 'Department created',
  DEPT_DELETED: 'Department deleted',
  CHAT_ESCALATED: 'Chat escalated',
}

const ACTION_COLORS: Record<string, string> = {
  WORKFLOW_APPROVED: 'bg-green-50 text-green-700',
  WORKFLOW_REJECTED: 'bg-red-50 text-red-600',
  USER_REMOVED: 'bg-red-50 text-red-600',
  DEPT_DELETED: 'bg-red-50 text-red-600',
  SUPERADMIN_REVOKED: 'bg-red-50 text-red-600',
  SUPERADMIN_GRANTED: 'bg-brand-50 text-brand-700',
  CHAT_ESCALATED: 'bg-amber-50 text-amber-700',
}

export function AuditLogPanel() {
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState('')

  const load = useCallback(async (p: number, action: string) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p) })
    if (action) params.set('action', action)
    const res = await fetch(`/api/superadmin/audit?${params}`)
    const { data } = await res.json()
    setLogs(data?.logs ?? [])
    setTotal(data?.total ?? 0)
    setPages(data?.pages ?? 1)
    setLoading(false)
  }, [])

  useEffect(() => { load(page, actionFilter) }, [page, actionFilter, load])

  function handleFilterChange(action: string) {
    setActionFilter(action)
    setPage(1)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select
          value={actionFilter}
          onChange={(e) => handleFilterChange(e.target.value)}
          className="rounded-md border border-border px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-600"
        >
          <option value="">All actions</option>
          {Object.entries(ACTION_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <span className="text-[12px] text-text-muted">{total} entries</span>
      </div>

      <div className="bg-white border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-5 h-5 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-[13px] text-text-muted p-5">No audit entries yet.</p>
        ) : (
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-border bg-surface-secondary">
                <th className="text-left px-4 py-2.5 font-medium text-text-muted">When</th>
                <th className="text-left px-4 py-2.5 font-medium text-text-muted">User</th>
                <th className="text-left px-4 py-2.5 font-medium text-text-muted">Action</th>
                <th className="text-left px-4 py-2.5 font-medium text-text-muted">Target</th>
                <th className="text-left px-4 py-2.5 font-medium text-text-muted">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-surface-secondary transition-colors">
                  <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-2.5 text-text-secondary truncate max-w-[140px]">
                    {log.userEmail}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${ACTION_COLORS[log.action] ?? 'bg-surface-tertiary text-text-secondary'}`}>
                      {ACTION_LABELS[log.action] ?? log.action}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-text-muted">
                    {log.targetType ? `${log.targetType}` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-text-muted truncate max-w-[200px]">
                    {log.meta ? Object.entries(log.meta).map(([k, v]) => `${k}: ${v}`).join(', ') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-md border border-border text-[12px] text-text-secondary hover:bg-surface-secondary disabled:opacity-40 transition-colors"
          >
            Previous
          </button>
          <span className="text-[12px] text-text-muted">Page {page} of {pages}</span>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="px-3 py-1.5 rounded-md border border-border text-[12px] text-text-secondary hover:bg-surface-secondary disabled:opacity-40 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
