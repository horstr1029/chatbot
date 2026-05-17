'use client'

import { useEffect, useState } from 'react'

interface ReminderItem {
  id: string
  title: string
  topic: string
  scheduleLabel: string
  lastSentAt: string | null
  createdAt: string
}

interface RemindersPanelProps {
  open: boolean
  onClose: () => void
}

const SCHEDULE_PRESETS = [
  { label: 'Daily at 9am', cronExpr: '0 9 * * *', scheduleLabel: 'Every day at 9am' },
  { label: 'Every Monday at 9am', cronExpr: '0 9 * * 1', scheduleLabel: 'Every Monday at 9am' },
  { label: 'Every weekday at 9am', cronExpr: '0 9 * * 1-5', scheduleLabel: 'Every weekday at 9am' },
  { label: '1st of month at 9am', cronExpr: '0 9 1 * *', scheduleLabel: 'Every 1st of the month at 9am' },
]

export function RemindersPanel({ open, onClose }: RemindersPanelProps) {
  const [items, setItems] = useState<ReminderItem[]>([])
  const [loading, setLoading] = useState(false)
  const [addTitle, setAddTitle] = useState('')
  const [addTopic, setAddTopic] = useState('')
  const [addPreset, setAddPreset] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/api/reminders')
      .then((r) => r.json())
      .then(({ data }) => setItems(Array.isArray(data) ? (data as ReminderItem[]) : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [open])

  async function handleDelete(id: string) {
    await fetch('/api/reminders', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setItems((prev) => prev.filter((r) => r.id !== id))
  }

  async function handleAdd() {
    if (!addTitle.trim() || !addTopic.trim()) {
      setFormError('Title and topic are required.')
      return
    }
    setFormError('')
    setSubmitting(true)

    const preset = SCHEDULE_PRESETS[addPreset]
    const res = await fetch('/api/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: addTitle.trim(),
        topic: addTopic.trim(),
        cronExpr: preset.cronExpr,
        scheduleLabel: preset.scheduleLabel,
      }),
    })

    setSubmitting(false)

    if (res.ok) {
      const { data } = await res.json()
      setItems((prev) => [data as ReminderItem, ...prev])
      setAddTitle('')
      setAddTopic('')
    } else {
      setFormError('Failed to create reminder.')
    }
  }

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/20" onClick={onClose} />}
      <div
        className={`fixed top-0 right-0 h-full z-40 w-[360px] bg-white border-l border-border flex flex-col shadow-lg transition-transform duration-200 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="h-[52px] flex items-center px-5 gap-3 border-b border-border flex-shrink-0">
          <svg className="w-4 h-4 text-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <p className="flex-1 text-[13px] font-semibold text-text-primary">Reminders</p>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:bg-surface-secondary transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* List */}
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <p className="text-[13px] text-text-muted">No reminders yet</p>
              <p className="text-[11px] text-text-muted mt-1">Add one below or ask the AI to set a reminder for you</p>
            </div>
          )}

          {!loading && items.length > 0 && (
            <ul className="flex flex-col gap-2 mb-4">
              {items.map((item) => (
                <li key={item.id} className="rounded-lg border border-border bg-white p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-text-primary truncate">{item.title}</p>
                      <p className="text-[11px] text-brand-600 mt-0.5">{item.scheduleLabel}</p>
                      <p className="text-[11px] text-text-muted mt-0.5">Topic: {item.topic}</p>
                    </div>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="flex-shrink-0 text-[11px] text-text-muted hover:text-red-600 transition-colors mt-0.5"
                    >
                      Delete
                    </button>
                  </div>
                  {item.lastSentAt && (
                    <p className="text-[11px] text-text-muted mt-2 pt-2 border-t border-border">
                      Last sent:{' '}
                      {new Date(item.lastSentAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Add reminder form */}
        <div className="border-t border-border px-4 py-4 space-y-3">
          <p className="text-[12px] font-semibold text-text-primary">Add reminder</p>
          <div>
            <label className="text-[12px] font-medium text-text-primary mb-1 block">Title</label>
            <input
              value={addTitle}
              onChange={(e) => setAddTitle(e.target.value)}
              placeholder="e.g. Check weekly report"
              className="w-full rounded-md border border-border px-3 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-text-primary mb-1 block">Search topic</label>
            <input
              value={addTopic}
              onChange={(e) => setAddTopic(e.target.value)}
              placeholder="e.g. weekly finance report"
              className="w-full rounded-md border border-border px-3 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-text-primary mb-1 block">Schedule</label>
            <select
              value={addPreset}
              onChange={(e) => setAddPreset(Number(e.target.value))}
              className="w-full rounded-md border border-border px-3 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-600"
            >
              {SCHEDULE_PRESETS.map((p, i) => (
                <option key={p.cronExpr} value={i}>{p.label}</option>
              ))}
            </select>
          </div>
          {formError && <p className="text-[12px] text-red-600">{formError}</p>}
          <button
            onClick={handleAdd}
            disabled={submitting}
            className="w-full px-3 py-2 rounded-md bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Creating…' : 'Create reminder'}
          </button>
        </div>
      </div>
    </>
  )
}
