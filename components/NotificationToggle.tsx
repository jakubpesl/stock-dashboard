'use client'

export default function NotificationToggle({ symbol: _symbol, enabled, onChange }: {
  symbol: string
  enabled: boolean
  onChange: (enabled: boolean) => void
}) {
  return (
    <button onClick={() => onChange(!enabled)} aria-label="Toggle notifications"
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${enabled ? 'bg-[#6c63ff]' : 'bg-slate-200'}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}
