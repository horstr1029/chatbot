'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StatusPill } from './StatusPill'

type WorkflowRequest = {
  id: string
  description: string
  userMessage: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'FAILED'
  rejectionReason: string | null
  createdAt: Date
  requestedBy: { name: string | null; email: string }
  approvedBy: { name: string | null; email: string } | null
}

interface WorkflowsTableProps {
  requests: WorkflowRequest[]
}

export function WorkflowsTable({ requests }: WorkflowsTableProps) {
  const router = useRouter()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  async function approve(id: string) {
    setLoading(id)
    await fetch(`/api/workflows/${id}/approve`, { method: 'POST' })
    setLoading(null)
    router.refresh()
  }

  async function reject(id: string) {
    if (!rejectReason.trim()) return
    setLoading(id)
    await fetch(`/api/workflows/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: rejectReason }),
    })
    setLoading(null)
    setRejectingId(null)
    setRejectReason('')
    router.refresh()
  }

  if (requests.length === 0) {
    return (
      <div className="bg-white border border-border rounded-lg p-10 text-center">
        <p className="text-[13px] text-text-muted">No workflow requests yet.</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-surface-secondary">
            {['Requested by', 'Description', 'Date', 'Status', ''].map((h) => (
              <th key={h} className="text-left px-4 py-3 text-[12px] font-medium text-text-muted">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {requests.map((r) => (
            <>
              <tr
                key={r.id}
                className={`hover:bg-surface-secondary cursor-pointer transition-colors ${
                  r.status === 'PENDING' ? 'bg-amber-50/40' : ''
                }`}
                onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
              >
                <td className="px-4 py-3 text-[13px] text-text-primary">
                  {r.requestedBy.name ?? r.requestedBy.email}
                </td>
                <td className="px-4 py-3 text-[13px] text-text-secondary max-w-xs truncate">
                  {r.description}
                </td>
                <td className="px-4 py-3 text-[12px] text-text-muted whitespace-nowrap">
                  {new Date(r.createdAt).toLocaleDateString(undefined, {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </td>
                <td className="px-4 py-3">
                  <StatusPill status={r.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <svg
                    className={`w-4 h-4 text-text-muted ml-auto transition-transform ${expandedId === r.id ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </td>
              </tr>

              {expandedId === r.id && (
                <tr key={`${r.id}-detail`} className="bg-surface-secondary">
                  <td colSpan={5} className="px-4 py-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1">
                          User request
                        </p>
                        <p className="text-[13px] text-text-primary">{r.userMessage}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1">
                          Workflow description
                        </p>
                        <p className="text-[13px] text-text-secondary">{r.description}</p>
                      </div>

                      {r.rejectionReason && (
                        <div>
                          <p className="text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1">
                            Rejection reason
                          </p>
                          <p className="text-[13px] text-red-600">{r.rejectionReason}</p>
                        </div>
                      )}

                      {r.status === 'PENDING' && (
                        <div className="flex items-start gap-3 pt-1">
                          <button
                            disabled={!!loading}
                            onClick={(e) => { e.stopPropagation(); approve(r.id) }}
                            className="px-3 py-1.5 rounded-md bg-green-600 text-white text-[13px] font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                          >
                            {loading === r.id ? 'Approving…' : 'Approve'}
                          </button>

                          {rejectingId === r.id ? (
                            <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                              <input
                                autoFocus
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Reason for rejection…"
                                className="flex-1 rounded-md border border-border px-3 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
                              />
                              <button
                                disabled={!rejectReason.trim() || !!loading}
                                onClick={() => reject(r.id)}
                                className="px-3 py-1.5 rounded-md border border-red-200 text-red-600 text-[13px] hover:bg-red-50 disabled:opacity-50 transition-colors"
                              >
                                {loading === r.id ? 'Rejecting…' : 'Confirm'}
                              </button>
                              <button
                                onClick={() => setRejectingId(null)}
                                className="px-3 py-1.5 text-[13px] text-text-muted hover:text-text-secondary"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); setRejectingId(r.id) }}
                              className="px-3 py-1.5 rounded-md text-red-600 text-[13px] hover:bg-red-50 transition-colors"
                            >
                              Reject
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  )
}
