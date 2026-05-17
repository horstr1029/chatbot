'use client'

import { useState, useRef } from 'react'

interface MeetingBriefModalProps {
  open: boolean
  onClose: () => void
  deptName: string
}

export function MeetingBriefModal({ open, onClose, deptName }: MeetingBriefModalProps) {
  const [title, setTitle] = useState('')
  const [agenda, setAgenda] = useState('')
  const [brief, setBrief] = useState('')
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  if (!open) return null

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || generating) return

    setBrief('')
    setGenerating(true)
    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/chat/meeting-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), agenda: agenda.trim() }),
        signal: abortRef.current.signal,
      })

      if (!res.ok || !res.body) {
        setBrief('Failed to generate brief. Please try again.')
        setGenerating(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        // Parse Vercel AI SDK data stream format (lines starting with "0:")
        for (const line of chunk.split('\n')) {
          if (line.startsWith('0:')) {
            try {
              const text = JSON.parse(line.slice(2)) as string
              accumulated += text
              setBrief(accumulated)
            } catch {
              // Skip malformed lines
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setBrief('Failed to generate brief. Please try again.')
      }
    } finally {
      setGenerating(false)
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(brief).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleClose() {
    abortRef.current?.abort()
    setTitle('')
    setAgenda('')
    setBrief('')
    setGenerating(false)
    onClose()
  }

  function handleReset() {
    abortRef.current?.abort()
    setBrief('')
    setGenerating(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl border border-border shadow-lg w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border flex-shrink-0">
          <div className="w-7 h-7 rounded-md bg-brand-50 border border-brand-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-semibold text-text-primary">Meeting prep brief</p>
            <p className="text-[11px] text-text-muted">{deptName}</p>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:bg-surface-secondary hover:text-text-secondary transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!brief && !generating ? (
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="text-[13px] font-medium text-text-primary mb-1 block">
                  Meeting title <span className="text-red-500">*</span>
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="e.g. Q2 Budget Review"
                  className="w-full rounded-md border border-border px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-[13px] font-medium text-text-primary mb-1 block">
                  Proposed agenda
                  <span className="text-[11px] text-text-muted font-normal ml-1">(optional)</span>
                </label>
                <textarea
                  value={agenda}
                  onChange={(e) => setAgenda(e.target.value)}
                  rows={3}
                  placeholder="List the main topics or questions you want to cover…"
                  className="w-full rounded-md border border-border px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={!title.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-md bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Generate brief
              </button>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold text-text-primary truncate flex-1 mr-3">{title}</p>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {brief && !generating && (
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1 text-[12px] text-text-secondary hover:text-text-primary px-2 py-1 rounded hover:bg-surface-secondary transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  )}
                  <button
                    onClick={handleReset}
                    className="text-[12px] text-text-secondary hover:text-text-primary px-2 py-1 rounded hover:bg-surface-secondary transition-colors"
                  >
                    New brief
                  </button>
                </div>
              </div>

              {generating && !brief && (
                <div className="flex items-center gap-2 py-4">
                  <div className="flex items-center gap-1">
                    {[0, 150, 300].map((d) => (
                      <span
                        key={d}
                        className="w-1.5 h-1.5 rounded-full bg-brand-600 animate-pulse"
                        style={{ animationDelay: `${d}ms` }}
                      />
                    ))}
                  </div>
                  <span className="text-[13px] text-text-muted">Researching documents…</span>
                </div>
              )}

              {brief && (
                <div className="bg-surface-secondary border border-border rounded-lg p-4 text-[13px] text-text-primary leading-relaxed whitespace-pre-wrap font-sans overflow-y-auto max-h-[400px]">
                  {brief}
                  {generating && (
                    <span className="inline-block w-1.5 h-4 bg-brand-600 animate-pulse ml-0.5 align-text-bottom" />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
