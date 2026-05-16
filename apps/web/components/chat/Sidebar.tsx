'use client'

import { UserButton } from '@clerk/nextjs'
import type { ChatSession } from '@prisma/client'

interface SidebarProps {
  deptName: string
  userName: string
  userRole: string
  sessions: Pick<ChatSession, 'id' | 'title' | 'updatedAt'>[]
  activeSessionId: string | null
  onNewChat: () => void
  onSelectSession: (id: string) => void
}

export function Sidebar({
  deptName,
  userName,
  userRole,
  sessions,
  activeSessionId,
  onNewChat,
  onSelectSession,
}: SidebarProps) {
  const initials = userName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const roleLabel = userRole === 'DEPT_ADMIN' ? 'Dept Admin' : userRole === 'SUPER_ADMIN' ? 'Super Admin' : 'Member'

  return (
    <div className="w-[220px] flex-shrink-0 bg-white border-r border-border flex flex-col h-full">
      {/* Brand */}
      <div className="px-4 pt-4 pb-2">
        <p className="text-[14px] font-semibold text-text-primary">Company Chatbot</p>
      </div>

      {/* Dept badge */}
      <div className="mx-4 mt-1 rounded-md bg-brand-50 border border-brand-100 px-3 py-2">
        <p className="text-[11px] font-medium text-brand-600 uppercase tracking-wide">Department</p>
        <p className="text-[13px] font-semibold text-text-primary mt-0.5">{deptName}</p>
      </div>

      {/* New chat */}
      <div className="px-3 mt-3">
        <button
          onClick={onNewChat}
          className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-gray-900 px-3 py-2 text-[13px] font-medium text-white hover:bg-gray-800 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New chat
        </button>
      </div>

      {/* History */}
      <div className="flex-1 overflow-y-auto px-2 mt-3">
        {sessions.length === 0 && (
          <p className="text-[12px] text-text-muted px-2">No conversations yet</p>
        )}
        {sessions.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelectSession(s.id)}
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
        <UserButton />
      </div>
    </div>
  )
}
