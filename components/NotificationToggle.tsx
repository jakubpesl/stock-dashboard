'use client'
import { useState } from 'react'

export default function NotificationToggle({
  symbol,
  enabled,
  onChange,
}: {
  symbol: string
  enabled: boolean
  onChange: (enabled: boolean) => void
}) {
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    await fetch('/api/watchlist', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, notificationsEnabled: !enabled }),
    })
    onChange(!enabled)
    setLoading(false)
  }

  return (
    <button onClick={toggle} disabled={loading} aria-label="Toggle notifications"
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${enabled ? 'bg-[#6c63ff]' : 'bg-white/10'}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}
