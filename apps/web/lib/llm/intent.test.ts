import type { Department } from '@prisma/client'

const mockCreate = jest.fn()
jest.mock('./router', () => ({
  getLLMClient: jest.fn().mockReturnValue({
    type: 'anthropic',
    client: {
      messages: { create: mockCreate },
    },
  }),
}))

import { detectIntent } from './intent'

const dept = { id: 'dept-1', llmModel: 'claude-sonnet-4-20250514' } as Department

function mockResponse(label: string) {
  mockCreate.mockResolvedValue({
    content: [{ text: label }],
  })
}

const cases: Array<[string, string, 'DOC_QUESTION' | 'WORKFLOW_REQUEST' | 'GENERAL_CHAT']> = [
  ['what is the leave policy', 'DOC_QUESTION', 'DOC_QUESTION'],
  ['how many days off do I have', 'DOC_QUESTION', 'DOC_QUESTION'],
  ['explain the onboarding process', 'DOC_QUESTION', 'DOC_QUESTION'],
  ['create a workflow to send weekly reports', 'WORKFLOW_REQUEST', 'WORKFLOW_REQUEST'],
  ['set up an automation to alert HR on new hires', 'WORKFLOW_REQUEST', 'WORKFLOW_REQUEST'],
  ['automate invoice approval', 'WORKFLOW_REQUEST', 'WORKFLOW_REQUEST'],
  ['trigger a notification when a file is uploaded', 'WORKFLOW_REQUEST', 'WORKFLOW_REQUEST'],
  ['hello', 'GENERAL_CHAT', 'GENERAL_CHAT'],
  ['thanks', 'GENERAL_CHAT', 'GENERAL_CHAT'],
  ['what can you do', 'GENERAL_CHAT', 'GENERAL_CHAT'],
]

describe('detectIntent', () => {
  afterEach(() => jest.clearAllMocks())

  it.each(cases)(
    'should classify "%s" as %s',
    async (message, mockedLabel, expectedIntent) => {
      mockResponse(mockedLabel)
      const result = await detectIntent(message, dept)
      expect(result).toBe(expectedIntent)
    }
  )

  it('should fall back to GENERAL_CHAT for unrecognised labels', async () => {
    mockResponse('SOMETHING_UNKNOWN')
    const result = await detectIntent('some message', dept)
    expect(result).toBe('GENERAL_CHAT')
  })
})
