'use client'

import { useEffect, useRef, useState } from 'react'

interface MermaidDiagramProps {
  definition: string
}

let mermaidReady = false

async function getMermaid() {
  const m = await import('mermaid')
  if (!mermaidReady) {
    m.default.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: {
        primaryColor: '#eff6ff',
        primaryTextColor: '#111827',
        primaryBorderColor: '#2563eb',
        lineColor: '#6b7280',
        secondaryColor: '#f3f4f6',
        tertiaryColor: '#ffffff',
        fontFamily: 'DM Sans, system-ui, sans-serif',
        fontSize: '13px',
      },
    })
    mermaidReady = true
  }
  return m.default
}

export function MermaidDiagram({ definition }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [svg, setSvg] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setError(null)
    setSvg(null)

    async function render() {
      try {
        const mermaid = await getMermaid()
        const id = `mermaid-${Math.random().toString(36).slice(2)}`
        const { svg: rendered } = await mermaid.render(id, definition.trim())
        if (!cancelled) setSvg(rendered)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to render diagram')
      }
    }

    render()
    return () => { cancelled = true }
  }, [definition])

  if (error) {
    return (
      <div className="my-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
        <p className="text-[12px] text-red-600 font-medium mb-1">Diagram error</p>
        <pre className="text-[11px] text-red-500 whitespace-pre-wrap">{error}</pre>
      </div>
    )
  }

  if (!svg) {
    return (
      <div className="my-3 h-24 rounded-lg border border-border bg-surface-secondary animate-pulse" />
    )
  }

  return (
    <div className="my-3 rounded-lg border border-border bg-white p-3 overflow-x-auto">
      <div
        ref={containerRef}
        className="flex justify-center"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  )
}
