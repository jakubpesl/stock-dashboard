'use client'
import { useState } from 'react'
import { SP500_LIST, SP500Stock } from '@/lib/sp500list'

const WL_KEY = 'stock-watchlist'

interface ScanResult {
  stock: SP500Stock
  price: number
  changePercent: number
  high52w: number
  signal: 'BUY' | 'HOLD' | 'SELL'
  confidence: number
  risk: string
  priceTarget?: number
  horizon?: string
  reasoning: string
  discount: number
}

function signalColor(s: string) {
  if (s === 'BUY') return 'text-[#22c55e] bg-[#22c55e]/10 border-[#22c55e]/30'
  if (s === 'SELL') return 'text-[#ef4444] bg-[#ef4444]/10 border-[#ef4444]/30'
  return 'text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/30'
}

function signalLabel(s: string) {
  if (s === 'BUY') return 'KUP'
  if (s === 'SELL') return 'PRODEJ'
  return 'DRŽ'
}

function sortResults(results: ScanResult[]) {
  const order = { BUY: 0, HOLD: 1, SELL: 2 }
  return [...results].sort((a, b) => {
    if (order[a.signal] !== order[b.signal]) return order[a.signal] - order[b.signal]
    return b.confidence - a.confidence
  })
}

export default function ScannerPage() {
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<ScanResult[]>([])
  const [done, setDone] = useState(false)
  const [toast, setToast] = useState('')

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  function addToWatchlist(stock: SP500Stock) {
    const stored = localStorage.getItem(WL_KEY)
    const wl: { symbol: string; alias: string }[] = stored ? JSON.parse(stored) : []
    if (wl.find((t) => t.symbol === stock.symbol)) { flash(`${stock.symbol} už je ve watchlistu.`); return }
    if (wl.length >= 10) { flash('Watchlist je plný (max 10).'); return }
    wl.push({ symbol: stock.symbol, alias: stock.name })
    localStorage.setItem(WL_KEY, JSON.stringify(wl))
    flash(`${stock.symbol} přidán do watchlistu.`)
  }

  async function runScanner() {
    setRunning(true)
    setResults([])
    setDone(false)
    setProgress(0)

    for (let i = 0; i < SP500_LIST.length; i++) {
      const stock = SP500_LIST[i]
      try {
        const [stockRes, analyzeRes] = await Promise.all([
          fetch(`/api/stock/${stock.symbol}`).then((r) => r.json()),
          fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tickers: [stock.symbol] }),
          }).then((r) => r.json()),
        ])

        const data = stockRes.data
        const signal = analyzeRes.results?.[0]
        if (!data || !signal) { setProgress(i + 1); continue }

        const discount = data.high52w > 0
          ? parseFloat(((data.high52w - data.price) / data.high52w * 100).toFixed(1))
          : 0

        const result: ScanResult = {
          stock,
          price: data.price,
          changePercent: data.changePercent,
          high52w: data.high52w,
          signal: signal.signal,
          confidence: signal.confidence,
          risk: signal.risk,
          priceTarget: signal.priceTarget,
          horizon: signal.horizon,
          reasoning: signal.reasoning,
          discount,
        }

        setResults((prev) => sortResults([...prev, result]))
      } catch {
        // skip failed tickers
      }
      setProgress(i + 1)
    }

    setDone(true)
    setRunning(false)
  }

  const buyCount = results.filter((r) => r.signal === 'BUY').length

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#f1f5f9]">S&P 500 Scanner</h1>
          <p className="text-[#94a3b8] text-sm mt-1">
            AI analýza {SP500_LIST.length} top titulů — hledá podhodnocené akcie s potenciálem růstu
          </p>
        </div>
        <button onClick={runScanner} disabled={running}
          className="px-5 py-2.5 bg-[#6c63ff] hover:bg-[#6c63ff]/80 disabled:opacity-50 text-white rounded-lg font-medium transition-colors">
          {running ? `🔍 Skenuji… ${progress}/${SP500_LIST.length}` : '🔍 Spustit scanner'}
        </button>
      </div>

      {running && (
        <div className="mb-6">
          <div className="h-1.5 bg-[#2a2a3a] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#6c63ff] transition-all duration-300"
              style={{ width: `${(progress / SP500_LIST.length) * 100}%` }}
            />
          </div>
          <p className="text-xs text-[#94a3b8] mt-2">Analyzuji {SP500_LIST[Math.min(progress, SP500_LIST.length - 1)]?.symbol}…</p>
        </div>
      )}

      {done && (
        <div className="mb-6 flex gap-4">
          <div className="px-4 py-2 bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-lg text-sm text-[#22c55e] font-medium">
            ✓ {buyCount} BUY signálů
          </div>
          <div className="px-4 py-2 bg-white/5 border border-[#2a2a3a] rounded-lg text-sm text-[#94a3b8]">
            {results.length} titulů analyzováno
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((r) => (
            <div key={r.stock.symbol}
              className="bg-[#1a1a24] border border-[#2a2a3a] rounded-xl p-4 flex flex-wrap items-center gap-4">
              {/* Ticker + name */}
              <div className="w-28 shrink-0">
                <div className="font-bold text-[#f1f5f9]">{r.stock.symbol}</div>
                <div className="text-xs text-[#94a3b8]">{r.stock.name}</div>
                <div className="text-xs text-[#64748b] mt-0.5">{r.stock.sector}</div>
              </div>

              {/* Signal badge */}
              <div className={`px-3 py-1 rounded-full border text-xs font-bold ${signalColor(r.signal)}`}>
                {signalLabel(r.signal)}
              </div>

              {/* Confidence */}
              <div className="text-center">
                <div className="text-lg font-bold text-[#f1f5f9]">{r.confidence}%</div>
                <div className="text-xs text-[#94a3b8]">confidence</div>
              </div>

              {/* Price */}
              <div className="text-center">
                <div className="font-semibold text-[#f1f5f9]">${r.price.toFixed(2)}</div>
                <div className={`text-xs ${r.changePercent >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                  {r.changePercent >= 0 ? '+' : ''}{r.changePercent.toFixed(2)}% dnes
                </div>
              </div>

              {/* Discount from 52w high */}
              <div className="text-center">
                <div className={`font-semibold ${r.discount >= 20 ? 'text-[#22c55e]' : r.discount >= 10 ? 'text-[#f59e0b]' : 'text-[#94a3b8]'}`}>
                  -{r.discount}%
                </div>
                <div className="text-xs text-[#94a3b8]">od 52t max</div>
              </div>

              {/* Price target */}
              {r.priceTarget && (
                <div className="text-center">
                  <div className="font-semibold text-[#6c63ff]">${r.priceTarget}</div>
                  <div className="text-xs text-[#94a3b8]">cíl {r.horizon ?? '12m'}</div>
                </div>
              )}

              {/* Reasoning */}
              <div className="flex-1 min-w-48 text-xs text-[#94a3b8] leading-relaxed">
                {r.reasoning}
              </div>

              {/* Add to watchlist */}
              <button onClick={() => addToWatchlist(r.stock)}
                className="shrink-0 px-3 py-1.5 border border-[#2a2a3a] hover:border-[#6c63ff] text-[#94a3b8] hover:text-[#f1f5f9] rounded-lg text-xs transition-colors">
                + Watchlist
              </button>
            </div>
          ))}
        </div>
      )}

      {!running && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-5xl mb-4">🔍</p>
          <h2 className="text-xl font-bold text-[#f1f5f9] mb-2">Scanner připraven</h2>
          <p className="text-[#94a3b8] max-w-md">
            Klikni na „Spustit scanner" — AI proanalizuje {SP500_LIST.length} top S&P 500 titulů
            a seřadí je podle potenciálu. Hledá podhodnocené akcie s vysokou pravděpodobností růstu.
          </p>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 bg-[#1a1a24] border border-[#6c63ff] text-[#f1f5f9] rounded-xl shadow-2xl text-sm font-medium animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  )
}
