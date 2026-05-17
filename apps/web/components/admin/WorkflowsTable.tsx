'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StatusPill } from './StatusPill'

type ApprovalStepStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

type ApprovalStep = {
  id: string
  stepOrder: number
  label: string
  status: ApprovalStepStatus
  approvedBy: { name: string | null; email: string } | null
  approvedAt: Date | null
  rejectionReason: string | null
}

type WorkflowRequest = {
  id: string
  description: string
  userMessage: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'FAILED'
  rejectionReason: string | null
  createdAt: Date
  requestedBy: { name: string | null; email: string }
  approvedBy: { name: string | null; email: string } | null
  approvalSteps: ApprovalStep[]
}

interface WorkflowsTableProps {
  requests: WorkflowRequest[]
}

function StepChain({ steps }: { steps: ApprovalStep[] }) {
  if (steps.length === 0) return null

  return (
    <div className="mt-3">
      <p className="text-[11px] font-medium text-text-muted uppercase tracking-wide mb-2">
        Approval chain
      </p>
      <div className="flex items-center gap-0 flex-wrap">
        {steps.map((step, idx) => {
          const isApproved = step.status === 'APPROVED'
          const isRejected = step.status === 'REJECTED'
          const isPending = step.status === 'PENDING'

          const circleClass = isApproved
            ? 'bg-green-500 text-white border-green-500'
            : isRejected
              ? 'bg-red-500 text-white border-red-500'
              : 'bg-white text-text-muted border-border'

          return (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[11px] font-semibold ${circleClass}`}
                >
                  {isApproved ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isRejected ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    step.stepOrder
                  )}
                </div>
                <p className={`text-[10px] mt-1 whitespace-nowrap ${isPending ? 'text-text-muted' : isApproved ? 'text-green-600' : 'text-red-600'}`}>
                  {step.label}
                </p>
                {step.approvedBy && (
                  <p className="text-[10px] text-text-muted truncate max-w-[80px]">
                    {step.approvedBy.name ?? step.approvedBy.email}
                  </p>
                )}
              </div>
              {idx < steps.length - 1 && (
                <div className="w-8 h-px bg-border mx-1 mb-4 flex-shrink-0" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
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
                  <div className="flex items-center gap-2">
                    <StatusPill status={r.status} />
                    {r.approvalSteps.length > 0 && (
                      <span className="text-[10px] text-text-muted">
                        {r.approvalSteps.filter((s) => s.status === 'APPROVED').length}/{r.approvalSteps.length} steps
                      </span>
                    )}
                  </div>
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

                      <StepChain steps={r.approvalSteps} />

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
