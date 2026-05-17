'use client'

import { useEffect, useState } from 'react'

interface Announcement {
  id: string
  content: string
  createdAt: string
}

export function AnnouncementBanner({ deptId }: { deptId: string }) {
  const [items, setItems] = useState<Announcement[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/announcements')
      .then((r) => r.json())
      .then(({ data }) => setItems(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [deptId])

  const visible = items.filter((a) => !dismissed.has(a.id))
  if (visible.length === 0) return null

  return (
    <div className="flex flex-col gap-1.5 px-5 pt-3">
      {visible.map((a) => (
        <div
          key={a.id}
          className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg bg-brand-50 border border-brand-100"
        >
          <svg className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
          <p className="flex-1 text-[12.5px] text-brand-900 leading-relaxed">{a.content}</p>
          <button
            onClick={() => setDismissed((prev) => new Set([...prev, a.id]))}
            className="text-brand-400 hover:text-brand-600 flex-shrink-0 mt-0.5 transition-colors"
            title="Dismiss"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
