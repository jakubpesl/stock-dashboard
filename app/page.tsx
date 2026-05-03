'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import StockCard from '@/components/StockCard'
import SkeletonCard from '@/components/SkeletonCard'
import MarketContext from '@/components/MarketContext'

const WL_KEY = 'stock-watchlist'
const SIG_KEY = 'stock-signals'

interface Ticker { symbol: string; alias: string }
interface StockEntry {
  data: { price: number; changePercent: number; history7d: { date: string; close: number }[] } | null
  signal: { signal: 'BUY' | 'HOLD' | 'SELL'; confidence: number; risk: string; analyzedAt: string } | null
}

export default function Dashboard() {
  const [tickers, setTickers] = useState<Ticker[]>([])
  const [stocks, setStocks] = useState<Record<string, StockEntry>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadStocks = useCallback(async (list: Ticker[]) => {
    const stored = localStorage.getItem(SIG_KEY)
    const savedSignals: Record<string, StockEntry['signal']> = stored ? JSON.parse(stored) : {}
    const results: Record<string, StockEntry> = {}
    await Promise.allSettled(
      list.map(async (t) => {
        const json = await fetch(`/api/stock/${t.symbol}`).then((r) => r.json())
        results[t.symbol] = { data: json.data, signal: json.signal ?? savedSignals[t.symbol] ?? null }
      })
    )
    setStocks(results)
    setLoading(false)
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem(WL_KEY)
    const list: Ticker[] = stored ? (JSON.parse(stored) as Ticker[]) : []
    setTickers(list)
    loadStocks(list)
  }, [loadStocks])

  async function handleRefresh() {
    if (tickers.length === 0) return
    setRefreshing(true)
    await fetch('/api/refresh', { method: 'POST' })
    // Re-run AI analysis for all watchlist tickers
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers: tickers.map((t) => t.symbol) }),
      })
      const json = await res.json() as { results?: { signal: string; confidence: number; risk: string; analyzedAt: string; priceTarget?: number; horizon?: string; reasoning: string; newsSentiment: unknown[]; headlines: unknown[] }[] }
      if (json.results?.length) {
        const stored = localStorage.getItem(SIG_KEY)
        const saved: Record<string, unknown> = stored ? JSON.parse(stored) : {}
        json.results.forEach((sig, i) => {
          const sym = tickers[i]?.symbol
          if (sym) saved[sym] = sig
        })
        localStorage.setItem(SIG_KEY, JSON.stringify(saved))
      }
    } catch { /* non-critical */ }
    await loadStocks(tickers)
    setRefreshing(false)
  }

  const buyCount = Object.values(stocks).filter((s) => s.signal?.signal === 'BUY').length

  return (
    <div>
      <MarketContext />
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Watchlist</h1>
          <p className="text-slate-500 text-sm mt-1">{tickers.length} / 10 sledovaných titulů</p>
        </div>
        <div className="flex items-center gap-3">
          {buyCount > 0 && (
            <span className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold rounded-lg">
              {buyCount}× KUP signál
            </span>
          )}
          <button onClick={handleRefresh} disabled={refreshing}
            className="px-4 py-2 bg-[#6c63ff] hover:bg-[#6c63ff]/90 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
            {refreshing ? '🤖 Analyzuji…' : '↻ Obnovit + analyzovat'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : tickers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 bg-[#6c63ff]/10 rounded-2xl flex items-center justify-center text-4xl mb-6">📈</div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Watchlist je prázdný</h2>
          <p className="text-slate-500 mb-6 max-w-sm">Přidejte první ticker v nastavení nebo nechte Scanner najít příležitosti.</p>
          <div className="flex gap-3">
            <Link href="/settings"
              className="px-5 py-2.5 bg-[#6c63ff] hover:bg-[#6c63ff]/90 text-white rounded-lg font-medium transition-colors shadow-sm">
              Přidat akcii
            </Link>
            <Link href="/scanner"
              className="px-5 py-2.5 bg-white border border-slate-200 hover:border-[#6c63ff]/40 text-slate-700 rounded-lg font-medium transition-colors">
              Otevřít Scanner
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tickers.map((t) => (
            <StockCard key={t.symbol} symbol={t.symbol} alias={t.alias}
              data={stocks[t.symbol]?.data ?? null}
              signal={stocks[t.symbol]?.signal ?? null} />
          ))}
        </div>
      )}
    </div>
  )
}
