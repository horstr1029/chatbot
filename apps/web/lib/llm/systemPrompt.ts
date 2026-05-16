import type { Department } from '@prisma/client'
import type { BuiltContext } from '@/lib/rag/buildContext'

export function buildSystemPrompt(dept: Department, context: BuiltContext, workflowSummary = ''): string {
  const parts: string[] = []

  if (dept.systemPrompt) {
    parts.push(dept.systemPrompt)
    parts.push('')
  }

  parts.push(
    `You are an assistant for the ${dept.name} department.`,
    'Answer questions based only on the provided company documents.',
    'If the answer is not in the documents, say so clearly.',
    'Always cite the source document name when using information from it.',
  )

  if (context.contextBlock) {
    parts.push('', context.contextBlock)
  }

  if (workflowSummary) {
    parts.push('', `## Available workflow actions:\n${workflowSummary}`)
  }

  return parts.join('\n')
}
