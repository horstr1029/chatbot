'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type CrossDeptStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CANCELLED'

interface MessageRow {
  id: string
  content: string
  deptId: string
  createdAt: string
  user: { name: string | null; email: string }
}

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
  messages: MessageRow[]
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

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function CrossDeptPanel({ requests: initialRequests, deptId, allDepts }: CrossDeptPanelProps) {
  const router = useRouter()
  const [tab, setTab] = useState<'incoming' | 'outgoing'>('incoming')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  // Per-request message draft
  const [msgDraft, setMsgDraft] = useState<Record<string, string>>({})
  const [msgSending, setMsgSending] = useState<string | null>(null)
  // Optimistic messages per request
  const [localMessages, setLocalMessages] = useState<Record<string, MessageRow[]>>({})

  const threadRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // New request form
  const [newOpen, setNewOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newToDeptId, setNewToDeptId] = useState(allDepts.filter((d) => d.id !== deptId)[0]?.id ?? '')
  const [newSubmitting, setNewSubmitting] = useState(false)
  const [newError, setNewError] = useState('')

  const myDeptName = allDepts.find((d) => d.id === deptId)?.name ?? ''
  const allIncoming = initialRequests.filter((r) => r.toDept.name === myDeptName)
  const allOutgoing = initialRequests.filter((r) => r.fromDept.name === myDeptName)
  const displayed = tab === 'incoming' ? allIncoming : allOutgoing

  function getMessages(r: CrossDeptRequestRow): MessageRow[] {
    return localMessages[r.id] ?? r.messages
  }

  // Scroll thread to bottom when expanded or new message
  useEffect(() => {
    if (expandedId) {
      const el = threadRefs.current[expandedId]
      if (el) el.scrollTop = el.scrollHeight
    }
  }, [expandedId, localMessages])

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

  async function sendMessage(requestId: string) {
    const content = msgDraft[requestId]?.trim()
    if (!content) return
    setMsgSending(requestId)

    const res = await fetch(`/api/cross-dept/${requestId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })

    setMsgSending(null)

    if (res.ok) {
      const { data } = await res.json()
      setLocalMessages((prev) => {
        const base = prev[requestId] ?? initialRequests.find((r) => r.id === requestId)?.messages ?? []
        return { ...prev, [requestId]: [...base, data] }
      })
      setMsgDraft((prev) => ({ ...prev, [requestId]: '' }))
    }
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
          <p className="text-[13px] text-text-muted">No {tab} requests yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-secondary">
                {['Title', tab === 'incoming' ? 'From' : 'To', 'Date', 'Status', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[12px] font-medium text-text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {displayed.map((r) => {
                const messages = getMessages(r)
                const isClosed = r.status === 'RESOLVED' || r.status === 'CANCELLED'
                return (
                  <>
                    <tr
                      key={r.id}
                      className={`hover:bg-surface-secondary cursor-pointer transition-colors ${
                        r.status === 'OPEN' ? 'bg-amber-50/30' : r.status === 'IN_PROGRESS' ? 'bg-brand-50/30' : ''
                      }`}
                      onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                    >
                      <td className="px-4 py-3 text-[13px] text-text-primary font-medium">
                        {r.title}
                        {messages.length > 0 && (
                          <span className="ml-2 text-[11px] text-text-muted font-normal">
                            {messages.length} message{messages.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-text-secondary">
                        {tab === 'incoming' ? r.fromDept.name : r.toDept.name}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-text-muted whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleDateString(undefined, {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
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
                          <div className="space-y-4" onClick={(e) => e.stopPropagation()}>

                            {/* Request details */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1">Description</p>
                                <p className="text-[13px] text-text-primary">{r.description}</p>
                              </div>
                              <div>
                                <p className="text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1">Requested by</p>
                                <p className="text-[13px] text-text-secondary">{r.requestedBy.name ?? r.requestedBy.email}</p>
                              </div>
                            </div>

                            {/* Message thread */}
                            <div>
                              <p className="text-[11px] font-medium text-text-muted uppercase tracking-wide mb-2">
                                Thread {messages.length > 0 ? `(${messages.length})` : ''}
                              </p>

                              {messages.length === 0 ? (
                                <p className="text-[12px] text-text-muted italic">No messages yet. Start the conversation below.</p>
                              ) : (
                                <div
                                  ref={(el) => { threadRefs.current[r.id] = el }}
                                  className="space-y-2 max-h-60 overflow-y-auto pr-1"
                                >
                                  {messages.map((m) => {
                                    const isMe = m.deptId === deptId
                                    return (
                                      <div key={m.id} className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0 mt-0.5 ${isMe ? 'bg-brand-600 text-white' : 'bg-surface-tertiary border border-border text-text-secondary'}`}>
                                          {(m.user.name ?? m.user.email).charAt(0).toUpperCase()}
                                        </div>
                                        <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                                          <div className={`px-3 py-2 rounded-lg text-[13px] leading-relaxed ${isMe ? 'bg-brand-600 text-white rounded-br-sm' : 'bg-white border border-border text-text-primary rounded-bl-sm'}`}>
                                            {m.content}
                                          </div>
                                          <span className="text-[11px] text-text-muted">
                                            {m.user.name ?? m.user.email} · {formatTime(m.createdAt)}
                                          </span>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}

                              {/* Message composer */}
                              {!isClosed && (
                                <div className="mt-3 flex gap-2 items-end">
                                  <textarea
                                    rows={2}
                                    value={msgDraft[r.id] ?? ''}
                                    onChange={(e) => setMsgDraft((prev) => ({ ...prev, [r.id]: e.target.value }))}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault()
                                        sendMessage(r.id)
                                      }
                                    }}
                                    placeholder="Type a message… (Enter to send)"
                                    className="flex-1 rounded-md border border-border px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-600 resize-none"
                                  />
                                  <button
                                    disabled={msgSending === r.id || !msgDraft[r.id]?.trim()}
                                    onClick={() => sendMessage(r.id)}
                                    className="px-3 py-2 rounded-md bg-brand-600 text-white text-[13px] font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                                  >
                                    {msgSending === r.id ? 'Sending…' : 'Send'}
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Status actions — incoming only */}
                            {tab === 'incoming' && !isClosed && (
                              <div className="flex items-center gap-2 pt-1 border-t border-border">
                                {r.status === 'OPEN' && (
                                  <button
                                    disabled={!!loading}
                                    onClick={() => updateRequest(r.id, { status: 'IN_PROGRESS' })}
                                    className="px-3 py-1.5 rounded-md bg-brand-600 text-white text-[13px] font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
                                  >
                                    Mark in progress
                                  </button>
                                )}
                                <button
                                  disabled={!!loading}
                                  onClick={() => updateRequest(r.id, { status: 'RESOLVED' })}
                                  className="px-3 py-1.5 rounded-md bg-green-600 text-white text-[13px] font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                                >
                                  {loading === r.id ? 'Saving…' : 'Mark resolved'}
                                </button>
                              </div>
                            )}

                            {/* Cancel — outgoing only */}
                            {tab === 'outgoing' && r.status === 'OPEN' && (
                              <div className="pt-1 border-t border-border">
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
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
