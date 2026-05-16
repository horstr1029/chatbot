const N8N_BASE = process.env.N8N_BASE_URL ?? 'http://localhost:5678'
const N8N_API_KEY = process.env.N8N_API_KEY ?? ''

function headers() {
  return {
    'Content-Type': 'application/json',
    'X-N8N-API-KEY': N8N_API_KEY,
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${N8N_BASE}/api/v1${path}`, {
    ...init,
    headers: { ...headers(), ...(init?.headers ?? {}) },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`n8n API error ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

export type N8nWorkflow = {
  id: string
  name: string
  active: boolean
  tags: Array<{ id: string; name: string }>
  nodes: unknown[]
  connections: unknown
}

export type N8nExecution = {
  id: string
  workflowId: string
  status: string
  data?: { resultData?: { runData?: Record<string, unknown> } }
}

export const n8nClient = {
  async createWorkflow(workflow: Omit<N8nWorkflow, 'id'>): Promise<N8nWorkflow> {
    return request<N8nWorkflow>('/workflows', {
      method: 'POST',
      body: JSON.stringify({ ...workflow, active: false }),
    })
  },

  async getWorkflow(id: string): Promise<N8nWorkflow> {
    return request<N8nWorkflow>(`/workflows/${id}`)
  },

  async getWorkflowsByTag(tag: string): Promise<N8nWorkflow[]> {
    const res = await request<{ data: N8nWorkflow[] }>(`/workflows?tags=${encodeURIComponent(tag)}`)
    return res.data ?? []
  },

  async activateWorkflow(id: string): Promise<N8nWorkflow> {
    return request<N8nWorkflow>(`/workflows/${id}/activate`, { method: 'POST' })
  },

  async deleteWorkflow(id: string): Promise<void> {
    await request(`/workflows/${id}`, { method: 'DELETE' })
  },

  async getExecutionResumeUrl(executionId: string): Promise<string> {
    return `${N8N_BASE}/webhook/resume/${executionId}`
  },

  async resumeExecution(resumeUrl: string, payload: Record<string, unknown>): Promise<void> {
    const res = await fetch(resumeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`n8n resume error ${res.status}`)
  },
}
