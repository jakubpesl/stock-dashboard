'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import StockCard from '@/components/StockCard'
import SkeletonCard from '@/components/SkeletonCard'

const WL_KEY = 'stock-watchlist'

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
    const results: Record<string, StockEntry> = {}
    await Promise.allSettled(
      list.map(async (t) => {
        const json = await fetch(`/api/stock/${t.symbol}`).then((r) => r.json())
        results[t.symbol] = { data: json.data, signal: json.signal }
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
    setRefreshing(true)
    await fetch('/api/refresh', { method: 'POST' })
    await loadStocks(tickers)
    setRefreshing(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#f1f5f9]">Watchlist</h1>
          <p className="text-[#94a3b8] text-sm mt-1">{tickers.length} / 10 tickerů</p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing}
          className="px-4 py-2 bg-[#6c63ff] hover:bg-[#6c63ff]/80 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
          {refreshing ? 'Obnovuji…' : '🔄 Obnovit vše'}
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : tickers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-6xl mb-4">📈</p>
          <h2 className="text-xl font-bold text-[#f1f5f9] mb-2">Žádné akcie ve watchlistu</h2>
          <p className="text-[#94a3b8] mb-6">Přidejte první ticker a začněte sledovat trh s AI signály.</p>
          <Link href="/settings"
            className="px-6 py-3 bg-[#6c63ff] hover:bg-[#6c63ff]/80 text-white rounded-lg font-medium transition-colors">
            Přidat první akcii →
          </Link>
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
