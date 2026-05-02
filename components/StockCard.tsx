'use client'
import Link from 'next/link'
import StockChart from './StockChart'
import AISignalBadge from './AISignalBadge'

interface Signal {
  signal: 'BUY' | 'HOLD' | 'SELL'
  confidence: number
  risk: string
  analyzedAt: string
}
interface CacheEntry {
  price: number
  changePercent: number
  history7d: { date: string; close: number }[]
}

export default function StockCard({
  symbol,
  alias,
  data,
  signal,
}: {
  symbol: string
  alias: string
  data: CacheEntry | null
  signal: Signal | null
}) {
  const isUp = (data?.changePercent ?? 0) >= 0
  const hoursOld = signal
    ? (Date.now() - new Date(signal.analyzedAt).getTime()) / 3_600_000
    : null
  const isOutdated = hoursOld !== null && hoursOld > 25

  return (
    <Link href={`/stock/${symbol}`}
      className="block bg-[#1a1a24] border border-[#2a2a3a] rounded-xl p-5 hover:border-[#6c63ff]/50 hover:scale-[1.02] transition-all duration-200">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-xs text-[#94a3b8] uppercase tracking-widest">{symbol}</p>
          <p className="text-[#f1f5f9] font-semibold">{alias}</p>
        </div>
        {data ? (
          <div className="text-right">
            <p className="text-lg font-bold text-[#f1f5f9]">${data.price.toFixed(2)}</p>
            <p className={`text-sm font-medium ${isUp ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
              {isUp ? '+' : ''}{data.changePercent.toFixed(2)}%
            </p>
          </div>
        ) : (
          <span className="text-xs text-[#94a3b8] bg-white/5 px-2 py-1 rounded-full">
            Data nedostupná
          </span>
        )}
      </div>

      {data?.history7d && (
        <div className="mb-3">
          <StockChart data={data.history7d} mini />
        </div>
      )}

      {signal ? (
        <div className="space-y-1">
          <AISignalBadge signal={signal.signal} confidence={signal.confidence} outdated={isOutdated} />
          <p className="text-xs text-[#94a3b8]">Riziko: {signal.risk}</p>
        </div>
      ) : (
        <p className="text-xs text-[#94a3b8]">Analýza nebyla spuštěna</p>
      )}
    </Link>
  )
}
