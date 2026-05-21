'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Dept { id: string; name: string; role: string }

export function SelectDeptClient({ depts }: { depts: Dept[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function handleSelect(deptId: string) {
    setLoading(deptId)
    await fetch('/api/auth/switch-dept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deptId }),
    })
    router.push('/chat')
    router.refresh()
  }

  return (
    <div className="space-y-2">
      {depts.map((d) => (
        <button
          key={d.id}
          disabled={loading === d.id}
          onClick={() => handleSelect(d.id)}
          className="w-full text-left rounded-lg border border-border px-4 py-3 hover:border-brand-600 hover:bg-brand-50 transition-colors disabled:opacity-50 group"
        >
          <p className="text-[13px] font-semibold text-text-primary group-hover:text-brand-700">
            {d.name}
          </p>
          <p className="text-[11px] text-text-muted mt-0.5">
            {d.role === 'MANAGER' ? 'Dept Admin' : 'Member'}
          </p>
        </button>
      ))}
    </div>
  )
}
