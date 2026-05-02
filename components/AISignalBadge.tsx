'use client'

type Signal = 'BUY' | 'HOLD' | 'SELL'
const labels: Record<Signal, string> = { BUY: 'KUP', HOLD: 'DRŽ', SELL: 'PRODEJ' }
const colors: Record<Signal, string> = {
  BUY: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  HOLD: 'bg-amber-50 text-amber-700 border-amber-200',
  SELL: 'bg-red-50 text-red-600 border-red-200',
}
const dots: Record<Signal, string> = {
  BUY: 'bg-emerald-500',
  HOLD: 'bg-amber-500',
  SELL: 'bg-red-500',
}

export default function AISignalBadge({ signal, confidence, outdated }: {
  signal: Signal
  confidence: number
  outdated?: boolean
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-bold ${colors[signal]}`}>
        <span className={`w-2 h-2 rounded-full ${dots[signal]}`} />
        {labels[signal]} · {confidence}%
      </span>
      {outdated && (
        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
          Zastaralá analýza
        </span>
      )}
    </div>
  )
}
