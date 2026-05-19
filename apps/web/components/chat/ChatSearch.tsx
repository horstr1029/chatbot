'use client'

import { useEffect, useRef } from 'react'

interface ChatSearchProps {
  query: string
  matchCount: number
  currentMatch: number
  onChange: (q: string) => void
  onPrev: () => void
  onNext: () => void
  onClose: () => void
}

export function ChatSearch({ query, matchCount, currentMatch, onChange, onPrev, onNext, onClose }: ChatSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onClose()
    if (e.key === 'Enter') e.shiftKey ? onPrev() : onNext()
  }

  return (
    <div className="border-t border-border bg-surface px-5 py-2 flex items-center gap-2">
      <svg className="w-3.5 h-3.5 text-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search in conversation…"
        className="flex-1 text-[13px] bg-transparent outline-none text-text-primary placeholder:text-text-muted"
      />
      {query.length > 0 && (
        <span className="text-[11px] text-text-muted flex-shrink-0">
          {matchCount === 0 ? 'No matches' : `${currentMatch + 1} / ${matchCount}`}
        </span>
      )}
      <div className="flex items-center gap-0.5">
        <button
          onClick={onPrev}
          disabled={matchCount === 0}
          title="Previous match (Shift+Enter)"
          className="w-6 h-6 flex items-center justify-center rounded text-text-muted hover:bg-surface-secondary hover:text-text-secondary disabled:opacity-30 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <button
          onClick={onNext}
          disabled={matchCount === 0}
          title="Next match (Enter)"
          className="w-6 h-6 flex items-center justify-center rounded text-text-muted hover:bg-surface-secondary hover:text-text-secondary disabled:opacity-30 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      <button
        onClick={onClose}
        title="Close search (Esc)"
        className="w-6 h-6 flex items-center justify-center rounded text-text-muted hover:bg-surface-secondary hover:text-text-secondary transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
