'use client'

import { useRef, useEffect, useImperativeHandle, forwardRef, type KeyboardEvent, type ChangeEvent } from 'react'

interface ComposerProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  isLoading: boolean
  deptName: string
}

export interface ComposerHandle {
  focus: () => void
}

export const Composer = forwardRef<ComposerHandle, ComposerProps>(function Composer(
  { value, onChange, onSubmit, isLoading, deptName },
  ref
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useImperativeHandle(ref, () => ({ focus: () => textareaRef.current?.focus() }))

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  function autoResize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  function handleInput(e: ChangeEvent<HTMLTextAreaElement>) {
    onChange(e.target.value)
    autoResize()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim() && !isLoading) onSubmit()
    }
  }

  return (
    <div className="border-t border-border bg-white px-5 py-3.5" onClick={() => textareaRef.current?.focus()}>
      <div className="border border-border rounded-lg bg-white flex items-end gap-2 px-2.5 py-2 focus-within:border-blue-300 transition-colors">
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
          <button
            type="button"
            disabled={!value.trim() || isLoading}
            onClick={onSubmit}
            className="w-[30px] h-[30px] rounded-md bg-gray-900 flex items-center justify-center text-white hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
      <p className="text-[11px] text-text-muted text-center mt-1.5">
        Only searches {deptName} department documents
      </p>
    </div>
  )
})
