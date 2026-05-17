'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type CrossDeptStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CANCELLED'

interface CrossDeptRequestRow {
  id: string
  title: string
  description: string
  status: CrossDeptStatus
  response: string | null
  createdAt: string
  resolvedAt: string | null
  fromDept: { name: string }
  toDept: { name: string }
  requestedBy: { name: string | null; email: string }
}

interface DeptOption {
  id: string
  name: string
}

interface CrossDeptPanelProps {
  requests: CrossDeptRequestRow[]
  deptId: string
  allDepts: DeptOption[]
}

const statusVariants: Record<CrossDeptStatus, string> = {
  OPEN: 'bg-amber-50 text-amber-600',
  IN_PROGRESS: 'bg-brand-50 text-brand-600',
  RESOLVED: 'bg-green-50 text-green-600',
  CANCELLED: 'bg-surface-tertiary text-text-muted',
}

function StatusBadge({ status }: { status: CrossDeptStatus }) {
  return (
    <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded ${statusVariants[status]}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

export function CrossDeptPanel({ requests: initialRequests, deptId, allDepts }: CrossDeptPanelProps) {
  const router = useRouter()
  const [tab, setTab] = useState<'incoming' | 'outgoing'>('incoming')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [responseText, setResponseText] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<string | null>(null)

  // New request form
  const [newOpen, setNewOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newToDeptId, setNewToDeptId] = useState(allDepts.filter((d) => d.id !== deptId)[0]?.id ?? '')
  const [newSubmitting, setNewSubmitting] = useState(false)
  const [newError, setNewError] = useState('')

  // We rely on the server-fetched data directly, filtered by direction using dept names
  // The server already filters by fromDeptId OR toDeptId matching deptId,
  // so we use the name of our dept to categorise rows.
  const myDeptName = allDepts.find((d) => d.id === deptId)?.name ?? ''
  const allIncoming = initialRequests.filter((r) => r.toDept.name === myDeptName)
  const allOutgoing = initialRequests.filter((r) => r.fromDept.name === myDeptName)

  const displayed = tab === 'incoming' ? allIncoming : allOutgoing

  async function updateRequest(id: string, updates: { status?: string; response?: string }) {
    setLoading(id)
    await fetch(`/api/cross-dept/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    setLoading(null)
    router.refresh()
  }

  async function cancelRequest(id: string) {
    setLoading(id)
    await fetch(`/api/cross-dept/${id}`, { method: 'DELETE' })
    setLoading(null)
    router.refresh()
  }

  async function handleNewRequest() {
    if (!newTitle.trim() || !newDesc.trim()) {
      setNewError('Title and description are required.')
      return
    }
    if (!newToDeptId) {
      setNewError('Please select a target department.')
      return
    }
    setNewError('')
    setNewSubmitting(true)

    const res = await fetch('/api/cross-dept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle.trim(), description: newDesc.trim(), toDeptId: newToDeptId }),
    })

    setNewSubmitting(false)

    if (res.ok) {
      setNewOpen(false)
      setNewTitle('')
      setNewDesc('')
      router.refresh()
    } else {
      const { error } = await res.json()
      setNewError(error ?? 'Failed to send request.')
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Cross-Department Requests</h1>
          <p className="text-[13px] text-text-secondary mt-1">
            Manage requests from and to other departments.
          </p>
        </div>
        <button
          onClick={() => setNewOpen((p) => !p)}
          className="px-4 py-2 rounded-md bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-800 transition-colors"
        >
          {newOpen ? 'Cancel' : '+ New request'}
        </button>
      </div>

      {/* New request form */}
      {newOpen && (
        <div className="bg-white border border-border rounded-lg p-5 mb-5 space-y-3">
          <p className="text-[13px] font-semibold text-text-primary">Send request to another department</p>
          <div>
            <label className="text-[13px] font-medium text-text-primary mb-1 block">Target department</label>
            <select
              value={newToDeptId}
              onChange={(e) => setNewToDeptId(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-brand-600"
            >
              {allDepts.filter((d) => d.id !== deptId).map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[13px] font-medium text-text-primary mb-1 block">Request title</label>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Budget review for Q3"
              className="w-full rounded-md border border-border px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
            />
          </div>
          <div>
            <label className="text-[13px] font-medium text-text-primary mb-1 block">Description</label>
            <textarea
              rows={3}
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Describe what you need from the other department…"
              className="w-full rounded-md border border-border px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent resize-none"
            />
          </div>
          {newError && <p className="text-[12px] text-red-600">{newError}</p>}
          <button
            onClick={handleNewRequest}
            disabled={newSubmitting}
            className="px-4 py-2 rounded-md bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {newSubmitting ? 'Sending…' : 'Send request'}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4">
        <button
          onClick={() => setTab('incoming')}
          className={`px-3 py-1.5 rounded-md text-[13px] transition-colors ${
            tab === 'incoming' ? 'bg-brand-50 text-brand-700 font-medium' : 'text-text-secondary hover:bg-surface-tertiary'
          }`}
        >
          Incoming
          {allIncoming.filter((r) => r.status === 'OPEN' || r.status === 'IN_PROGRESS').length > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-semibold">
              {allIncoming.filter((r) => r.status === 'OPEN' || r.status === 'IN_PROGRESS').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('outgoing')}
          className={`px-3 py-1.5 rounded-md text-[13px] transition-colors ${
            tab === 'outgoing' ? 'bg-brand-50 text-brand-700 font-medium' : 'text-text-secondary hover:bg-surface-tertiary'
          }`}
        >
          Outgoing
        </button>
      </div>

      {/* Table */}
      {displayed.length === 0 ? (
        <div className="bg-white border border-border rounded-lg p-10 text-center">
          <p className="text-[13px] text-text-muted">
            No {tab} requests yet.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-secondary">
                {['Title', tab === 'incoming' ? 'From' : 'To', 'Date', 'Status', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[12px] font-medium text-text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {displayed.map((r) => (
                <>
                  <tr
                    key={r.id}
                    className={`hover:bg-surface-secondary cursor-pointer transition-colors ${
                      r.status === 'OPEN' ? 'bg-amber-50/30' : r.status === 'IN_PROGRESS' ? 'bg-brand-50/30' : ''
                    }`}
                    onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                  >
                    <td className="px-4 py-3 text-[13px] text-text-primary font-medium">{r.title}</td>
                    <td className="px-4 py-3 text-[13px] text-text-secondary">
                      {tab === 'incoming' ? r.fromDept.name : r.toDept.name}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-text-muted whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
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
                            <p className="text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1">Description</p>
                            <p className="text-[13px] text-text-primary">{r.description}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1">Requested by</p>
                            <p className="text-[13px] text-text-secondary">
                              {r.requestedBy.name ?? r.requestedBy.email}
                            </p>
                          </div>

                          {r.response && (
                            <div>
                              <p className="text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1">Response</p>
                              <p className="text-[13px] text-text-secondary">{r.response}</p>
                            </div>
                          )}

                          {/* Incoming actions */}
                          {tab === 'incoming' && (r.status === 'OPEN' || r.status === 'IN_PROGRESS') && (
                            <div className="space-y-2 pt-1" onClick={(e) => e.stopPropagation()}>
                              <textarea
                                rows={2}
                                value={responseText[r.id] ?? ''}
                                onChange={(e) =>
                                  setResponseText((prev) => ({ ...prev, [r.id]: e.target.value }))
                                }
                                placeholder="Add a response (optional)…"
                                className="w-full rounded-md border border-border px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-600 resize-none"
                              />
                              <div className="flex items-center gap-2">
                                {r.status === 'OPEN' && (
                                  <button
                                    disabled={!!loading}
                                    onClick={() =>
                                      updateRequest(r.id, {
                                        status: 'IN_PROGRESS',
                                        response: responseText[r.id] || undefined,
                                      })
                                    }
                                    className="px-3 py-1.5 rounded-md bg-brand-600 text-white text-[13px] font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
                                  >
                                    Mark in progress
                                  </button>
                                )}
                                <button
                                  disabled={!!loading}
                                  onClick={() =>
                                    updateRequest(r.id, {
                                      status: 'RESOLVED',
                                      response: responseText[r.id] || undefined,
                                    })
                                  }
                                  className="px-3 py-1.5 rounded-md bg-green-600 text-white text-[13px] font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                                >
                                  {loading === r.id ? 'Saving…' : 'Mark resolved'}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Outgoing cancel */}
                          {tab === 'outgoing' && r.status === 'OPEN' && (
                            <div onClick={(e) => e.stopPropagation()}>
                              <button
                                disabled={!!loading}
                                onClick={() => cancelRequest(r.id)}
                                className="px-3 py-1.5 rounded-md text-red-600 text-[13px] hover:bg-red-50 disabled:opacity-50 transition-colors"
                              >
                                {loading === r.id ? 'Cancelling…' : 'Cancel request'}
                              </button>
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
      )}
    </div>
  )
}
