'use client'

import { useState } from 'react'

interface SmtpForm {
  host: string
  port: string
  secure: string
  user: string
  pass: string
  from: string
}

interface EmailSettingsPanelProps {
  initial: SmtpForm
}

export function EmailSettingsPanel({ initial }: EmailSettingsPanelProps) {
  const [form, setForm] = useState<SmtpForm>(initial)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  const isDirty = Object.keys(form).some((k) => form[k as keyof SmtpForm] !== initial[k as keyof SmtpForm])

  function field(label: string, key: keyof SmtpForm, opts?: { placeholder?: string; type?: string; mono?: boolean }) {
    return (
      <div>
        <label className="text-[13px] font-medium text-text-primary mb-1 block">{label}</label>
        <input
          type={opts?.type ?? 'text'}
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          placeholder={opts?.placeholder}
          className={`w-full rounded-md border border-border px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent ${opts?.mono ? 'font-mono' : ''}`}
        />
      </div>
    )
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    const res = await fetch('/api/superadmin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  async function handleTestEmail() {
    setTesting(true)
    setTestResult(null)
    const res = await fetch('/api/superadmin/settings/test-email', { method: 'POST' })
    const body = await res.json()
    setTesting(false)
    if (res.ok) {
      setTestResult({ ok: true, message: `Test email sent to ${body.data?.to}` })
    } else {
      setTestResult({ ok: false, message: body.error ?? 'Failed to send test email' })
    }
    setTimeout(() => setTestResult(null), 6000)
  }

  return (
    <div className="space-y-5">
      <div className="bg-white border border-border rounded-lg p-5 space-y-4">
        <div>
          <p className="text-[13px] font-semibold text-text-primary">Email (SMTP)</p>
          <p className="text-[12px] text-text-muted mt-0.5">
            Used to send welcome emails when new users are created.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {field('SMTP Host', 'host', { placeholder: 'smtp.gmail.com', mono: true })}

          <div className="grid grid-cols-2 gap-3">
            {field('Port', 'port', { placeholder: '587', mono: true })}
            <div>
              <label className="text-[13px] font-medium text-text-primary mb-1 block">SSL / TLS</label>
              <select
                value={form.secure}
                onChange={(e) => setForm((f) => ({ ...f, secure: e.target.value }))}
                className="w-full rounded-md border border-border px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-brand-600"
              >
                <option value="false">STARTTLS (587)</option>
                <option value="true">SSL/TLS (465)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {field('Username', 'user', { placeholder: 'you@gmail.com' })}
          {field('Password / App password', 'pass', { type: 'password', placeholder: '••••••••' })}
        </div>

        {field('From address', 'from', { placeholder: '"Company Chatbot" <noreply@example.com>' })}

        <div className="bg-surface-secondary border border-border rounded-md px-4 py-3 text-[12px] text-text-secondary space-y-1">
          <p className="font-medium text-text-primary">Gmail setup</p>
          <p>Enable 2-Step Verification → go to <span className="font-mono">myaccount.google.com/apppasswords</span> → generate an App Password for "Mail".</p>
          <p>Use <span className="font-mono">smtp.gmail.com</span>, port <span className="font-mono">587</span>, STARTTLS.</p>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            disabled={!isDirty || saving}
            onClick={handleSave}
            className="px-4 py-2 rounded-md bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save settings'}
          </button>
          <button
            disabled={testing}
            onClick={handleTestEmail}
            className="px-4 py-2 rounded-md border border-border text-[13px] text-text-secondary hover:bg-surface-secondary disabled:opacity-50 transition-colors"
          >
            {testing ? 'Sending…' : 'Send test email'}
          </button>
          {saved && <span className="text-[13px] text-green-600 font-medium">Saved</span>}
          {testResult && (
            <span className={`text-[13px] font-medium ${testResult.ok ? 'text-green-600' : 'text-red-600'}`}>
              {testResult.message}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
