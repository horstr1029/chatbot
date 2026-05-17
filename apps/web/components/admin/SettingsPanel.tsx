'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface DeptConfig {
  id: string
  name: string
  systemPrompt: string | null
  llmModel: string
  embedModel: string
  widgetToken: string | null
  slackWebhookUrl: string | null
}

interface ApprovalChainStep {
  stepOrder: number
  label: string
  deptId: string
}

interface DeptOption {
  id: string
  name: string
}

interface SettingsPanelProps {
  dept: DeptConfig
}

const EMBED_MODELS = [
  { value: 'nomic-embed-text', label: 'nomic-embed-text' },
  { value: 'mxbai-embed-large', label: 'mxbai-embed-large' },
]

interface OllamaModel { name: string }

export function SettingsPanel({ dept }: SettingsPanelProps) {
  const router = useRouter()
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([])
  const [ollamaAvailable, setOllamaAvailable] = useState<boolean | null>(null)
  const [widgetToken, setWidgetToken] = useState<string | null>(dept.widgetToken)
  const [tokenLoading, setTokenLoading] = useState(false)
  const [tokenCopied, setTokenCopied] = useState(false)
  const [digestSending, setDigestSending] = useState(false)
  const [digestSent, setDigestSent] = useState(false)

  // Approval chain state
  const [chainSteps, setChainSteps] = useState<ApprovalChainStep[]>([])
  const [allDepts, setAllDepts] = useState<DeptOption[]>([])
  const [chainLoading, setChainLoading] = useState(false)
  const [chainSaving, setChainSaving] = useState(false)
  const [chainSaved, setChainSaved] = useState(false)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const embedSnippet = widgetToken
    ? `<iframe\n  src="${appUrl}/embed/${widgetToken}"\n  width="380"\n  height="600"\n  style="border:none;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.12);"\n></iframe>`
    : ''

  async function generateToken() {
    setTokenLoading(true)
    const res = await fetch('/api/admin/embed-token', { method: 'POST' })
    const { data } = await res.json()
    setWidgetToken(data.token)
    setTokenLoading(false)
  }

  async function revokeToken() {
    setTokenLoading(true)
    await fetch('/api/admin/embed-token', { method: 'DELETE' })
    setWidgetToken(null)
    setTokenLoading(false)
  }

  async function copySnippet() {
    await navigator.clipboard.writeText(embedSnippet)
    setTokenCopied(true)
    setTimeout(() => setTokenCopied(false), 2000)
  }

  async function sendDigestNow() {
    setDigestSending(true)
    await fetch('/api/admin/digest', { method: 'POST' })
    setDigestSending(false)
    setDigestSent(true)
    setTimeout(() => setDigestSent(false), 3000)
  }

  useEffect(() => {
    fetch('/api/ollama/models')
      .then((r) => r.json())
      .then((res) => {
        setOllamaAvailable(res.data?.available ?? false)
        setOllamaModels(res.data?.models ?? [])
      })
      .catch(() => setOllamaAvailable(false))
  }, [])

  useEffect(() => {
    setChainLoading(true)
    Promise.all([
      fetch('/api/admin/approval-chain').then((r) => r.json()),
      fetch('/api/departments').then((r) => r.json()),
    ])
      .then(([chainRes, deptsRes]) => {
        setChainSteps(Array.isArray(chainRes.data) ? (chainRes.data as ApprovalChainStep[]) : [])
        setAllDepts(
          Array.isArray(deptsRes.data)
            ? (deptsRes.data as { id: string; name: string }[]).map((d) => ({ id: d.id, name: d.name }))
            : [],
        )
      })
      .catch(() => {})
      .finally(() => setChainLoading(false))
  }, [])

  const [form, setForm] = useState({
    systemPrompt: dept.systemPrompt ?? '',
    llmModel: dept.llmModel,
    embedModel: dept.embedModel,
    slackWebhookUrl: dept.slackWebhookUrl ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const isDirty =
    form.systemPrompt !== (dept.systemPrompt ?? '') ||
    form.llmModel !== dept.llmModel ||
    form.embedModel !== dept.embedModel ||
    form.slackWebhookUrl !== (dept.slackWebhookUrl ?? '')

  async function handleSave() {
    setSaving(true)
    await fetch(`/api/departments/${dept.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    router.refresh()
  }

  function addChainStep() {
    const nextOrder = chainSteps.length > 0
      ? Math.max(...chainSteps.map((s) => s.stepOrder)) + 1
      : 1
    setChainSteps((prev) => [
      ...prev,
      { stepOrder: nextOrder, label: '', deptId: allDepts[0]?.id ?? '' },
    ])
  }

  function removeChainStep(index: number) {
    setChainSteps((prev) => {
      const updated = prev.filter((_, i) => i !== index)
      return updated.map((s, i) => ({ ...s, stepOrder: i + 1 }))
    })
  }

  function moveChainStep(index: number, direction: 'up' | 'down') {
    setChainSteps((prev) => {
      const next = [...prev]
      const swapIdx = direction === 'up' ? index - 1 : index + 1
      if (swapIdx < 0 || swapIdx >= next.length) return prev
      const temp = next[index]
      next[index] = next[swapIdx]
      next[swapIdx] = temp
      return next.map((s, i) => ({ ...s, stepOrder: i + 1 }))
    })
  }

  function updateChainStep(index: number, field: keyof ApprovalChainStep, value: string | number) {
    setChainSteps((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  async function saveChain() {
    setChainSaving(true)
    await fetch('/api/admin/approval-chain', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ steps: chainSteps }),
    })
    setChainSaving(false)
    setChainSaved(true)
    setTimeout(() => setChainSaved(false), 2000)
  }

  return (
    <div className="space-y-5">
      <div className="bg-white border border-border rounded-lg p-5 space-y-4">
        <p className="text-[13px] font-semibold text-text-primary">LLM Configuration</p>

        <div>
          <label className="text-[13px] font-medium text-text-primary mb-1 block">Language model</label>
          <div className="flex items-center gap-2">
            <select
              value={form.llmModel}
              onChange={(e) => setForm((f) => ({ ...f, llmModel: e.target.value }))}
              className="flex-1 rounded-md border border-border px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-brand-600"
            >
              {ollamaModels.length > 0 ? (
                ollamaModels.map((m) => (
                  <option key={m.name} value={m.name}>{m.name}</option>
                ))
              ) : (
                <option value={form.llmModel}>{form.llmModel}</option>
              )}
            </select>
            <span className="text-[11px] font-medium px-2 py-1 rounded whitespace-nowrap bg-surface-tertiary text-text-secondary">
              {ollamaAvailable === false ? 'Offline' : 'Local'}
            </span>
          </div>
          {ollamaAvailable === false && (
            <p className="text-[12px] text-amber-600 mt-1">
              Ollama is unreachable. Check that it is running on the server.
            </p>
          )}
        </div>

        <div>
          <label className="text-[13px] font-medium text-text-primary mb-1 block">Embedding model</label>
          <select
            value={form.embedModel}
            onChange={(e) => setForm((f) => ({ ...f, embedModel: e.target.value }))}
            className="w-full rounded-md border border-border px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-brand-600"
          >
            {EMBED_MODELS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white border border-border rounded-lg p-5 space-y-3">
        <div>
          <p className="text-[13px] font-semibold text-text-primary">System Prompt</p>
          <p className="text-[12px] text-text-muted mt-0.5">
            Injected at the start of every chat in this department.
          </p>
        </div>
        <textarea
          rows={8}
          value={form.systemPrompt}
          onChange={(e) => setForm((f) => ({ ...f, systemPrompt: e.target.value }))}
          className="w-full rounded-md border border-border px-3 py-2 text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent resize-none"
          placeholder="You are a helpful assistant for the HR department..."
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          disabled={!isDirty || saving}
          onClick={handleSave}
          className="px-4 py-2 rounded-md bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {saved && (
          <span className="text-[13px] text-green-600 font-medium">Saved</span>
        )}
      </div>

      {/* Embeddable widget */}
      <div className="bg-white border border-border rounded-lg p-5 space-y-3">
        <div>
          <p className="text-[13px] font-semibold text-text-primary">Embeddable widget</p>
          <p className="text-[12px] text-text-muted mt-0.5">
            Drop the snippet below into your intranet to embed this chatbot.
          </p>
        </div>
        {widgetToken ? (
          <>
            <pre className="bg-surface-tertiary rounded-md p-3 text-[11px] text-text-secondary overflow-x-auto whitespace-pre-wrap break-all font-mono">
              {embedSnippet}
            </pre>
            <div className="flex items-center gap-2">
              <button
                onClick={copySnippet}
                className="px-3 py-1.5 rounded-md border border-border text-[12px] font-medium text-text-secondary hover:bg-surface-tertiary transition-colors"
              >
                {tokenCopied ? 'Copied!' : 'Copy snippet'}
              </button>
              <button
                onClick={generateToken}
                disabled={tokenLoading}
                className="px-3 py-1.5 rounded-md border border-border text-[12px] font-medium text-text-secondary hover:bg-surface-tertiary transition-colors disabled:opacity-50"
              >
                Regenerate token
              </button>
              <button
                onClick={revokeToken}
                disabled={tokenLoading}
                className="px-3 py-1.5 rounded-md text-[12px] font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                Revoke
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={generateToken}
            disabled={tokenLoading}
            className="px-4 py-2 rounded-md bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {tokenLoading ? 'Generating…' : 'Generate embed token'}
          </button>
        )}
      </div>

      {/* Slack notifications */}
      <div className="bg-white border border-border rounded-lg p-5 space-y-3">
        <div>
          <p className="text-[13px] font-semibold text-text-primary">Slack notifications</p>
          <p className="text-[12px] text-text-muted mt-0.5">
            Workflow approvals and rejections will be posted to this channel webhook.
          </p>
        </div>
        <div>
          <label className="text-[13px] font-medium text-text-primary mb-1 block">Incoming webhook URL</label>
          <input
            value={form.slackWebhookUrl}
            onChange={(e) => setForm((f) => ({ ...f, slackWebhookUrl: e.target.value }))}
            className="w-full rounded-md border border-border px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
            placeholder="https://hooks.slack.com/services/..."
          />
        </div>
      </div>

      {/* Weekly digest */}
      <div className="bg-white border border-border rounded-lg p-5 space-y-3">
        <div>
          <p className="text-[13px] font-semibold text-text-primary">Weekly email digest</p>
          <p className="text-[12px] text-text-muted mt-0.5">
            A summary of conversations and feedback is sent to dept admins every Monday at 8am.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={sendDigestNow}
            disabled={digestSending}
            className="px-4 py-2 rounded-md border border-border text-[13px] font-medium text-text-secondary hover:bg-surface-tertiary transition-colors disabled:opacity-50"
          >
            {digestSending ? 'Queueing…' : 'Send digest now'}
          </button>
          {digestSent && (
            <span className="text-[13px] text-green-600 font-medium">Queued — check your inbox shortly.</span>
          )}
        </div>
      </div>

      {/* Approval chain */}
      <div className="bg-white border border-border rounded-lg p-5 space-y-3">
        <div>
          <p className="text-[13px] font-semibold text-text-primary">Approval chain</p>
          <p className="text-[12px] text-text-muted mt-0.5">
            Configure sequential approvals for workflow requests. If empty, a single-step approval by this department's admin is used.
          </p>
        </div>

        {chainLoading ? (
          <p className="text-[13px] text-text-muted">Loading…</p>
        ) : (
          <>
            {chainSteps.length === 0 ? (
              <p className="text-[12px] text-text-muted italic">No approval chain configured — single-step approval active.</p>
            ) : (
              <div className="space-y-2">
                {chainSteps.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2.5 rounded-md border border-border bg-surface-secondary">
                    <span className="w-5 h-5 rounded-full bg-brand-600 text-white text-[10px] font-semibold flex items-center justify-center flex-shrink-0">
                      {step.stepOrder}
                    </span>
                    <input
                      value={step.label}
                      onChange={(e) => updateChainStep(idx, 'label', e.target.value)}
                      placeholder="Step label (e.g. Line Manager)"
                      className="flex-1 rounded border border-border px-2 py-1 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-600 bg-white"
                    />
                    <select
                      value={step.deptId}
                      onChange={(e) => updateChainStep(idx, 'deptId', e.target.value)}
                      className="rounded border border-border px-2 py-1 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-600 bg-white"
                    >
                      {allDepts.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => moveChainStep(idx, 'up')}
                        disabled={idx === 0}
                        title="Move up"
                        className="w-6 h-6 flex items-center justify-center rounded text-text-muted hover:bg-white hover:text-text-secondary disabled:opacity-30 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => moveChainStep(idx, 'down')}
                        disabled={idx === chainSteps.length - 1}
                        title="Move down"
                        className="w-6 h-6 flex items-center justify-center rounded text-text-muted hover:bg-white hover:text-text-secondary disabled:opacity-30 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => removeChainStep(idx)}
                        title="Remove step"
                        className="w-6 h-6 flex items-center justify-center rounded text-text-muted hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={addChainStep}
                className="px-3 py-1.5 rounded-md border border-border text-[12px] font-medium text-text-secondary hover:bg-surface-tertiary transition-colors"
              >
                + Add step
              </button>
              <button
                onClick={saveChain}
                disabled={chainSaving}
                className="px-4 py-2 rounded-md bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {chainSaving ? 'Saving…' : 'Save chain'}
              </button>
              {chainSaved && (
                <span className="text-[13px] text-green-600 font-medium">Saved</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
