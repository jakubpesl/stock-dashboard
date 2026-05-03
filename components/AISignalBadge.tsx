'use client'

type Signal = 'BUY' | 'HOLD' | 'SELL'

const cfg: Record<Signal, { label: string; pill: string; bar: string; icon: string }> = {
  BUY:  { label: 'KUP',    pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', bar: 'bg-emerald-500', icon: '▲' },
  HOLD: { label: 'DRŽ',    pill: 'bg-amber-50 text-amber-700 border-amber-200',       bar: 'bg-amber-400',   icon: '◆' },
  SELL: { label: 'PRODEJ', pill: 'bg-red-50 text-red-600 border-red-200',             bar: 'bg-red-500',     icon: '▼' },
}

export default function AISignalBadge({ signal, confidence, outdated }: {
  signal: Signal; confidence: number; outdated?: boolean
}) {
  const s = cfg[signal]
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-bold ${s.pill}`}>
          <span>{s.icon}</span>
          {s.label}
        </span>
        <span className="text-2xl font-bold text-slate-900 tabular-nums">{confidence}%</span>
        <span className="text-sm text-slate-400">shoda</span>
        {outdated && (
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Zastaralá analýza</span>
        )}
      </div>
      {/* Confidence bar */}
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden w-full max-w-xs">
        <div className={`h-full rounded-full ${s.bar}`} style={{ width: `${confidence}%` }} />
      </div>
    </div>
  )
}
