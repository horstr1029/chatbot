'use client'

import { useState } from 'react'
import type { FormField } from '@/lib/llm/formFiller'

interface FormPreviewProps {
  template: { id: string; name: string; fields: FormField[] }
  filled: Record<string, string>
  onSubmit?: () => void
  onCancel?: () => void
}

export function FormPreview({ template, filled, onSubmit, onCancel }: FormPreviewProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const f of template.fields) {
      init[f.name] = filled[f.name] ?? ''
    }
    return init
  })
  const [submitted, setSubmitted] = useState(false)

  function handleChange(name: string, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    onSubmit?.()
  }

  if (submitted) {
    return (
      <div className="bg-white border border-border rounded-xl p-4 mt-2 max-w-[560px]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-green-50 border border-green-200 flex items-center justify-center flex-shrink-0">
            <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-[13px] font-medium text-green-700">
            Form submitted — your admin has been notified.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-border rounded-xl p-4 mt-2 max-w-[560px]">
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border">
        <div className="w-6 h-6 rounded-md bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-3.5 h-3.5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-[13px] font-semibold text-text-primary">{template.name}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {template.fields.map((field) => (
          <div key={field.name}>
            <label className="block text-[12px] font-medium text-text-primary mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {field.type === 'textarea' ? (
              <textarea
                value={values[field.name]}
                onChange={(e) => handleChange(field.name, e.target.value)}
                required={field.required}
                rows={3}
                className="w-full rounded-md border border-border px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent resize-none"
              />
            ) : field.type === 'select' ? (
              <select
                value={values[field.name]}
                onChange={(e) => handleChange(field.name, e.target.value)}
                required={field.required}
                className="w-full rounded-md border border-border px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-600"
              >
                <option value="">— Select —</option>
                {field.options?.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : (
              <input
                type={field.type}
                value={values[field.name]}
                onChange={(e) => handleChange(field.name, e.target.value)}
                required={field.required}
                className="w-full rounded-md border border-border px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
              />
            )}
          </div>
        ))}

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-800 transition-colors"
          >
            Submit
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-[13px] text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
