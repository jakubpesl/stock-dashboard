'use client'
import Link from 'next/link'
import StockChart from './StockChart'

interface Signal { signal: 'BUY' | 'HOLD' | 'SELL'; confidence: number; risk: string; analyzedAt: string }
interface CacheEntry { price: number; change: number; changePercent: number; high52w: number; low52w: number; history7d: { date: string; close: number }[] }

const signalCfg = {
  BUY:  { label: 'KUP',    bar: 'bg-gradient-to-r from-emerald-400 to-teal-400',   pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', glow: 'signal-buy' },
  HOLD: { label: 'DRŽ',    bar: 'bg-gradient-to-r from-amber-400 to-orange-300',   pill: 'bg-amber-50 text-amber-700 border-amber-200',       glow: 'signal-hold' },
  SELL: { label: 'PRODEJ', bar: 'bg-gradient-to-r from-red-500 to-rose-400',       pill: 'bg-red-50 text-red-600 border-red-200',            glow: 'signal-sell' },
}

export default function StockCard({ symbol, alias, data, signal }: {
  symbol: string; alias: string; data: CacheEntry | null; signal: Signal | null
}) {
  const isUp = (data?.changePercent ?? 0) >= 0
  const range52w = data && data.high52w > data.low52w
    ? Math.round(((data.price - data.low52w) / (data.high52w - data.low52w)) * 100)
    : null
  const hoursOld = signal ? (Date.now() - new Date(signal.analyzedAt).getTime()) / 3_600_000 : null
  const isOutdated = hoursOld !== null && hoursOld > 25
  const cfg = signal ? signalCfg[signal.signal] : null

  return (
    <Link href={`/stock/${symbol}`}
      className="group block bg-white border border-slate-200 rounded-2xl p-5 hover:border-[#6c63ff]/40 hover:shadow-lg hover:shadow-[#6c63ff]/8 hover:-translate-y-0.5 transition-all duration-200">

      {/* Header */}
      <div className="flex justify-between items-start mb-1">
        <div>
          <span className="text-[10px] font-bold text-[#6c63ff] tracking-widest uppercase bg-[#6c63ff]/8 px-2 py-0.5 rounded-md">{symbol}</span>
          <p className="text-slate-700 font-semibold text-sm mt-1.5 leading-tight">{alias}</p>
        </div>
        {data ? (
          <div className="text-right">
            <p className="text-lg font-bold text-slate-900 tabular-nums">${data.price.toFixed(2)}</p>
            <p className={`text-xs font-semibold tabular-nums ${isUp ? 'text-emerald-600' : 'text-red-500'}`}>
              {isUp ? '▲' : '▼'} {Math.abs(data.changePercent).toFixed(2)}%
            </p>
            <p className={`text-[10px] tabular-nums ${isUp ? 'text-emerald-500' : 'text-red-400'}`}>
              {isUp ? '+' : ''}{data.change.toFixed(2)}
            </p>
          </div>
        ) : (
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">—</span>
        )}
      </div>

      {/* Mini chart */}
      {data?.history7d && (
        <div className="my-3 -mx-1">
          <StockChart data={data.history7d} mini />
        </div>
      )}

      {/* 52w range bar */}
      {range52w !== null && (
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
            <span>52t min</span>
            <span className="text-slate-500 font-medium">{range52w}% od minima</span>
            <span>52t max</span>
          </div>
          <div className="h-1 bg-slate-100 rounded-full overflow-hidden relative">
            <div className="h-full bg-gradient-to-r from-red-400 via-amber-400 to-emerald-500 opacity-30 absolute inset-0" />
            <div className="absolute top-0 h-full w-0.5 bg-slate-700 rounded-full -translate-x-1/2"
              style={{ left: `${range52w}%` }} />
          </div>
        </div>
      )}

      {/* Signal */}
      {cfg && signal ? (
        <div className="mt-1 space-y-2">
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${cfg.pill} ${cfg.glow}`}>
              {cfg.label}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium tabular-nums">{signal.confidence}%</span>
              {isOutdated && <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">zastaralé</span>}
            </div>
          </div>
          {/* Confidence bar */}
          <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${cfg.bar}`} style={{ width: `${signal.confidence}%` }} />
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic mt-1">Analýza nebyla spuštěna</p>
      )}
    </Link>
  )
}
