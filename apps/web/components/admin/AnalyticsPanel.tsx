'use client'

import { useEffect, useState } from 'react'

interface DayCount { date: string; count: number }
interface DeptCount { dept: string; count: number }
interface HourCount { hour: number; count: number }
interface UserCount { name: string; sessions: number }
interface AnalyticsData {
  totalSessions30d: number
  totalUsers: number
  sessionsPerDay: DayCount[]
  sessionsPerDept: DeptCount[]
  peakHours: HourCount[]
  activeUsers: UserCount[]
  topQuestions: string[]
}

function Bar({ value, max, color = 'bg-brand-600' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex-1 h-2 bg-surface-tertiary rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function AnalyticsPanel() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/superadmin/analytics')
      .then((r) => r.json())
      .then((res) => setData(res.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <div className="w-5 h-5 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
    </div>
  )
  if (!data) return null

  const maxDay = Math.max(...data.sessionsPerDay.map((d) => d.count), 1)
  const maxHour = Math.max(...data.peakHours.map((h) => h.count), 1)

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="bg-white border border-border rounded-lg p-5">
          <p className="text-[12px] text-text-muted mb-1">Sessions (30d)</p>
          <p className="text-2xl font-semibold text-text-primary">{data.totalSessions30d}</p>
        </div>
        <div className="bg-white border border-border rounded-lg p-5">
          <p className="text-[12px] text-text-muted mb-1">Total users</p>
          <p className="text-2xl font-semibold text-text-primary">{data.totalUsers}</p>
        </div>
        <div className="bg-white border border-border rounded-lg p-5">
          <p className="text-[12px] text-text-muted mb-1">Avg / day</p>
          <p className="text-2xl font-semibold text-text-primary">
            {data.sessionsPerDay.length > 0 ? Math.round(data.totalSessions30d / 30) : 0}
          </p>
        </div>
        <div className="bg-white border border-border rounded-lg p-5">
          <p className="text-[12px] text-text-muted mb-1">Departments</p>
          <p className="text-2xl font-semibold text-text-primary">{data.sessionsPerDept.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Sessions per day */}
        <div className="bg-white border border-border rounded-lg p-5">
          <p className="text-[13px] font-semibold text-text-primary mb-4">Sessions per day (30d)</p>
          {data.sessionsPerDay.length === 0 ? (
            <p className="text-[13px] text-text-muted">No data yet.</p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {data.sessionsPerDay.slice(-14).map((d) => (
                <div key={d.date} className="flex items-center gap-2">
                  <span className="text-[11px] text-text-muted w-20 flex-shrink-0">
                    {new Date(d.date).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })}
                  </span>
                  <Bar value={d.count} max={maxDay} />
                  <span className="text-[11px] text-text-muted w-6 text-right flex-shrink-0">{d.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sessions by dept */}
        <div className="bg-white border border-border rounded-lg p-5">
          <p className="text-[13px] font-semibold text-text-primary mb-4">By department (30d)</p>
          {data.sessionsPerDept.length === 0 ? (
            <p className="text-[13px] text-text-muted">No data yet.</p>
          ) : (
            <div className="space-y-2">
              {data.sessionsPerDept.map((d) => (
                <div key={d.dept} className="flex items-center gap-2">
                  <span className="text-[12px] text-text-secondary w-24 truncate flex-shrink-0">{d.dept}</span>
                  <Bar value={d.count} max={data.sessionsPerDept[0].count} color="bg-purple-500" />
                  <span className="text-[11px] text-text-muted w-6 text-right flex-shrink-0">{d.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Peak hours */}
        <div className="bg-white border border-border rounded-lg p-5">
          <p className="text-[13px] font-semibold text-text-primary mb-4">Peak hours (UTC, 30d)</p>
          <div className="space-y-1">
            {data.peakHours.filter((h) => h.count > 0).map((h) => (
              <div key={h.hour} className="flex items-center gap-2">
                <span className="text-[11px] text-text-muted w-12 flex-shrink-0">
                  {String(h.hour).padStart(2, '0')}:00
                </span>
                <Bar value={h.count} max={maxHour} color="bg-green-500" />
                <span className="text-[11px] text-text-muted w-6 text-right flex-shrink-0">{h.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Most active users */}
        <div className="bg-white border border-border rounded-lg p-5">
          <p className="text-[13px] font-semibold text-text-primary mb-4">Most active users (7d)</p>
          {data.activeUsers.length === 0 ? (
            <p className="text-[13px] text-text-muted">No activity this week.</p>
          ) : (
            <div className="divide-y divide-border">
              {data.activeUsers.map((u, i) => (
                <div key={i} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                  <span className="text-[13px] text-text-secondary truncate">{u.name}</span>
                  <span className="text-[12px] font-medium text-text-primary ml-3 flex-shrink-0">
                    {u.sessions} {u.sessions === 1 ? 'session' : 'sessions'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top questions */}
      <div className="bg-white border border-border rounded-lg p-5">
        <p className="text-[13px] font-semibold text-text-primary mb-4">Recent questions (7d)</p>
        {data.topQuestions.length === 0 ? (
          <p className="text-[13px] text-text-muted">No questions this week.</p>
        ) : (
          <ul className="space-y-1.5">
            {data.topQuestions.map((q, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="text-[11px] text-text-muted mt-0.5 flex-shrink-0">{i + 1}.</span>
                <span className="text-[12.5px] text-text-secondary leading-relaxed">{q}{q.length === 120 ? '…' : ''}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
