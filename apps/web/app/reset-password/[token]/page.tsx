'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface ResetPasswordPageProps {
  params: { token: string }
}

export default function ResetPasswordPage({ params }: ResetPasswordPageProps) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: params.token, password }),
    })
    setLoading(false)

    const body = await res.json()
    if (res.ok) {
      router.push('/login?reset=1')
    } else {
      setError(body.error ?? 'Something went wrong')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-secondary">
      <div className="bg-white border border-border rounded-lg p-8 w-full max-w-sm">
        <div className="mb-6 text-center">
          <img src="/logo.jpg" alt="MST Chatbot" className="h-14 object-contain mb-3 mx-auto block" />
          <h1 className="text-xl font-semibold text-text-primary mt-1">Set new password</h1>
          <p className="text-[13px] text-text-muted mt-1">Choose a password at least 8 characters long.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[13px] font-medium text-text-primary mb-1 block">New password</label>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
            />
          </div>

          <div>
            <label className="text-[13px] font-medium text-text-primary mb-1 block">Confirm password</label>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
            />
          </div>

          {error && <p className="text-[12px] text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-gray-900 text-white py-2 text-[13px] font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Saving…' : 'Set new password'}
          </button>

          <p className="text-center text-[12px] text-text-muted">
            <Link href="/login" className="text-brand-600 hover:underline">Back to sign in</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
