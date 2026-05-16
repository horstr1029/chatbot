'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ChangePasswordPage() {
  const router = useRouter()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (form.newPassword !== form.confirmPassword) {
      setError('New passwords do not match')
      return
    }
    if (form.newPassword.length < 8) {
      setError('New password must be at least 8 characters')
      return
    }

    setLoading(true)
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
    })
    const body = await res.json()
    setLoading(false)

    if (res.ok) {
      router.push(body.data?.redirect ?? '/chat')
      router.refresh()
    } else {
      setError(body.error ?? 'Failed to change password')
    }
  }

  return (
    <div className="min-h-screen bg-surface-secondary flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white border border-border rounded-xl p-8 shadow-sm">
          <div className="mb-6">
            <h1 className="text-[18px] font-semibold text-text-primary">Set your password</h1>
            <p className="text-[13px] text-text-muted mt-1">
              You're logging in for the first time. Please set a permanent password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[13px] font-medium text-text-primary mb-1 block">
                Temporary password
              </label>
              <input
                required
                type="password"
                value={form.currentPassword}
                onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))}
                className="w-full rounded-md border border-border px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
                placeholder="Enter the password from your email"
              />
            </div>

            <div>
              <label className="text-[13px] font-medium text-text-primary mb-1 block">
                New password
              </label>
              <input
                required
                type="password"
                minLength={8}
                value={form.newPassword}
                onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
                className="w-full rounded-md border border-border px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
                placeholder="Min. 8 characters"
              />
            </div>

            <div>
              <label className="text-[13px] font-medium text-text-primary mb-1 block">
                Confirm new password
              </label>
              <input
                required
                type="password"
                minLength={8}
                value={form.confirmPassword}
                onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                className="w-full rounded-md border border-border px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
                placeholder="Repeat new password"
              />
            </div>

            {error && (
              <p className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-md bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Saving…' : 'Set password & continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
