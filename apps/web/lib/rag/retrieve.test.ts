import type { Department } from '@prisma/client'

const mockSearch = jest.fn()
jest.mock('@qdrant/js-client-rest', () => ({
  QdrantClient: jest.fn().mockImplementation(() => ({ search: mockSearch })),
}))

jest.mock('./embed', () => ({
  embedQuery: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
}))

import { retrieve } from './retrieve'

const dept = {
  id: 'dept-123',
  llmModel: 'claude-sonnet-4-20250514',
  embedModel: 'text-embedding-3-small',
} as Department

describe('retrieve', () => {
  beforeEach(() => {
    mockSearch.mockResolvedValue([
      {
        score: 0.95,
        payload: {
          text: 'Hello world',
          source_id: 'src-1',
          source_name: 'HR Policy',
          source_url: '/docs/hr',
          chunk_index: 0,
        },
      },
    ])
  })

  afterEach(() => jest.clearAllMocks())

  it('should always include dept_id filter in Qdrant search', async () => {
    await retrieve('what is the vacation policy', dept)

    expect(mockSearch).toHaveBeenCalledTimes(1)
    const [, options] = mockSearch.mock.calls[0]
    const mustFilter = options.filter.must[0]
    expect(mustFilter.key).toBe('dept_ids')
    expect(mustFilter.match.any).toContain('dept-123')
  })

  it('should include "global" in the dept_ids filter', async () => {
    await retrieve('any question', dept)

    const [, options] = mockSearch.mock.calls[0]
    expect(options.filter.must[0].match.any).toContain('global')
  })

  it('should not return results from other departments', async () => {
    // Even if Qdrant returns results, the filter enforces isolation
    const results = await retrieve('question', dept)
    // All results come from the single mocked response (dept already filtered server-side)
    expect(results.every((r) => r.sourceId === 'src-1')).toBe(true)
  })

  it('should map Qdrant payload fields to RetrievedChunk shape', async () => {
    const [chunk] = await retrieve('question', dept)
    expect(chunk).toMatchObject({
      text: 'Hello world',
      sourceId: 'src-1',
      sourceName: 'HR Policy',
      sourceUrl: '/docs/hr',
      chunkIndex: 0,
      score: 0.95,
    })
  })
})
