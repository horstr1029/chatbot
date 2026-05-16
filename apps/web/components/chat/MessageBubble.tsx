'use client'

import { CitationChip, type Citation } from './CitationChip'

interface MessageBubbleProps {
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
  initials?: string
  isStreaming?: boolean
}

export function MessageBubble({ role, content, citations = [], initials = 'U', isStreaming }: MessageBubbleProps) {
  if (role === 'user') {
    return (
      <div className="flex items-start gap-2.5 max-w-[88%] self-end flex-row-reverse">
        <div className="w-7 h-7 rounded-full bg-brand-600 text-white text-[11px] font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
          {initials}
        </div>
        <div className="bg-brand-600 text-white rounded-xl rounded-br-sm px-3.5 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2.5 max-w-[88%]">
      <div className="w-7 h-7 rounded-full bg-surface-tertiary border border-border flex items-center justify-center text-[11px] font-semibold text-text-secondary flex-shrink-0 mt-0.5">
        AI
      </div>
      <div>
        <div className="bg-white border border-border rounded-xl rounded-bl-sm px-3.5 py-2.5 text-[13.5px] leading-relaxed text-text-primary whitespace-pre-wrap">
          {content}
          {isStreaming && <span className="inline-block w-0.5 h-3.5 bg-text-muted ml-0.5 animate-pulse" />}
        </div>
        {citations.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {citations.map((c) => <CitationChip key={c.id} citation={c} />)}
          </div>
        )}
      </div>
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-7 h-7 rounded-full bg-surface-tertiary border border-border flex items-center justify-center text-[11px] font-semibold text-text-secondary flex-shrink-0">
        AI
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
