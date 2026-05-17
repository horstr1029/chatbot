'use client'

import { useEffect, useState } from 'react'

interface DocSource {
  id: string
  name: string
  sourceType: 'GOOGLE_DRIVE' | 'SHAREPOINT' | 'LOCAL'
  sourceUrl: string | null
  lastSynced: string | null
  createdAt: string
}

interface DocsPanelProps {
  open: boolean
  onClose: () => void
  deptId: string
  deptName: string
}

const sourceLabel = {
  GOOGLE_DRIVE: 'Google Drive',
  SHAREPOINT: 'SharePoint',
  LOCAL: 'Local folder',
}

function SourceIcon({ type }: { type: DocSource['sourceType'] }) {
  if (type === 'GOOGLE_DRIVE') {
    return (
      <svg className="w-4 h-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7l9-4 9 4v10l-9 4-9-4V7z" />
      </svg>
    )
  }
  if (type === 'SHAREPOINT') {
    return (
      <svg className="w-4 h-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
      </svg>
    )
  }
  return (
    <svg className="w-4 h-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  )
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function DocsPanel({ open, onClose, deptId, deptName }: DocsPanelProps) {
  const [sources, setSources] = useState<DocSource[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch(`/api/departments/${deptId}/sources`)
      .then((r) => r.json())
      .then(({ data }) => setSources(Array.isArray(data) ? data : []))
      .catch(() => setSources([]))
      .finally(() => setLoading(false))
  }, [open, deptId])

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-black/20" onClick={onClose} />
      )}

      <div
        className={`fixed top-0 right-0 h-full z-40 w-[340px] bg-white border-l border-border flex flex-col shadow-lg transition-transform duration-200 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="h-[52px] flex items-center px-5 gap-3 border-b border-border flex-shrink-0">
          <svg className="w-4 h-4 text-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="flex-1 text-[13px] font-semibold text-text-primary truncate">
            {deptName} documents
          </p>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:bg-surface-secondary hover:text-text-secondary transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading && (
            <div className="flex items-center justify-center h-20">
              <svg className="w-5 h-5 text-text-muted animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
          )}

          {!loading && sources.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <svg className="w-8 h-8 text-border mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-[13px] text-text-muted">No document sources configured</p>
            </div>
          )}

          {!loading && sources.length > 0 && (
            <ul className="flex flex-col gap-2">
              {sources.map((src) => (
                <li
                  key={src.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border bg-white hover:bg-surface-secondary transition-colors"
                >
                  <div className="w-8 h-8 rounded-md bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <SourceIcon type={src.sourceType} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-text-primary truncate">{src.name}</p>
                    <p className="text-[11px] text-text-muted mt-0.5">{sourceLabel[src.sourceType]}</p>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      {src.lastSynced ? `Synced ${timeAgo(src.lastSynced)}` : 'Not yet synced'}
                    </p>
                  </div>
                  {src.sourceUrl && (
                    <a
                      href={src.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-6 h-6 flex items-center justify-center rounded text-text-muted hover:text-brand-600 flex-shrink-0 mt-0.5"
                      title="Open source"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border">
          <p className="text-[11px] text-text-muted text-center">
            The chatbot searches all documents listed above
          </p>
        </div>
      </div>
    </>
  )
}
