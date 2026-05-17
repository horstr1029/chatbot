'use client'

import { useEffect, useState } from 'react'

export function PushSetup() {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !vapidPublicKey) {
      setPermission('unsupported')
      return
    }
    setPermission(Notification.permission)
  }, [vapidPublicKey])

  async function enable() {
    if (!vapidPublicKey) return
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') return

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey,
      })
      const json = sub.toJSON()
      const keys = json.keys as Record<string, string>
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: json.endpoint, p256dh: keys.p256dh, auth: keys.auth }),
      })
    } catch {
      // permission denied or not supported — fail silently
    } finally {
      setLoading(false)
    }
  }

  if (permission === 'unsupported' || permission === 'granted') return null

  return (
    <button
      onClick={enable}
      disabled={loading || permission === 'denied'}
      title={permission === 'denied' ? 'Notifications blocked in browser settings' : 'Enable push notifications for workflow updates'}
      className="w-7 h-7 flex items-center justify-center rounded-md border border-border text-text-muted hover:bg-surface-secondary hover:text-text-secondary transition-colors disabled:opacity-40"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    </button>
  )
}
