'use client'

import { useEffect, useState } from 'react'

interface DeptOption {
  id: string
  name: string
}

interface CrossDeptModalProps {
  open: boolean
  onClose: () => void
}

export function CrossDeptModal({ open, onClose }: CrossDeptModalProps) {
  const [depts, setDepts] = useState<DeptOption[]>([])
  const [toDeptId, setToDeptId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    fetch('/api/departments')
      .then((r) => r.json())
      .then(({ data }) => {
        const list = Array.isArray(data) ? (data as DeptOption[]) : []
        setDepts(list)
        if (list.length > 0) setToDeptId(list[0].id)
      })
      .catch(() => {})
  }, [open])

  async function handleSubmit() {
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.')
      return
    }
    if (!toDeptId) {
      setError('Please select a target department.')
      return
    }
    setError('')
    setSubmitting(true)

    const res = await fetch('/api/cross-dept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), description: description.trim(), toDeptId }),
    })

    setSubmitting(false)

    if (res.ok) {
      setSuccess(true)
    } else {
      const { error: err } = await res.json()
      setError(err ?? 'Failed to send request.')
    }
  }

  function handleClose() {
    setSuccess(false)
    setTitle('')
    setDescription('')
    setError('')
    onClose()
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={handleClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-border shadow-lg w-full max-w-md">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
            <div className="w-8 h-8 rounded-md bg-brand-50 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="flex-1 text-[14px] font-semibold text-text-primary">Send request to another department</p>
            <button
              onClick={handleClose}
              className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:bg-surface-secondary transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4 space-y-4">
            {success ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-[14px] font-semibold text-text-primary mb-1">Request sent</p>
                <p className="text-[13px] text-text-secondary">
                  The target department's admin has been notified and will respond shortly.
                </p>
                <button
                  onClick={handleClose}
                  className="mt-5 px-4 py-2 rounded-md bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-800 transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-[13px] font-medium text-text-primary mb-1 block">Target department</label>
                  <select
                    value={toDeptId}
                    onChange={(e) => setToDeptId(e.target.value)}
                    className="w-full rounded-md border border-border px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-brand-600"
                  >
                    {depts.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[13px] font-medium text-text-primary mb-1 block">Request title</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Budget approval for Q3 campaign"
                    className="w-full rounded-md border border-border px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-[13px] font-medium text-text-primary mb-1 block">Description</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what you need…"
                    className="w-full rounded-md border border-border px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent resize-none"
                  />
                </div>
                {error && <p className="text-[12px] text-red-600">{error}</p>}
              </>
            )}
          </div>

          {/* Footer */}
          {!success && (
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border">
              <button
                onClick={handleClose}
                className="px-3 py-1.5 text-[13px] text-text-muted hover:text-text-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-2 rounded-md bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Sending…' : 'Send request'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
