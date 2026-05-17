'use client'

import { useChat } from 'ai/react'
import { useState, useRef, useEffect, useCallback } from 'react'
import type { ChatSession } from '@prisma/client'
import { Sidebar } from './Sidebar'
import { MessageBubble, TypingIndicator } from './MessageBubble'
import { Composer } from './Composer'
import { DocsPanel } from './DocsPanel'
import type { Citation } from './CitationChip'

interface DeptOption { id: string; name: string }

interface ChatInterfaceProps {
  deptName: string
  deptId: string
  userName: string
  userRole: string
  initials: string
  sessions: Pick<ChatSession, 'id' | 'title' | 'updatedAt'>[]
  availableDepts: DeptOption[]
}

type StoredMessage = { id: string; role: 'user' | 'assistant'; content: string }

const SUGGESTED_QUESTIONS = (deptName: string) => [
  `What documents are available for ${deptName}?`,
  `Summarise the most important policies for ${deptName}`,
  `What procedures should I follow for ${deptName}?`,
  `What are the key contacts or resources for ${deptName}?`,
]

export function ChatInterface({
  deptName,
  deptId,
  userName,
  userRole,
  initials,
  sessions: initialSessions,
  availableDepts,
}: ChatInterfaceProps) {
  const [sessions, setSessions] = useState(initialSessions)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [citationsMap, setCitationsMap] = useState<Record<string, Citation[]>>({})
  const [docsOpen, setDocsOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pendingCitations = useRef<Citation[]>([])
  const sessionIdRef = useRef<string | null>(null)

  const { messages, input, setInput, append, isLoading, setMessages } = useChat({
    api: '/api/chat',
    onResponse: (res) => {
      const raw = res.headers.get('x-citations')
      if (raw) {
        try { pendingCitations.current = JSON.parse(raw) } catch {}
      }
    },
    onFinish: async (msg) => {
      if (pendingCitations.current.length > 0) {
        setCitationsMap((prev) => ({ ...prev, [msg.id]: pendingCitations.current }))
        pendingCitations.current = []
      }
      await persistSession()
    },
  })

  const persistSession = useCallback(async () => {
    const currentMessages = (window as unknown as { __chatMessages?: StoredMessage[] }).__chatMessages
    if (!currentMessages?.length) return

    const res = await fetch('/api/chat/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionIdRef.current ?? undefined,
        messages: currentMessages,
      }),
    })

    if (res.ok) {
      const { data } = await res.json()
      if (!sessionIdRef.current) {
        sessionIdRef.current = data.id
        setActiveSessionId(data.id)
        const listRes = await fetch('/api/chat/sessions')
        if (listRes.ok) {
          const { data: list } = await listRes.json()
          setSessions(list)
        }
      }
    }
  }, [])

  useEffect(() => {
    ;(window as unknown as { __chatMessages?: StoredMessage[] }).__chatMessages =
      messages.map((m) => ({ id: m.id, role: m.role as 'user' | 'assistant', content: m.content }))
  }, [messages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  async function handleSelectSession(id: string) {
    const res = await fetch(`/api/chat/sessions/${id}`)
    if (!res.ok) return
    const { data } = await res.json()
    const stored: StoredMessage[] = Array.isArray(data.messages) ? data.messages : []
    setMessages(stored)
    setCitationsMap({})
    sessionIdRef.current = id
    setActiveSessionId(id)
  }

  function handleNewChat() {
    setMessages([])
    setInput('')
    setActiveSessionId(null)
    setCitationsMap({})
    sessionIdRef.current = null
  }

  function handleSubmit() {
    if (!input.trim() || isLoading) return
    append({ role: 'user', content: input })
    setInput('')
  }

  function handleSuggestion(q: string) {
    append({ role: 'user', content: q })
  }

  const title = messages.find((m) => m.role === 'user')?.content.slice(0, 40) ?? 'New chat'
  const suggestions = SUGGESTED_QUESTIONS(deptName)

  return (
    <div className="flex h-screen overflow-hidden bg-surface-secondary">
      <Sidebar
        deptName={deptName}
        deptId={deptId}
        userName={userName}
        userRole={userRole}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        availableDepts={availableDepts}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <div className="h-[52px] flex items-center px-5 gap-3 border-b border-border bg-white flex-shrink-0">
          <h1 className="flex-1 text-[14px] font-semibold text-text-primary truncate">
            {messages.length > 0 ? title : 'New conversation'}
          </h1>
          <button
            onClick={() => setDocsOpen(true)}
            className="text-[11px] font-medium px-2 py-1 rounded bg-surface-tertiary text-text-muted hover:bg-brand-50 hover:text-brand-600 transition-colors"
          >
            {deptName} docs
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5">
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-[14px] font-medium text-text-primary mb-1 text-center">
                Ask anything about {deptName}
              </p>
              <p className="text-[13px] text-text-muted max-w-sm text-center mb-6">
                Search documents, get answers, or request a workflow automation.
              </p>
              <div className="grid grid-cols-2 gap-2 max-w-lg w-full">
                {suggestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSuggestion(q)}
                    className="text-left px-3 py-2.5 rounded-lg border border-border bg-white text-[12px] text-text-secondary hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 transition-colors leading-snug"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              role={m.role as 'user' | 'assistant'}
              content={m.content}
              citations={m.role === 'assistant' ? (citationsMap[m.id] ?? []) : []}
              initials={initials}
              isStreaming={isLoading && m.id === messages.at(-1)?.id && m.role === 'assistant'}
              messageId={m.id}
              sessionId={sessionIdRef.current ?? undefined}
            />
          ))}

          {isLoading && messages.at(-1)?.role === 'user' && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        <Composer
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          deptName={deptName}
        />
      </div>

      <DocsPanel
        open={docsOpen}
        onClose={() => setDocsOpen(false)}
        deptId={deptId}
        deptName={deptName}
      />
    </div>
  )
}
