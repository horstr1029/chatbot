'use client'

import { useEffect, useState } from 'react'

interface WeeklyBucket { date: string; up: number; down: number }
interface LowQuery {
  messageId: string
  sessionId: string
  createdAt: string
  question: string | null
  answer: string | null
}
interface QualityData {
  totalUp: number
  totalDown: number
  weeklyBreakdown: WeeklyBucket[]
  lowScoringQueries: LowQuery[]
}

export function QualityPanel() {
  const [data, setData] = useState<QualityData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/quality')
      .then((r) => r.json())
      .then((res) => setData(res.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-5 h-5 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!data) return null

  const total = data.totalUp + data.totalDown
  const pct = total > 0 ? Math.round((data.totalUp / total) * 100) : null

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-border rounded-lg p-5">
          <p className="text-[12px] text-text-muted mb-1">Thumbs up (30d)</p>
          <p className="text-2xl font-semibold text-green-600">{data.totalUp}</p>
        </div>
        <div className="bg-white border border-border rounded-lg p-5">
          <p className="text-[12px] text-text-muted mb-1">Thumbs down (30d)</p>
          <p className="text-2xl font-semibold text-red-500">{data.totalDown}</p>
        </div>
        <div className="bg-white border border-border rounded-lg p-5">
          <p className="text-[12px] text-text-muted mb-1">Satisfaction rate</p>
          <p className="text-2xl font-semibold text-text-primary">
            {pct !== null ? `${pct}%` : '—'}
          </p>
        </div>
      </div>

      {/* Weekly breakdown */}
      {data.weeklyBreakdown.length > 0 && (
        <div className="bg-white border border-border rounded-lg p-5">
          <p className="text-[13px] font-semibold text-text-primary mb-4">Weekly breakdown</p>
          <div className="space-y-2">
            {data.weeklyBreakdown.map((w) => {
              const weekTotal = w.up + w.down
              const upPct = weekTotal > 0 ? Math.round((w.up / weekTotal) * 100) : 0
              return (
                <div key={w.date} className="flex items-center gap-3">
                  <span className="text-[12px] text-text-muted w-24 flex-shrink-0">
                    {new Date(w.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-surface-tertiary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-green-500"
                      style={{ width: `${upPct}%` }}
                    />
                  </div>
                  <span className="text-[12px] text-text-muted w-24 flex-shrink-0 text-right">
                    {w.up}↑ {w.down}↓
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Low-scoring queries */}
      <div className="bg-white border border-border rounded-lg p-5">
        <p className="text-[13px] font-semibold text-text-primary mb-4">Recent downvoted responses</p>
        {data.lowScoringQueries.length === 0 ? (
          <p className="text-[13px] text-text-muted">No downvotes yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {data.lowScoringQueries.map((q) => (
              <div key={q.messageId} className="py-3 first:pt-0 last:pb-0">
                {q.question && (
                  <p className="text-[12px] font-medium text-text-secondary mb-1">
                    <span className="text-text-muted">Q: </span>{q.question}{q.question.length === 200 ? '…' : ''}
                  </p>
                )}
                {q.answer && (
                  <p className="text-[12px] text-text-muted">
                    <span className="font-medium">A: </span>{q.answer}{q.answer.length === 200 ? '…' : ''}
                  </p>
                )}
                <p className="text-[11px] text-text-muted mt-1">
                  {new Date(q.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
