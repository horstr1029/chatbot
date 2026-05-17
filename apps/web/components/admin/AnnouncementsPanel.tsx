'use client'

import { useState } from 'react'

interface Announcement {
  id: string
  content: string
  createdAt: Date | string
}

interface AnnouncementsPanelProps {
  initial: Announcement[]
}

export function AnnouncementsPanel({ initial }: AnnouncementsPanelProps) {
  const [items, setItems] = useState<Announcement[]>(initial)
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function create() {
    if (!content.trim()) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      })
      const { data } = await res.json()
      setItems((prev) => [data, ...prev])
      setContent('')
    } catch {
      setError('Failed to save announcement.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    await fetch(`/api/announcements/${id}`, { method: 'DELETE' })
    setItems((prev) => prev.filter((a) => a.id !== id))
  }

  const remaining = 500 - content.length

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      {/* Compose */}
      <div className="bg-white border border-border rounded-lg p-5">
        <label className="text-[13px] font-medium text-text-primary mb-1 block">New announcement</label>
        <textarea
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, 500))}
          placeholder="e.g. New HR policy uploaded — ask the chatbot about leave applications."
          className="w-full rounded-md border border-border px-3 py-2 text-[13.5px] text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent resize-none"
        />
        <div className="flex items-center justify-between mt-2">
          <span className={`text-[11px] ${remaining < 50 ? 'text-amber-600' : 'text-text-muted'}`}>
            {remaining} characters remaining
          </span>
          <div className="flex items-center gap-3">
            {error && <span className="text-[12px] text-red-600">{error}</span>}
            <button
              onClick={create}
              disabled={saving || !content.trim()}
              className="px-4 py-1.5 rounded-md bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Posting…' : 'Post announcement'}
            </button>
          </div>
        </div>
      </div>

      {/* Active announcements */}
      {items.length === 0 ? (
        <p className="text-[13px] text-text-muted">No active announcements.</p>
      ) : (
        <div className="bg-white border border-border rounded-lg divide-y divide-border">
          {items.map((a) => (
            <div key={a.id} className="flex items-start gap-3 px-5 py-4">
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] text-text-primary leading-relaxed">{a.content}</p>
                <p className="text-[11px] text-text-muted mt-1">
                  {new Date(a.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric', month: 'short', day: 'numeric',
                  })}
                </p>
              </div>
              <button
                onClick={() => remove(a.id)}
                className="text-text-muted hover:text-red-600 transition-colors flex-shrink-0 mt-0.5"
                title="Remove"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
