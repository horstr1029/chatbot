'use client'

export type Citation = { id: string; name: string; url: string }

interface CitationChipProps {
  citation: Citation
}

export function CitationChip({ citation }: CitationChipProps) {
  return (
    <a
      href={citation.url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[11px] px-2 py-1 bg-surface-secondary border border-border rounded text-text-secondary hover:bg-brand-50 hover:border-brand-100 hover:text-brand-700 transition-colors"
    >
      <svg className="w-3 h-3 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      {citation.name}
    </a>
  )
}
