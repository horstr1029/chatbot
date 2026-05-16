import { n8nClient, type N8nWorkflow } from './client'

export type WorkflowTemplate = {
  id: string
  name: string
  description: string
  nodeTypes: string[]
}

export async function getTemplatesForDept(deptId: string): Promise<WorkflowTemplate[]> {
  try {
    const workflows = await n8nClient.getWorkflowsByTag(`dept:${deptId}`)
    return workflows.map(workflowToTemplate)
  } catch {
    return []
  }
}

export function summariseTemplates(templates: WorkflowTemplate[]): string {
  if (templates.length === 0) return 'No workflow templates available.'
  return templates
    .map((t) => `- ${t.name}: ${t.description}`)
    .join('\n')
}

function workflowToTemplate(w: N8nWorkflow): WorkflowTemplate {
  const nodeTypes = Array.isArray(w.nodes)
    ? Array.from(new Set((w.nodes as Array<{ type?: string }>).map((n) => n.type ?? '').filter(Boolean)))
    : []

  return {
    id: w.id,
    name: w.name,
    description: `Template with ${nodeTypes.length} node type(s)`,
    nodeTypes,
  }
}
