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

  const [form, setForm] = useState({
    systemPrompt: dept.systemPrompt ?? '',
    llmModel: dept.llmModel,
    embedModel: dept.embedModel,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const isDirty =
    form.systemPrompt !== (dept.systemPrompt ?? '') ||
    form.llmModel !== dept.llmModel ||
    form.embedModel !== dept.embedModel

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
    </div>
  )
}
