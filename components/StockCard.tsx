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
  symbol, alias, data, signal,
}: {
  symbol: string
  alias: string
  data: CacheEntry | null
  signal: Signal | null
}) {
  const isUp = (data?.changePercent ?? 0) >= 0
  const hoursOld = signal ? (Date.now() - new Date(signal.analyzedAt).getTime()) / 3_600_000 : null
  const isOutdated = hoursOld !== null && hoursOld > 25

  return (
    <Link href={`/stock/${symbol}`}
      className="block bg-white border border-slate-200 rounded-2xl p-5 hover:border-[#6c63ff]/40 hover:shadow-md hover:shadow-[#6c63ff]/5 hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-widest font-medium">{symbol}</p>
          <p className="text-slate-800 font-semibold mt-0.5">{alias}</p>
        </div>
        {data ? (
          <div className="text-right">
            <p className="text-lg font-bold text-slate-900">${data.price.toFixed(2)}</p>
            <p className={`text-sm font-semibold ${isUp ? 'text-emerald-600' : 'text-red-500'}`}>
              {isUp ? '+' : ''}{data.changePercent.toFixed(2)}%
            </p>
          </div>
        ) : (
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
            Nedostupné
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
          <p className="text-xs text-slate-400">Riziko: {signal.risk}</p>
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic">Analýza nebyla spuštěna</p>
      )}
    </Link>
  )
}
