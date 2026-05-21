'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { CitationChip, type Citation } from './CitationChip'

const MermaidDiagram = dynamic(
  () => import('./MermaidDiagram').then((m) => m.MermaidDiagram),
  { ssr: false },
)

type Segment = { type: 'text'; content: string } | { type: 'mermaid'; content: string }

function parseSegments(text: string): Segment[] {
  const segments: Segment[] = []
  const regex = /```mermaid\n([\s\S]*?)```/g
  let last = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) segments.push({ type: 'text', content: text.slice(last, match.index) })
    segments.push({ type: 'mermaid', content: match[1] })
    last = match.index + match[0].length
  }

  if (last < text.length) segments.push({ type: 'text', content: text.slice(last) })
  return segments
}

function MessageContent({ text, searchQuery }: { text: string; searchQuery: string }) {
  const segments = parseSegments(text)
  if (segments.length === 1 && segments[0].type === 'text') {
    return <HighlightedText text={text} query={searchQuery} />
  }
  return (
    <>
      {segments.map((seg, i) =>
        seg.type === 'mermaid' ? (
          <MermaidDiagram key={i} definition={seg.content} />
        ) : (
          <span key={i} className="whitespace-pre-wrap">
            <HighlightedText text={seg.content} query={searchQuery} />
          </span>
        )
      )}
    </>
  )
}

interface MessageBubbleProps {
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
  initials?: string
  personaName?: string
  isStreaming?: boolean
  messageId?: string
  sessionId?: string
  confidence?: number | null
  suggestions?: string[]
  onSuggestion?: (q: string) => void
  timestamp?: Date
  searchQuery?: string
  isCurrentMatch?: boolean
}

function relativeTime(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-amber-200 text-amber-900 rounded-sm px-0.5">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={copy}
      title="Copy response"
      className="w-6 h-6 flex items-center justify-center rounded text-text-muted hover:text-text-secondary hover:bg-surface-secondary transition-colors"
    >
      {copied ? (
        <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  )
}

function BookmarkButton({ messageId, sessionId, content }: { messageId: string; sessionId: string; content: string }) {
  const [saved, setSaved] = useState(false)

  async function toggle() {
    if (saved) {
      setSaved(false)
      return
    }
    setSaved(true)
    await fetch('/api/chat/saved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, sessionId, content }),
    })
  }

  return (
    <button
      onClick={toggle}
      title={saved ? 'Saved' : 'Save answer'}
      className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
        saved
          ? 'text-brand-600 bg-brand-50'
          : 'text-text-muted hover:text-text-secondary hover:bg-surface-secondary'
      }`}
    >
      <svg className="w-3.5 h-3.5" fill={saved ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
    </button>
  )
}

function FeedbackButtons({ messageId, sessionId }: { messageId: string; sessionId: string }) {
  const [voted, setVoted] = useState<1 | -1 | null>(null)

  async function vote(rating: 1 | -1) {
    const next = voted === rating ? null : rating
    setVoted(next)
    if (next !== null) {
      await fetch('/api/chat/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, sessionId, rating: next }),
      })
    }
  }

  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={() => vote(1)}
        title="Helpful"
        className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
          voted === 1
            ? 'text-green-500 bg-green-50'
            : 'text-text-muted hover:text-text-secondary hover:bg-surface-secondary'
        }`}
      >
        <svg className="w-3.5 h-3.5" fill={voted === 1 ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
        </svg>
      </button>
      <button
        onClick={() => vote(-1)}
        title="Not helpful"
        className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
          voted === -1
            ? 'text-red-500 bg-red-50'
            : 'text-text-muted hover:text-text-secondary hover:bg-surface-secondary'
        }`}
      >
        <svg className="w-3.5 h-3.5" fill={voted === -1 ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
        </svg>
      </button>
    </div>
  )
}

function ConfidenceDot({ score }: { score: number }) {
  const color = score > 0.75 ? 'bg-green-400' : score >= 0.5 ? 'bg-amber-400' : 'bg-red-400'
  const label = score > 0.75 ? 'High confidence' : score >= 0.5 ? 'Medium confidence' : 'Low confidence'
  return (
    <span title={`${label} (${Math.round(score * 100)}%)`} className={`inline-block w-2 h-2 rounded-full ${color} mr-1.5 flex-shrink-0`} />
  )
}

export function MessageBubble({
  role,
  content,
  citations = [],
  initials = 'U',
  personaName,
  isStreaming,
  messageId,
  sessionId,
  confidence,
  suggestions = [],
  onSuggestion,
  timestamp,
  searchQuery = '',
  isCurrentMatch = false,
}: MessageBubbleProps) {
  const personaInitials = personaName
    ? personaName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : 'AI'
  if (role === 'user') {
    return (
      <div className="group flex items-start gap-2.5 max-w-[88%] self-end flex-row-reverse">
        <div className="w-7 h-7 rounded-full bg-brand-600 text-white text-[11px] font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
          {initials}
        </div>
        <div>
          <div className={`bg-brand-600 text-white rounded-xl rounded-br-sm px-3.5 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-wrap transition-shadow ${isCurrentMatch ? 'ring-2 ring-amber-400 ring-offset-1' : ''}`}>
            <HighlightedText text={content} query={searchQuery} />
          </div>
          {timestamp && (
            <p className="text-right text-[10.5px] text-text-muted mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {relativeTime(timestamp)}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="group flex items-start gap-2.5 max-w-[88%]">
      <div className="w-7 h-7 rounded-full bg-surface-tertiary border border-border flex items-center justify-center text-[11px] font-semibold text-text-secondary flex-shrink-0 mt-0.5" title={personaName}>
        {personaInitials}
      </div>
      <div className="min-w-0">
        <div className={`bg-white border border-border rounded-xl rounded-bl-sm px-3.5 py-2.5 text-[13.5px] leading-relaxed text-text-primary transition-shadow ${isCurrentMatch ? 'ring-2 ring-amber-400 ring-offset-1' : ''}`}>
          <MessageContent text={content} searchQuery={searchQuery} />
          {isStreaming && <span className="inline-block w-0.5 h-3.5 bg-text-muted ml-0.5 animate-pulse" />}
        </div>
        {timestamp && (
          <p className="text-[10.5px] text-text-muted mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {relativeTime(timestamp)}
          </p>
        )}
        {citations.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {citations.map((c) => <CitationChip key={c.id} citation={c} />)}
          </div>
        )}
        {!isStreaming && messageId && sessionId && (
          <div className="flex items-center gap-1 mt-1.5">
            {confidence != null && <ConfidenceDot score={confidence} />}
            <CopyButton text={content} />
            <BookmarkButton messageId={messageId} sessionId={sessionId} content={content} />
            <FeedbackButtons messageId={messageId} sessionId={sessionId} />
          </div>
        )}
        {!isStreaming && suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => onSuggestion?.(s)}
                className="text-[11px] px-2.5 py-1 rounded-full border border-brand-100 bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function TypingIndicator({ personaName }: { personaName?: string }) {
  const initials = personaName
    ? personaName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : 'AI'
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-7 h-7 rounded-full bg-surface-tertiary border border-border flex items-center justify-center text-[11px] font-semibold text-text-secondary flex-shrink-0" title={personaName}>
        {initials}
      </div>
      <div className="flex items-center gap-1 px-3.5 py-2.5 bg-white border border-border rounded-xl rounded-bl-sm w-fit">
        {[0, 200, 400].map((delay) => (
          <span
            key={delay}
            className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-pulse"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
