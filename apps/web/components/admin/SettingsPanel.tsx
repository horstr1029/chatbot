'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface DeptConfig {
  id: string
  name: string
  systemPrompt: string | null
  llmModel: string
  embedModel: string
}

interface SettingsPanelProps {
  dept: DeptConfig
}

const CLOUD_MODELS = [
  { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4', badge: 'Cloud' },
  { value: 'claude-opus-4-20250514', label: 'Claude Opus 4', badge: 'Cloud' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', badge: 'Cloud' },
]

const EMBED_MODELS = [
  { value: 'text-embedding-3-small', label: 'OpenAI text-embedding-3-small', badge: 'Cloud' },
  { value: 'text-embedding-3-large', label: 'OpenAI text-embedding-3-large', badge: 'Cloud' },
  { value: 'nomic-embed-text', label: 'nomic-embed-text (Ollama)', badge: 'Local' },
]

interface OllamaModel { name: string }

export function SettingsPanel({ dept }: SettingsPanelProps) {
  const router = useRouter()
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([])
  const [ollamaAvailable, setOllamaAvailable] = useState<boolean | null>(null)

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

  const isCloudModel = CLOUD_MODELS.some((m) => m.value === form.llmModel)
  const selectedEmbed = EMBED_MODELS.find((m) => m.value === form.embedModel)

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
              <optgroup label="Cloud (Anthropic)">
                {CLOUD_MODELS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </optgroup>
              {ollamaAvailable === true && ollamaModels.length > 0 && (
                <optgroup label="Local (Ollama)">
                  {ollamaModels.map((m) => (
                    <option key={m.name} value={m.name}>{m.name}</option>
                  ))}
                </optgroup>
              )}
              {ollamaAvailable === false && !isCloudModel && (
                <optgroup label="Local (Ollama — unavailable)">
                  <option value={form.llmModel}>{form.llmModel}</option>
                </optgroup>
              )}
            </select>
            <span className={`text-[11px] font-medium px-2 py-1 rounded whitespace-nowrap ${
              isCloudModel
                ? 'bg-brand-50 text-brand-600'
                : 'bg-surface-tertiary text-text-secondary'
            }`}>
              {isCloudModel ? 'Cloud' : ollamaAvailable === false ? 'Local (offline)' : 'Local'}
            </span>
          </div>
          {ollamaAvailable === false && (
            <p className="text-[12px] text-amber-600 mt-1">
              Local AI model unavailable. Please contact your admin.
            </p>
          )}
        </div>

        <div>
          <label className="text-[13px] font-medium text-text-primary mb-1 block">Embedding model</label>
          <div className="flex items-center gap-2">
            <select
              value={form.embedModel}
              onChange={(e) => setForm((f) => ({ ...f, embedModel: e.target.value }))}
              className="flex-1 rounded-md border border-border px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-brand-600"
            >
              {EMBED_MODELS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            {selectedEmbed && (
              <span className={`text-[11px] font-medium px-2 py-1 rounded whitespace-nowrap ${
                selectedEmbed.badge === 'Cloud'
                  ? 'bg-brand-50 text-brand-600'
                  : 'bg-surface-tertiary text-text-secondary'
              }`}>
                {selectedEmbed.badge}
              </span>
            )}
          </div>
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
    </div>
  )
}
