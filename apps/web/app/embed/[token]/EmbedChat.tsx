'use client'

import { useChat } from 'ai/react'
import { useEffect, useRef } from 'react'

interface EmbedChatProps {
  deptId: string
  deptName: string
}

export function EmbedChat({ deptName }: EmbedChatProps) {
  const { messages, input, setInput, append, isLoading } = useChat({ api: '/api/chat' })
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (input.trim() && !isLoading) {
        append({ role: 'user', content: input })
        setInput('')
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f9fafb' }}>
      {/* Header */}
      <div style={{ padding: '10px 14px', background: '#fff', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#eff6ff', border: '1px solid #dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#2563eb">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{deptName}</span>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.length === 0 && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center' }}>Ask anything about {deptName}</p>
          </div>
        )}
        {messages.map((m) =>
          m.role === 'user' ? (
            <div key={m.id} style={{ alignSelf: 'flex-end', maxWidth: '80%', background: '#2563eb', color: '#fff', borderRadius: '12px 12px 2px 12px', padding: '8px 12px', fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {m.content}
            </div>
          ) : (
            <div key={m.id} style={{ alignSelf: 'flex-start', maxWidth: '85%', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px 12px 12px 2px', padding: '8px 12px', fontSize: 13, lineHeight: 1.5, color: '#111827', whiteSpace: 'pre-wrap' }}>
              {m.content}
            </div>
          )
        )}
        {isLoading && messages.at(-1)?.role === 'user' && (
          <div style={{ alignSelf: 'flex-start', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px 12px 12px 2px', padding: '10px 14px', display: 'flex', gap: 4 }}>
            {[0, 150, 300].map((d) => (
              <span key={d} style={{ width: 6, height: 6, borderRadius: '50%', background: '#d1d5db', display: 'inline-block', animation: 'pulse 1.5s infinite', animationDelay: `${d}ms` }} />
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <div style={{ padding: 10, background: '#fff', borderTop: '1px solid #e5e7eb', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 8px', background: '#fff' }}>
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask about ${deptName}…`}
            style={{ flex: 1, border: 'none', outline: 'none', resize: 'none', fontSize: 13, color: '#111827', background: 'transparent', fontFamily: 'inherit', lineHeight: 1.5, minHeight: 20, maxHeight: 80 }}
          />
          <button
            onClick={() => { if (input.trim() && !isLoading) { append({ role: 'user', content: input }); setInput('') } }}
            disabled={!input.trim() || isLoading}
            style={{ width: 28, height: 28, borderRadius: 6, background: input.trim() && !isLoading ? '#111827' : '#e5e7eb', border: 'none', cursor: input.trim() && !isLoading ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke={input.trim() && !isLoading ? '#fff' : '#9ca3af'}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
