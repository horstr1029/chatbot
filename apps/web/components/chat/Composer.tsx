'use client'

import { useRef, useEffect, useImperativeHandle, forwardRef, useState, useCallback, type KeyboardEvent, type ChangeEvent } from 'react'

interface DocSource { id: string; name: string; sourceType: string }

interface ComposerProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  isLoading: boolean
  deptName: string
  deptId: string
}

export interface ComposerHandle {
  focus: () => void
}

export const Composer = forwardRef<ComposerHandle, ComposerProps>(function Composer(
  { value, onChange, onSubmit, isLoading, deptName, deptId },
  ref
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [recording, setRecording] = useState(false)
  const [sources, setSources] = useState<DocSource[]>([])
  const [mentionOpen, setMentionOpen] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionStart, setMentionStart] = useState(-1)
  const [mentionIndex, setMentionIndex] = useState(0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  useImperativeHandle(ref, () => ({ focus: () => textareaRef.current?.focus() }))

  useEffect(() => { textareaRef.current?.focus() }, [])

  // Fetch sources once for @mention
  const fetchSources = useCallback(async () => {
    if (sources.length > 0) return
    try {
      const res = await fetch(`/api/departments/${deptId}/sources`)
      if (res.ok) {
        const { data } = await res.json()
        setSources(Array.isArray(data) ? data : [])
      }
    } catch {}
  }, [deptId, sources.length])

  function autoResize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  function handleInput(e: ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    onChange(val)
    autoResize()

    // Detect @mention trigger
    const cursor = e.target.selectionStart ?? val.length
    const textBefore = val.slice(0, cursor)
    const atMatch = textBefore.match(/@(\w*)$/)
    if (atMatch) {
      fetchSources()
      setMentionStart(cursor - atMatch[0].length)
      setMentionQuery(atMatch[1])
      setMentionOpen(true)
      setMentionIndex(0)
    } else {
      setMentionOpen(false)
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionOpen) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex((i) => Math.min(i + 1, filteredSources.length - 1)); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIndex((i) => Math.max(i - 1, 0)); return }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); applyMention(filteredSources[mentionIndex]); return }
      if (e.key === 'Escape') { setMentionOpen(false); return }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim() && !isLoading) onSubmit()
    }
  }

  function applyMention(source: DocSource) {
    if (!source) return
    const before = value.slice(0, mentionStart)
    const after = value.slice(mentionStart + 1 + mentionQuery.length)
    const inserted = `@${source.name} `
    onChange(before + inserted + after)
    setMentionOpen(false)
    setTimeout(() => {
      const el = textareaRef.current
      if (!el) return
      const pos = before.length + inserted.length
      el.setSelectionRange(pos, pos)
      el.focus()
      autoResize()
    }, 0)
  }

  function toggleVoice() {
    if (recording) {
      recognitionRef.current?.stop()
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!SR) return
    const recognition = new SR()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognitionRef.current = recognition
    const base = value

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transcript = Array.from(e.results).map((r: any) => r[0].transcript).join('')
      onChange(base + (base && !base.endsWith(' ') ? ' ' : '') + transcript)
      autoResize()
    }
    recognition.onend = () => {
      setRecording(false)
      textareaRef.current?.focus()
    }
    recognition.onerror = () => setRecording(false)
    recognition.start()
    setRecording(true)
  }

  const filteredSources = sources.filter((s) =>
    s.name.toLowerCase().includes(mentionQuery.toLowerCase())
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hasSR = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in (window as any))

  return (
    <div className="border-t border-border bg-surface px-5 py-3.5 relative" onClick={() => textareaRef.current?.focus()}>
      {/* @mention dropdown */}
      {mentionOpen && filteredSources.length > 0 && (
        <div className="absolute bottom-full left-5 right-5 mb-1 bg-surface border border-border rounded-lg shadow-lg overflow-hidden z-10">
          <div className="px-3 py-1.5 border-b border-border">
            <p className="text-[11px] text-text-muted">Mention a document source</p>
          </div>
          {filteredSources.slice(0, 6).map((s, i) => (
            <button
              key={s.id}
              onMouseDown={(e) => { e.preventDefault(); applyMention(s) }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${i === mentionIndex ? 'bg-brand-50 text-brand-700' : 'text-text-secondary hover:bg-surface-secondary'}`}
            >
              <svg className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-[12.5px] font-medium flex-1 truncate">{s.name}</span>
              <span className="text-[10.5px] text-text-muted flex-shrink-0">{s.sourceType}</span>
            </button>
          ))}
        </div>
      )}

      <div className="border border-border rounded-lg bg-surface flex items-end gap-2 px-2.5 py-2 focus-within:border-blue-300 transition-colors">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Ask about docs or request a workflow…"
          disabled={isLoading}
          className="flex-1 border-none outline-none text-[13.5px] text-text-primary placeholder:text-text-muted resize-none bg-transparent font-sans leading-relaxed min-h-[22px] max-h-[120px] disabled:opacity-60"
        />
        <div className="flex items-center gap-1.5">
          {hasSR && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); toggleVoice() }}
              title={recording ? 'Stop recording' : 'Voice input'}
              className={`w-[30px] h-[30px] rounded-md flex items-center justify-center transition-colors ${
                recording
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'text-text-muted hover:bg-surface-secondary hover:text-text-secondary'
              }`}
            >
              <svg className="w-4 h-4" fill={recording ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
          )}
          <button
            type="button"
            disabled={!value.trim() || isLoading}
            onClick={(e) => { e.stopPropagation(); onSubmit() }}
            className="w-[30px] h-[30px] rounded-md bg-gray-900 flex items-center justify-center text-white hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
      <p className="text-[11px] text-text-muted text-center mt-1.5">
        Only searches {deptName} documents · type @ to mention a source
      </p>
    </div>
  )
})
