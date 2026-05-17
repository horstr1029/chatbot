import type { RetrievedChunk } from './retrieve'

export type CitationSource = {
  id: string
  name: string
  url: string
  text: string   // first/best chunk text for preview
}

export type BuiltContext = {
  contextBlock: string
  citations: CitationSource[]
}

export function buildContext(chunks: RetrievedChunk[]): BuiltContext {
  if (chunks.length === 0) {
    return { contextBlock: '', citations: [] }
  }

  const seen = new Set<string>()
  const citations: CitationSource[] = []

  const sections = chunks.map((chunk, i) => {
    if (!seen.has(chunk.sourceId)) {
      seen.add(chunk.sourceId)
      citations.push({
        id: chunk.sourceId,
        name: chunk.sourceName,
        url: chunk.sourceUrl,
        text: chunk.text,
      })
    }
    return `[${i + 1}] Source: ${chunk.sourceName}\n${chunk.text}`
  })

  const contextBlock = `## Relevant documents:\n\n${sections.join('\n\n---\n\n')}`

  return { contextBlock, citations }
}
