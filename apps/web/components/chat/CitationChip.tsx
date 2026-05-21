'use client'

import { useState, useRef, useEffect } from 'react'

export type Citation = {
  id: string
  name: string
  url: string
  text: string
  imageBase64?: string
  imageMediaType?: string
}

interface CitationChipProps {
  citation: Citation
}

export function CitationChip({ citation }: CitationChipProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isImage = Boolean(citation.imageBase64)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const imageSrc = citation.imageBase64
    ? `data:${citation.imageMediaType ?? 'image/png'};base64,${citation.imageBase64}`
    : null

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-[11px] px-2 py-1 bg-surface-secondary border border-border rounded text-text-secondary hover:bg-brand-50 hover:border-brand-100 hover:text-brand-700 transition-colors"
      >
        {isImage ? (
          <svg className="w-3 h-3 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ) : (
          <svg className="w-3 h-3 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}
        {citation.name}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 z-50 bg-white border border-border rounded-lg shadow-lg overflow-hidden"
          style={{ width: isImage ? '320px' : '288px' }}
        >
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface-secondary">
            {isImage ? (
              <svg className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            <p className="text-[12px] font-medium text-text-primary truncate flex-1">{citation.name}</p>
            {citation.url && (
              <a
                href={citation.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-text-muted hover:text-brand-600 flex-shrink-0"
                title="Open source"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
          {isImage && imageSrc ? (
            <div className="p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageSrc}
                alt={citation.name}
                className="w-full rounded object-contain max-h-64"
              />
              {citation.text && (
                <p className="text-[11px] text-text-muted mt-2 leading-relaxed">{citation.text}</p>
              )}
            </div>
          ) : (
            <div className="px-3 py-2.5 max-h-48 overflow-y-auto">
              <p className="text-[12px] text-text-secondary leading-relaxed whitespace-pre-wrap">
                {citation.text || 'No preview available.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
