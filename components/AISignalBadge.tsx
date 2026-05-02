'use client'

type Signal = 'BUY' | 'HOLD' | 'SELL'
const labels: Record<Signal, string> = { BUY: 'KUP', HOLD: 'DRŽ', SELL: 'PRODEJ' }
const icons: Record<Signal, string> = { BUY: '🟢', HOLD: '🟡', SELL: '🔴' }
const colors: Record<Signal, string> = {
  BUY: 'bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30',
  HOLD: 'bg-[#eab308]/15 text-[#eab308] border-[#eab308]/30',
  SELL: 'bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/30',
}

export default function AISignalBadge({
  signal,
  confidence,
  outdated,
}: {
  signal: Signal
  confidence: number
  outdated?: boolean
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-bold ${colors[signal]}`}>
        {icons[signal]} {labels[signal]} {confidence}%
      </span>
      {outdated && (
        <span className="text-xs text-[#94a3b8] bg-white/5 px-2 py-0.5 rounded-full">
          Zastaralá analýza
        </span>
      )}
    </div>
  )
}
