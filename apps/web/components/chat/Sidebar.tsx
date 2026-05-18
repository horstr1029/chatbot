'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { ChatSession } from '@prisma/client'
import { LogoutButton } from '@/components/auth/LogoutButton'

interface DeptOption { id: string; name: string }

interface SidebarProps {
  deptName: string
  deptId: string
  userName: string
  userRole: string
  sessions: Pick<ChatSession, 'id' | 'title' | 'updatedAt'>[]
  activeSessionId: string | null
  onNewChat: () => void
  onSelectSession: (id: string) => void
  availableDepts: DeptOption[]
}

type SessionItem = Pick<ChatSession, 'id' | 'title' | 'updatedAt'>

export function Sidebar({
  deptName,
  deptId,
  userName,
  userRole,
  sessions,
  activeSessionId,
  onNewChat,
  onSelectSession,
  availableDepts,
}: SidebarProps) {
  const router = useRouter()
  const [switching, setSwitching] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SessionItem[]>([])
  const [searching, setSearching] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
    else { setQuery(''); setResults([]) }
  }, [searchOpen])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim() || query.length < 2) { setResults([]); return }

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/chat/sessions/search?q=${encodeURIComponent(query)}`)
        const { data } = await res.json()
        setResults(Array.isArray(data) ? data : [])
      } finally {
        setSearching(false)
      }
    }, 300)
  }, [query])

  const initials = userName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  const roleLabel = userRole === 'DEPT_ADMIN' ? 'Dept Admin' : userRole === 'SUPER_ADMIN' ? 'Super Admin' : 'Member'
  const multiDept = availableDepts.length > 1
  const displayedSessions = searchOpen && query.length >= 2 ? results : sessions

  async function switchDept(id: string) {
    if (id === deptId) return
    setSwitching(true)
    await fetch('/api/auth/switch-dept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deptId: id }),
    })
    router.refresh()
    setSwitching(false)
  }

  function handleSelect(id: string) {
    setSearchOpen(false)
    onSelectSession(id)
  }

  return (
    <div className="w-[220px] flex-shrink-0 bg-white border-r border-border flex flex-col h-full">
      <div className="px-4 pt-4 pb-2 flex items-center gap-2">
        <img src="/logo.jpg" alt="MST Chatbot" className="h-10 object-contain" />
      </div>

      {/* Dept badge / switcher */}
      <div className="mx-4 mt-1 rounded-md bg-brand-50 border border-brand-100 px-3 py-2">
        <p className="text-[11px] font-medium text-brand-600 uppercase tracking-wide">Department</p>
        {multiDept ? (
          <select
            value={deptId}
            disabled={switching}
            onChange={(e) => switchDept(e.target.value)}
            className="mt-0.5 w-full bg-transparent text-[13px] font-semibold text-text-primary border-none outline-none cursor-pointer disabled:opacity-60"
          >
            {availableDepts.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        ) : (
          <p className="text-[13px] font-semibold text-text-primary mt-0.5">{deptName}</p>
        )}
      </div>

      {/* New chat + search toggle */}
      <div className="px-3 mt-3 flex gap-1.5">
        <button
          onClick={onNewChat}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-[13px] font-medium text-white hover:bg-gray-800 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New chat
        </button>
        <button
          onClick={() => setSearchOpen((v) => !v)}
          title="Search history"
          className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-colors flex-shrink-0 ${
            searchOpen
              ? 'bg-brand-50 border-brand-200 text-brand-600'
              : 'border-border text-text-muted hover:bg-surface-secondary hover:text-text-secondary'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>

      {/* Search input */}
      {searchOpen && (
        <div className="px-3 mt-2">
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search conversations…"
              className="w-full pl-8 pr-3 py-1.5 rounded-md border border-border text-[12px] text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brand-600 focus:border-brand-600"
            />
            {searching && (
              <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
          </div>
          {query.length >= 2 && results.length === 0 && !searching && (
            <p className="text-[11px] text-text-muted px-1 mt-1.5">No results</p>
          )}
        </div>
      )}

      {/* History */}
      <div className="flex-1 overflow-y-auto px-2 mt-3">
        {!searchOpen && displayedSessions.length === 0 && (
          <p className="text-[12px] text-text-muted px-2">No conversations yet</p>
        )}
        {displayedSessions.map((s) => (
          <button
            key={s.id}
            onClick={() => handleSelect(s.id)}
            className={`flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-[13px] transition-colors mb-0.5 ${
              s.id === activeSessionId
                ? 'bg-brand-50 text-brand-700 font-medium'
                : 'text-text-secondary hover:bg-surface-tertiary'
            }`}
          >
            <span className="flex-1 truncate text-left">{s.title ?? 'Untitled'}</span>
            <span className="text-[11px] text-text-muted flex-shrink-0">
              {new Date(s.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          </button>
        ))}
      </div>

      {/* User footer */}
      <div className="flex items-center gap-2.5 p-3 border-t border-border">
        <div className="w-[30px] h-[30px] rounded-full bg-brand-600 text-white text-[11px] font-semibold flex items-center justify-center flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-text-primary truncate">{userName}</p>
          <p className="text-[11px] text-text-muted">{roleLabel}</p>
        </div>
        <LogoutButton />
      </div>
    </div>
  )
}
