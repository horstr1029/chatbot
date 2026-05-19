'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    setLoading(false)

    if (res.ok) {
      setSubmitted(true)
    } else {
      const body = await res.json()
      setError(body.error ?? 'Something went wrong')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-secondary">
      <div className="bg-white border border-border rounded-lg p-8 w-full max-w-sm">
        <div className="mb-6 text-center">
          <img src="/logo.jpg" alt="MST Chatbot" className="h-14 object-contain mb-3 mx-auto block" />
          <h1 className="text-xl font-semibold text-text-primary mt-1">Reset your password</h1>
          <p className="text-[13px] text-text-muted mt-1">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        {submitted ? (
          <div className="text-center space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-md px-4 py-3">
              <p className="text-[13px] text-green-700 font-medium">Check your email</p>
              <p className="text-[12px] text-green-600 mt-1">
                If an account exists for <strong>{email}</strong>, a reset link has been sent. It expires in 1 hour.
              </p>
            </div>
            <Link href="/login" className="block text-[13px] text-brand-600 hover:underline">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[13px] font-medium text-text-primary mb-1 block">Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
              />
            </div>

            {error && <p className="text-[12px] text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-gray-900 text-white py-2 text-[13px] font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>

            <p className="text-center text-[12px] text-text-muted">
              <Link href="/login" className="text-brand-600 hover:underline">Back to sign in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
