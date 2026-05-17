'use client'

import { useEffect, useState } from 'react'

interface WorkflowRequest {
  id: string
  description: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'FAILED'
  createdAt: string
  approvedAt: string | null
  rejectionReason: string | null
  dept: { name: string }
}

interface WorkflowsPanelProps {
  open: boolean
  onClose: () => void
}

const statusConfig = {
  PENDING:  { label: 'Pending',  cls: 'bg-amber-50 text-amber-600' },
  APPROVED: { label: 'Approved', cls: 'bg-green-50 text-green-600' },
  REJECTED: { label: 'Rejected', cls: 'bg-red-50 text-red-600' },
  EXECUTED: { label: 'Executed', cls: 'bg-green-50 text-green-600' },
  FAILED:   { label: 'Failed',   cls: 'bg-red-50 text-red-600' },
}

export function WorkflowsPanel({ open, onClose }: WorkflowsPanelProps) {
  const [items, setItems] = useState<WorkflowRequest[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/api/workflows/my')
      .then((r) => r.json())
      .then(({ data }) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [open])

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/20" onClick={onClose} />}
      <div className={`fixed top-0 right-0 h-full z-40 w-[380px] bg-white border-l border-border flex flex-col shadow-lg transition-transform duration-200 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-[52px] flex items-center px-5 gap-3 border-b border-border flex-shrink-0">
          <svg className="w-4 h-4 text-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <p className="flex-1 text-[13px] font-semibold text-text-primary">My workflow requests</p>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:bg-surface-secondary transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading && (
            <div className="flex items-center justify-center h-20">
              <svg className="w-5 h-5 text-text-muted animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <svg className="w-8 h-8 text-border mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <p className="text-[13px] text-text-muted">No workflow requests yet</p>
              <p className="text-[11px] text-text-muted mt-1">Ask the chatbot to automate a task</p>
            </div>
          )}

          {!loading && items.length > 0 && (
            <ul className="flex flex-col gap-2">
              {items.map((item) => {
                const s = statusConfig[item.status]
                return (
                  <li key={item.id} className="rounded-lg border border-border bg-white p-3.5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-[13px] font-medium text-text-primary leading-snug flex-1">{item.description}</p>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded flex-shrink-0 ${s.cls}`}>{s.label}</span>
                    </div>
                    <p className="text-[11px] text-text-muted">{item.dept.name} · {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    {item.rejectionReason && (
                      <p className="text-[11px] text-red-600 mt-1.5 bg-red-50 rounded px-2 py-1">{item.rejectionReason}</p>
                    )}
                    {item.approvedAt && item.status === 'APPROVED' && (
                      <p className="text-[11px] text-green-600 mt-1.5">Approved {new Date(item.approvedAt).toLocaleDateString()}</p>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="px-4 py-3 border-t border-border">
          <p className="text-[11px] text-text-muted text-center">Contact your admin to approve pending requests</p>
        </div>
      </div>
    </>
  )
}
