import type { RetrievedChunk } from './retrieve'

export type CitationSource = {
  id: string
  name: string
  url: string
  text: string
  imageBase64?: string
  imageMediaType?: string
}

export type BuiltContext = {
  contextBlock: string
  citations: CitationSource[]
  avgScore: number | null
}

export function buildContext(chunks: RetrievedChunk[]): BuiltContext {
  if (chunks.length === 0) {
    return { contextBlock: '', citations: [], avgScore: null }
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
        imageBase64: chunk.imageBase64,
        imageMediaType: chunk.imageMediaType,
      })
    }
    return `[${i + 1}] Source: ${chunk.sourceName}\n${chunk.text}`
  })

  const contextBlock = `## Relevant documents:\n\n${sections.join('\n\n---\n\n')}`
  const avgScore = chunks.length > 0
    ? Math.round((chunks.reduce((sum, c) => sum + c.score, 0) / chunks.length) * 100) / 100
    : null

  return { contextBlock, citations, avgScore }
}
