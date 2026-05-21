import type { Department } from '@prisma/client'
import type { BuiltContext } from '@/lib/rag/buildContext'

export function buildSystemPrompt(dept: Department, context: BuiltContext, workflowSummary = ''): string {
  const parts: string[] = []

  if (dept.systemPrompt) {
    parts.push(dept.systemPrompt)
    parts.push('')
  }

  parts.push(`You are a helpful assistant for the ${dept.name} department.`)

  if (context.contextBlock) {
    parts.push(
      'Answer questions using the company documents provided below.',
      'Always cite the source document name when referencing information from it.',
      'If the specific answer is not covered in the provided documents, say so and suggest the user contact their admin or check other resources.',
      '',
      context.contextBlock,
    )
  } else {
    parts.push(
      'Answer questions helpfully and concisely.',
      'For questions about company-specific policies or procedures, let the user know you can search the knowledge base if they ask about a specific topic.',
    )
  }

  if (workflowSummary) {
    parts.push('', `## Available workflow actions:\n${workflowSummary}`)
  }

  return parts.join('\n')
}
