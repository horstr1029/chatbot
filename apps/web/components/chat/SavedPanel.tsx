'use client'

import { useEffect, useState } from 'react'

interface SavedItem {
  id: string
  content: string
  createdAt: string
}

interface SavedPanelProps {
  open: boolean
  onClose: () => void
  onJumpTo?: (sessionId: string) => void
}

export function SavedPanel({ open, onClose, onJumpTo }: SavedPanelProps) {
  const [items, setItems] = useState<SavedItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/api/chat/saved')
      .then((r) => r.json())
      .then(({ data }) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [open])

  async function remove(id: string) {
    await fetch(`/api/chat/saved/${id}`, { method: 'DELETE' })
    setItems((prev) => prev.filter((s) => s.id !== id))
  }

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/20" onClick={onClose} />}
      <div className={`fixed top-0 right-0 h-full z-40 w-[340px] bg-white border-l border-border flex flex-col shadow-lg transition-transform duration-200 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-[52px] flex items-center px-5 gap-3 border-b border-border flex-shrink-0">
          <svg className="w-4 h-4 text-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <p className="flex-1 text-[13px] font-semibold text-text-primary">Saved answers</p>
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <p className="text-[13px] text-text-muted">No saved answers yet</p>
              <p className="text-[11px] text-text-muted mt-1">Click the bookmark icon on any AI response</p>
            </div>
          )}

          {!loading && items.length > 0 && (
            <ul className="flex flex-col gap-2">
              {items.map((item) => (
                <li key={item.id} className="rounded-lg border border-border bg-white p-3">
                  <p className="text-[12.5px] text-text-secondary leading-relaxed line-clamp-4">{item.content}</p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                    <span className="text-[11px] text-text-muted">
                      {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                    <button
                      onClick={() => remove(item.id)}
                      className="text-[11px] text-text-muted hover:text-red-600 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="px-4 py-3 border-t border-border">
          <p className="text-[11px] text-text-muted text-center">Saved answers are private to you</p>
        </div>
      </div>
    </>
  )
}
