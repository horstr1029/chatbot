export type WebSearchResult = {
  id: string
  title: string
  url: string
  content: string
}

export async function searchWeb(query: string, maxResults = 5): Promise<WebSearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) {
    process.stderr.write('[search] TAVILY_API_KEY not set — skipping web search\n')
    return []
  }

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'basic',
        max_results: maxResults,
        include_answer: false,
      }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      process.stderr.write(`[search] Tavily returned ${res.status}\n`)
      return []
    }

    const data = await res.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.results ?? []).map((r: any, i: number) => ({
      id: `web-${i}`,
      title: r.title ?? 'Web result',
      url: r.url ?? '',
      content: r.content ?? '',
    }))
  } catch (err) {
    process.stderr.write(`[search] Tavily fetch error: ${err instanceof Error ? err.message : String(err)}\n`)
    return []
  }
}

export function buildWebContext(results: WebSearchResult[]): {
  contextBlock: string
  citations: { id: string; name: string; url: string; text: string }[]
} {
  if (results.length === 0) return { contextBlock: '', citations: [] }

  const citations = results.map((r) => ({
    id: r.id,
    name: r.title,
    url: r.url,
    text: r.content.slice(0, 200),
  }))

  const sections = results.map((r, i) =>
    `[${i + 1}] Source: ${r.title}\nURL: ${r.url}\n${r.content}`
  )
  const contextBlock = `## Web search results:\n\n${sections.join('\n\n---\n\n')}`

  return { contextBlock, citations }
}
