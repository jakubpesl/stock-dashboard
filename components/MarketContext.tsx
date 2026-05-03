'use client'
import { useState, useEffect } from 'react'
import { calcMA, detectCrossover } from '@/lib/indicators'

interface SpyData {
  price: number
  changePercent: number
  history1y: { date: string; close: number }[]
}

export default function MarketContext() {
  const [spy, setSpy] = useState<SpyData | null>(null)

  useEffect(() => {
    fetch('/api/stock/SPY')
      .then((r) => r.json())
      .then((json) => { if (json.data) setSpy(json.data) })
      .catch(() => {})
  }, [])

  if (!spy) return null

  const closes = spy.history1y.map((h) => h.close)
  const ma50   = calcMA(closes, 50)
  const ma200  = calcMA(closes, 200)
  const aboveMA50  = ma50  ? spy.price > ma50  : null
  const aboveMA200 = ma200 ? spy.price > ma200 : null
  const crossover  = detectCrossover(closes)

  const isBullish = aboveMA50 && aboveMA200
  const isBearish = aboveMA50 === false && aboveMA200 === false
  const isUp = spy.changePercent >= 0

  const trendLabel = isBullish ? 'Bullish' : isBearish ? 'Bearish' : 'Smíšený'
  const trendColor = isBullish ? 'text-emerald-600' : isBearish ? 'text-red-500' : 'text-amber-600'
  const trendBg    = isBullish ? 'bg-emerald-50 border-emerald-200' : isBearish ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'

  return (
    <div className={`flex flex-wrap items-center gap-4 px-4 py-3 rounded-xl border text-sm mb-6 ${trendBg}`}>
      <div className="flex items-center gap-2">
        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">S&P 500</span>
        <span className="font-bold text-slate-900">${spy.price.toFixed(2)}</span>
        <span className={`font-semibold text-xs ${isUp ? 'text-emerald-600' : 'text-red-500'}`}>
          {isUp ? '▲' : '▼'} {Math.abs(spy.changePercent).toFixed(2)}%
        </span>
      </div>

      <div className="h-4 w-px bg-slate-200" />

      <div className="flex items-center gap-1.5">
        <span className={`font-bold ${trendColor}`}>{trendLabel} trend</span>
        <span className="text-slate-400 text-xs">
          {aboveMA50 !== null && (aboveMA50 ? '· nad MA50' : '· pod MA50')}
          {aboveMA200 !== null && (aboveMA200 ? ' · nad MA200' : ' · pod MA200')}
        </span>
      </div>

      {crossover && (
        <>
          <div className="h-4 w-px bg-slate-200" />
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
            crossover === 'golden_cross'
              ? 'bg-amber-50 border-amber-300 text-amber-700'
              : 'bg-slate-100 border-slate-300 text-slate-600'
          }`}>
            {crossover === 'golden_cross' ? '⭐ Golden Cross' : '☠️ Death Cross'}
            <span className="font-normal opacity-70">na S&P 500</span>
          </span>
        </>
      )}

      <div className="ml-auto text-xs text-slate-400 hidden sm:block">
        Tržní kontext pro AI signály
      </div>
    </div>
  )
}
