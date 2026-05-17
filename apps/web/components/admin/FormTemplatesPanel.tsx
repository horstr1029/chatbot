'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { FormField } from '@/lib/llm/formFiller'

interface FormTemplateRow {
  id: string
  name: string
  fields: FormField[]
  active: boolean
  createdAt: string | Date
}

interface FormTemplatesPanelProps {
  templates: FormTemplateRow[]
}

const FIELD_TYPES: FormField['type'][] = ['text', 'date', 'select', 'textarea', 'number']

function emptyField(): FormField {
  return { name: '', label: '', type: 'text', required: false, options: [] }
}

interface TemplateFormState {
  name: string
  fields: FormField[]
}

function TemplateForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: TemplateFormState
  onSave: (data: TemplateFormState) => void
  onCancel: () => void
  saving: boolean
}) {
  const [name, setName] = useState(initial.name)
  const [fields, setFields] = useState<FormField[]>(
    initial.fields.length > 0 ? initial.fields : [emptyField()],
  )

  function updateField(index: number, patch: Partial<FormField>) {
    setFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...patch } : f)),
    )
  }

  function addField() {
    setFields((prev) => [...prev, emptyField()])
  }

  function removeField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validFields = fields.filter((f) => f.name.trim() && f.label.trim())
    if (!name.trim() || validFields.length === 0) return
    onSave({ name: name.trim(), fields: validFields })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-border rounded-lg p-5 space-y-4">
      <div>
        <label className="text-[13px] font-medium text-text-primary mb-1 block">Template name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full max-w-sm rounded-md border border-border px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
          placeholder="e.g. Leave Request"
        />
      </div>

      <div>
        <p className="text-[13px] font-medium text-text-primary mb-2">Fields</p>
        <div className="space-y-2">
          {fields.map((field, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_140px_80px_32px] gap-2 items-start">
              <div>
                {i === 0 && <p className="text-[11px] text-text-muted mb-1">Field name (key)</p>}
                <input
                  value={field.name}
                  onChange={(e) => updateField(i, { name: e.target.value.replace(/\s/g, '_') })}
                  placeholder="field_name"
                  className="w-full rounded-md border border-border px-2.5 py-1.5 text-[12.5px] font-mono focus:outline-none focus:ring-1 focus:ring-brand-600"
                />
              </div>
              <div>
                {i === 0 && <p className="text-[11px] text-text-muted mb-1">Label</p>}
                <input
                  value={field.label}
                  onChange={(e) => updateField(i, { label: e.target.value })}
                  placeholder="Display label"
                  className="w-full rounded-md border border-border px-2.5 py-1.5 text-[12.5px] focus:outline-none focus:ring-1 focus:ring-brand-600"
                />
              </div>
              <div>
                {i === 0 && <p className="text-[11px] text-text-muted mb-1">Type</p>}
                <select
                  value={field.type}
                  onChange={(e) => updateField(i, { type: e.target.value as FormField['type'] })}
                  className="w-full rounded-md border border-border px-2 py-1.5 text-[12.5px] focus:outline-none focus:ring-1 focus:ring-brand-600"
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {field.type === 'select' && (
                  <input
                    value={field.options?.join(', ') ?? ''}
                    onChange={(e) =>
                      updateField(i, { options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })
                    }
                    placeholder="opt1, opt2, opt3"
                    className="mt-1 w-full rounded-md border border-border px-2 py-1 text-[11.5px] focus:outline-none focus:ring-1 focus:ring-brand-600"
                  />
                )}
              </div>
              <div className="flex items-center gap-1 mt-1">
                {i === 0 && <p className="text-[11px] text-text-muted mb-1 w-full">Req.</p>}
                <input
                  type="checkbox"
                  checked={field.required ?? false}
                  onChange={(e) => updateField(i, { required: e.target.checked })}
                  className="rounded"
                />
              </div>
              <div className="flex items-start pt-0.5">
                {i === 0 && <div className="h-4 mb-1" />}
                <button
                  type="button"
                  onClick={() => removeField(i)}
                  disabled={fields.length === 1}
                  className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-red-600 hover:bg-red-50 disabled:opacity-30 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addField}
          className="mt-2 flex items-center gap-1 text-[12px] text-brand-600 hover:text-brand-700 font-medium"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add field
        </button>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="px-4 py-2 rounded-md bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save template'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-[13px] text-text-secondary hover:text-text-primary transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export function FormTemplatesPanel({ templates: initialTemplates }: FormTemplatesPanelProps) {
  const router = useRouter()
  const [templates, setTemplates] = useState(initialTemplates)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  async function handleCreate(data: TemplateFormState) {
    setSaving(true)
    const res = await fetch('/api/admin/form-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setSaving(false)
    if (res.ok) {
      const { data: created } = await res.json()
      setTemplates((prev) => [created, ...prev])
      setAdding(false)
      router.refresh()
    }
  }

  async function handleUpdate(id: string, data: TemplateFormState) {
    setSaving(true)
    const res = await fetch(`/api/admin/form-templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setSaving(false)
    if (res.ok) {
      const { data: updated } = await res.json()
      setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)))
      setEditingId(null)
      router.refresh()
    }
  }

  async function handleDeactivate(id: string) {
    if (!confirm('Deactivate this form template?')) return
    setActionLoading(id)
    await fetch(`/api/admin/form-templates/${id}`, { method: 'DELETE' })
    setTemplates((prev) => prev.filter((t) => t.id !== id))
    setActionLoading(null)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-border rounded-lg overflow-hidden">
        {templates.length === 0 && !adding ? (
          <div className="p-8 text-center text-[13px] text-text-muted">No form templates yet.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-secondary">
                {['Name', 'Fields', 'Status', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[12px] font-medium text-text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {templates.map((t) => (
                <tr key={t.id}>
                  {editingId === t.id ? (
                    <td colSpan={4} className="px-4 py-3">
                      <TemplateForm
                        initial={{ name: t.name, fields: t.fields }}
                        onSave={(data) => handleUpdate(t.id, data)}
                        onCancel={() => setEditingId(null)}
                        saving={saving}
                      />
                    </td>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-[13px] text-text-primary font-medium">{t.name}</td>
                      <td className="px-4 py-3 text-[13px] text-text-secondary">{t.fields.length}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full ${t.active ? 'bg-green-50 text-green-700' : 'bg-surface-tertiary text-text-muted'}`}>
                          {t.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingId(t.id)}
                            className="text-[12px] text-brand-600 hover:bg-brand-50 px-2 py-1 rounded transition-colors font-medium"
                          >
                            Edit
                          </button>
                          <button
                            disabled={actionLoading === t.id}
                            onClick={() => handleDeactivate(t.id)}
                            className="text-[12px] text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors disabled:opacity-50"
                          >
                            {actionLoading === t.id ? '…' : 'Deactivate'}
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {adding ? (
        <TemplateForm
          initial={{ name: '', fields: [] }}
          onSave={handleCreate}
          onCancel={() => setAdding(false)}
          saving={saving}
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-[13px] font-medium text-brand-600 hover:text-brand-700"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add template
        </button>
      )}
    </div>
  )
}
