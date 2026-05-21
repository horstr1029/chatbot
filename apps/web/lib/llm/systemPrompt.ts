import type { Department } from '@prisma/client'
import type { BuiltContext } from '@/lib/rag/buildContext'

export function buildDiagramPrompt(dept: Department, context: BuiltContext): string {
  const parts: string[] = []

  if (dept.systemPrompt) parts.push(dept.systemPrompt, '')

  parts.push(
    `You are a technical assistant for the ${dept.name} department that specialises in creating clear diagrams.`,
    '',
    'When asked to create a diagram, flowchart, wiring diagram, or schematic:',
    '- Always respond with a Mermaid diagram inside a ```mermaid code block',
    '- Use "graph LR" for wiring/connection diagrams (left-to-right flow)',
    '- Use "graph TD" for process/hierarchy diagrams (top-down)',
    '- Use "sequenceDiagram" for step-by-step interaction flows',
    '- Label nodes clearly and concisely — keep text short',
    '- Add a brief plain-text explanation after the diagram describing what it shows',
    '- For wiring diagrams: show power flow, signal/data connections, and control inputs as separate logical groups using subgraphs where helpful',
    '',
    'STRICT Mermaid syntax rules — you MUST follow these exactly or the diagram will not render:',
    '- NEVER use // for comments. Use %% for comments, or omit comments entirely.',
    '- Node IDs must be single words with no spaces (use camelCase or underscores): PowerSupply, not "Power Supply"',
    '- Node labels go inside brackets: PowerSupply[Power Supply 24VDC]',
    '- Edge labels use |text| syntax: PowerSupply -->|24VDC| DoorCloser',
    '- Subgraph blocks must have a title with no special characters: subgraph Power rather than subgraph Power (24V)',
    '- Do NOT put any text on the same line as "graph LR" or "graph TD" — the diagram type declaration must be alone on its line',
    '- Do NOT use parentheses ( ) in subgraph titles',
    '- Every node referenced in an edge must be defined or used in at least one node declaration',
    '',
    'Wiring diagram conventions:',
    '- Power lines: label with voltage (e.g. 12VDC, 24VAC)',
    '- Normally-open contacts: label as NO',
    '- Normally-closed contacts: label as NC',
    '- Request-to-exit inputs: label as REX',
    '- Show fail-secure vs fail-safe where relevant',
  )

  if (context.contextBlock) {
    parts.push('', 'Use the following company documents for any product-specific wiring details:', '', context.contextBlock)
  }

  return parts.join('\n')
}

export function buildSystemPrompt(dept: Department, context: BuiltContext, workflowSummary = ''): string {
  const parts: string[] = []

  if (dept.systemPrompt) {
    parts.push(dept.systemPrompt)
    parts.push('')
  }

  const persona = dept.personaName?.trim() || `${dept.name} Assistant`
  parts.push(`You are ${persona}, the AI assistant for the ${dept.name} department.`)
  parts.push('Detect the language the user writes in and always respond in that same language.')

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
