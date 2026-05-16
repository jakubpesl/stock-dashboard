'use client'
import { useState, useEffect } from 'react'
import { SP500_LIST, SP500Stock } from '@/lib/sp500list'

const WL_KEY = 'stock-watchlist'
const SCAN_KEY = 'scanner-results'
const SCAN_TIME_KEY = 'scanner-timestamp'

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

const signalStyle = {
  BUY:  { pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', bar: 'bg-gradient-to-r from-emerald-400 to-teal-400',  label: 'KUP' },
  HOLD: { pill: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-500',   bar: 'bg-gradient-to-r from-amber-400 to-orange-300',   label: 'DRŽ' },
  SELL: { pill: 'bg-red-50 text-red-600 border-red-200',             dot: 'bg-red-500',     bar: 'bg-gradient-to-r from-red-500 to-rose-400',        label: 'PRODEJ' },
}

function sortResults(results: ScanResult[]) {
  const order = { BUY: 0, HOLD: 1, SELL: 2 }
  return [...results].sort((a, b) =>
    order[a.signal] !== order[b.signal] ? order[a.signal] - order[b.signal] : b.confidence - a.confidence
  )
}

const SECTORS = ['Vše', 'Technology', 'Consumer', 'Finance', 'Healthcare', 'Energy', 'Industrial', 'Defensive']
const SIGNALS: ('BUY' | 'HOLD' | 'SELL')[] = ['BUY', 'HOLD', 'SELL']
const SIG_LABELS = { BUY: 'KUP', HOLD: 'DRŽ', SELL: 'PRODEJ' }

const AI_LIMIT_OPTIONS = [10, 15, 20, 30]

function scoreOpportunity(price: number, high52w: number, low52w: number, changePercent: number, history1m: { close: number }[]): number {
  let score = 0
  const discount = high52w > 0 ? (high52w - price) / high52w * 100 : 0
  if (discount > 10) score += 1
  if (discount > 20) score += 2
  if (discount > 30) score += 2
  if (changePercent < -1) score += 1
  if (history1m && history1m.length > 20) {
    const change30d = (price - history1m[0].close) / history1m[0].close * 100
    if (change30d < -5) score += 1
    if (change30d < -15) score += 2
  }
  const distFromLow = low52w > 0 ? (price - low52w) / low52w * 100 : 100
  if (distFromLow < 15) score += 2
  return score
}

export default function ScannerPage() {
  const [running, setRunning] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'fetching' | 'analyzing'>('idle')
  const [progress, setProgress] = useState(0)
  const [progressMax, setProgressMax] = useState(SP500_LIST.length)
  const [phaseLabel, setPhaseLabel] = useState('')
  const [results, setResults] = useState<ScanResult[]>([])
  const [done, setDone] = useState(false)
  const [scannedAt, setScannedAt] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [aiLimit, setAiLimit] = useState(10)
  const [thesis, setThesis] = useState('')

  // Filters
  const [filterSignals, setFilterSignals] = useState<Set<'BUY' | 'HOLD' | 'SELL'>>(new Set(SIGNALS))
  const [filterSector, setFilterSector] = useState('Vše')
  const [filterMinConf, setFilterMinConf] = useState(0)
  const [filterMinDiscount, setFilterMinDiscount] = useState(0)

  useEffect(() => {
    const stored = localStorage.getItem(SCAN_KEY)
    const ts = localStorage.getItem(SCAN_TIME_KEY)
    if (stored) { setResults(JSON.parse(stored)); setDone(true) }
    if (ts) setScannedAt(ts)
  }, [])

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  function addToWatchlist(stock: SP500Stock) {
    const stored = localStorage.getItem(WL_KEY)
    const wl: { symbol: string; alias: string }[] = stored ? JSON.parse(stored) : []
    if (wl.find((t) => t.symbol === stock.symbol)) { flash(`${stock.symbol} už je ve watchlistu.`); return }
    if (wl.length >= 10) { flash('Watchlist je plný (max 10).'); return }
    wl.push({ symbol: stock.symbol, alias: stock.name })
    localStorage.setItem(WL_KEY, JSON.stringify(wl))
    flash(`✓ ${stock.symbol} přidán do watchlistu.`)
  }

  async function runScanner() {
    setRunning(true)
    setResults([])
    setDone(false)
    setProgress(0)

    // Phase 1: fetch price data for all tickers (no Claude)
    setPhase('fetching')
    setProgressMax(SP500_LIST.length)
    setPhaseLabel('Načítám tržní data')

    type StockData = { price: number; changePercent: number; high52w: number; low52w: number; history1m: { date: string; close: number }[] }
    const priceData: { stock: SP500Stock; data: StockData }[] = []

    for (let i = 0; i < SP500_LIST.length; i++) {
      const stock = SP500_LIST[i]
      try {
        const res = await fetch(`/api/stock/${stock.symbol}?priceOnly=true`).then((r) => r.json())
        if (res.data) priceData.push({ stock, data: res.data })
      } catch { /* skip */ }
      setProgress(i + 1)
      await new Promise((r) => setTimeout(r, 80))
    }

    // Phase 2: score & select top N for AI analysis
    const scored = priceData.map(({ stock, data }) => ({
      stock, data,
      score: scoreOpportunity(data.price, data.high52w, data.low52w, data.changePercent, data.history1m ?? []),
    })).sort((a, b) => b.score - a.score)

    const toAnalyze = scored.slice(0, aiLimit)

    setPhase('analyzing')
    setProgressMax(toAnalyze.length)
    setProgress(0)
    setPhaseLabel(`AI analýza (top ${toAnalyze.length} z ${priceData.length} titulů)`)

    const fresh: ScanResult[] = []
    for (let i = 0; i < toAnalyze.length; i++) {
      const { stock, data } = toAnalyze[i]
      try {
        const analyzeRes = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tickers: [stock.symbol], lite: true, thesis: thesis || undefined }),
        }).then((r) => r.json())

        const signal = analyzeRes.results?.[0]
        if (!signal) { setProgress(i + 1); continue }

        const discount = data.high52w > 0
          ? parseFloat(((data.high52w - data.price) / data.high52w * 100).toFixed(1))
          : 0

        fresh.push({
          stock, price: data.price, changePercent: data.changePercent, high52w: data.high52w,
          signal: signal.signal, confidence: signal.confidence, risk: signal.risk,
          priceTarget: signal.priceTarget, horizon: signal.horizon,
          reasoning: signal.reasoning, discount,
        })
        const sorted = sortResults(fresh)
        setResults(sorted)
        localStorage.setItem(SCAN_KEY, JSON.stringify(sorted))
      } catch { /* skip */ }
      setProgress(i + 1)
    }

    const ts = new Date().toLocaleString('cs-CZ')
    setScannedAt(ts)
    localStorage.setItem(SCAN_TIME_KEY, ts)
    setDone(true)
    setRunning(false)
    setPhase('idle')
  }

  const buyResults = results.filter((r) => r.signal === 'BUY')
  const holdResults = results.filter((r) => r.signal === 'HOLD')
  const sellResults = results.filter((r) => r.signal === 'SELL')

  function toggleSignal(s: 'BUY' | 'HOLD' | 'SELL') {
    setFilterSignals((prev) => {
      const next = new Set(prev)
      next.has(s) ? next.delete(s) : next.add(s)
      return next.size === 0 ? prev : next
    })
  }

  const filtered = results.filter((r) =>
    filterSignals.has(r.signal) &&
    (filterSector === 'Vše' || r.stock.sector === filterSector) &&
    r.confidence >= filterMinConf &&
    r.discount >= filterMinDiscount
  )

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">S&P 500 Scanner</h1>
          <p className="text-slate-500 text-sm mt-1">
            Screener {SP500_LIST.length} top titulů — AI analyzuje nejzajímavější příležitosti
          </p>
          {scannedAt && !running && (
            <p className="text-xs text-slate-400 mt-1">Poslední sken: {scannedAt}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2 flex-1 sm:flex-none">
            <label className="text-xs text-slate-500 whitespace-nowrap">Styl:</label>
            <select value={thesis} onChange={(e) => setThesis(e.target.value)} disabled={running}
              className="flex-1 sm:flex-none bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-[#6c63ff]">
              <option value="">Univerzální</option>
              <option value="value">Hodnotové</option>
              <option value="growth">Růstové</option>
              <option value="dividend">Dividendové</option>
              <option value="garp">GARP</option>
            </select>
          </div>
          <div className="flex items-center gap-2 flex-1 sm:flex-none">
            <label className="text-xs text-slate-500 whitespace-nowrap">Max AI:</label>
            <select value={aiLimit} onChange={(e) => setAiLimit(Number(e.target.value))} disabled={running}
              className="flex-1 sm:flex-none bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-[#6c63ff]">
              {AI_LIMIT_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <button onClick={runScanner} disabled={running}
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-[#6c63ff] to-[#818cf8] hover:shadow-lg hover:shadow-[#6c63ff]/30 hover:-translate-y-px disabled:opacity-60 text-white rounded-lg font-medium transition-all shadow-md shadow-[#6c63ff]/20">
            {running ? `${phaseLabel}…` : '🔍 Spustit scanner'}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {running && (
        <div className="mb-6 bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex justify-between text-sm text-slate-600 mb-2">
            <span className="font-medium">{phaseLabel}</span>
            <span className="tabular-nums text-slate-400">{progress}/{progressMax}</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-300 ${phase === 'fetching' ? 'bg-slate-400' : 'bg-gradient-to-r from-[#6c63ff] to-[#818cf8]'}`}
              style={{ width: `${progressMax > 0 ? (progress / progressMax) * 100 : 0}%` }} />
          </div>
          {phase === 'fetching' && (
            <p className="text-xs text-slate-400 mt-2">Stahuju tržní data (zdarma) — poté vyberu top {aiLimit} titulů pro AI</p>
          )}
        </div>
      )}

      {/* Summary badges */}
      {done && results.length > 0 && (
        <div className="flex gap-3 mb-6 flex-wrap">
          <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-semibold text-emerald-700">
            ✓ {buyResults.length} KUP
          </div>
          <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-sm font-semibold text-amber-700">
            {holdResults.length} DRŽ
          </div>
          <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-sm font-semibold text-red-600">
            {sellResults.length} PRODEJ
          </div>
          <div className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-500">
            {results.length} titulů celkem
          </div>
        </div>
      )}

      {/* Filters */}
      {results.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-5 flex flex-wrap gap-4 items-end">
          {/* Signal toggle */}
          <div>
            <p className="text-xs text-slate-400 font-medium mb-2">Signál</p>
            <div className="flex gap-1.5">
              {SIGNALS.map((s) => {
                const st = signalStyle[s]
                const active = filterSignals.has(s)
                return (
                  <button key={s} onClick={() => toggleSignal(s)}
                    className={`px-3 py-1 rounded-full border text-xs font-bold transition-all ${active ? st.pill : 'bg-white text-slate-400 border-slate-200'}`}>
                    {SIG_LABELS[s]}
                  </button>
                )
              })}
            </div>
          </div>
          {/* Sector */}
          <div>
            <p className="text-xs text-slate-400 font-medium mb-2">Sektor</p>
            <select value={filterSector} onChange={(e) => setFilterSector(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-[#6c63ff]">
              {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {/* Min confidence */}
          <div>
            <p className="text-xs text-slate-400 font-medium mb-2">Min. shoda: <span className="text-slate-700 font-bold">{filterMinConf}%</span></p>
            <input type="range" min={0} max={90} step={5} value={filterMinConf}
              onChange={(e) => setFilterMinConf(Number(e.target.value))}
              className="w-32 accent-[#6c63ff]" />
          </div>
          {/* Min discount */}
          <div>
            <p className="text-xs text-slate-400 font-medium mb-2">Min. sleva od max: <span className="text-slate-700 font-bold">{filterMinDiscount}%</span></p>
            <input type="range" min={0} max={50} step={5} value={filterMinDiscount}
              onChange={(e) => setFilterMinDiscount(Number(e.target.value))}
              className="w-32 accent-[#6c63ff]" />
          </div>
          {/* Result count */}
          <div className="ml-auto text-sm text-slate-400">
            <span className="font-semibold text-slate-700">{filtered.length}</span> / {results.length} titulů
          </div>
        </div>
      )}

      {/* Results */}
      {filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((r) => {
            const st = signalStyle[r.signal]
            const upside = r.priceTarget ? ((r.priceTarget - r.price) / r.price * 100).toFixed(1) : null
            return (
              <div key={r.stock.symbol}
                className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center gap-4 hover:border-[#6c63ff]/40 hover:shadow-md hover:shadow-[#6c63ff]/8 hover:-translate-y-0.5 transition-all duration-200">
                {/* Ticker */}
                <div className="w-28 shrink-0">
                  <div className="font-bold text-slate-900">{r.stock.symbol}</div>
                  <div className="text-xs text-slate-500">{r.stock.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{r.stock.sector}</div>
                </div>

                {/* Signal */}
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${st.pill}`}>
                  <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                  {st.label}
                </span>

                {/* Confidence */}
                <div className="text-center min-w-14">
                  <div className="text-lg font-bold text-slate-900 tabular-nums">{r.confidence}%</div>
                  <div className="h-1 bg-slate-100 rounded-full overflow-hidden mt-1 w-14">
                    <div className={`h-full rounded-full ${st.bar}`} style={{ width: `${r.confidence}%` }} />
                  </div>
                </div>

                {/* Price + change */}
                <div className="text-center min-w-20">
                  <div className="font-semibold text-slate-900">${r.price.toFixed(2)}</div>
                  <div className={`text-xs font-medium ${r.changePercent >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {r.changePercent >= 0 ? '+' : ''}{r.changePercent.toFixed(2)}%
                  </div>
                </div>

                {/* Discount from 52w high */}
                <div className="text-center min-w-16">
                  <div className={`font-semibold ${r.discount >= 20 ? 'text-emerald-600' : r.discount >= 10 ? 'text-amber-600' : 'text-slate-400'}`}>
                    -{r.discount}%
                  </div>
                  <div className="text-xs text-slate-400">od max</div>
                </div>

                {/* Price target */}
                {r.priceTarget ? (
                  <div className="text-center min-w-20">
                    <div className="font-semibold text-[#6c63ff]">${r.priceTarget}</div>
                    <div className="text-xs text-slate-400">
                      cíl {upside && upside !== '0.0' ? `+${upside}%` : ''}
                    </div>
                  </div>
                ) : <div className="min-w-20" />}

                {/* Reasoning */}
                <div className="flex-1 min-w-48 text-xs text-slate-500 leading-relaxed">
                  {r.reasoning}
                </div>

                {/* Add to watchlist */}
                <button onClick={() => addToWatchlist(r.stock)}
                  className="shrink-0 px-3 py-1.5 border border-slate-200 hover:border-[#6c63ff]/50 hover:text-[#6c63ff] text-slate-500 rounded-lg text-xs font-medium transition-colors">
                  + Watchlist
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Empty filtered state */}
      {!running && results.length > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-slate-400 text-sm">Žádné výsledky neodpovídají filtrům. Zkus uvolnit kritéria.</p>
        </div>
      )}

      {/* Empty state — never run */}
      {!running && results.length === 0 && !done && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 bg-[#6c63ff]/10 rounded-2xl flex items-center justify-center text-4xl mb-6">🔍</div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Scanner připraven</h2>
          <p className="text-slate-500 max-w-md">
            Klikni na „Spustit scanner" — AI proanalizuje {SP500_LIST.length} top S&P 500 titulů
            a seřadí je podle potenciálu. Výsledky se průběžně ukládají.
          </p>
        </div>
      )}

      {/* Empty state — scan ran but 0 results */}
      {!running && results.length === 0 && done && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 bg-amber-50 rounded-2xl flex items-center justify-center text-4xl mb-6">⚠️</div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Sken dokončen bez výsledků</h2>
          <p className="text-slate-500 max-w-md">
            Nepodařilo se získat AI signály. Zkontroluj připojení nebo zkus spustit scanner znovu.
          </p>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 bg-slate-900 text-white rounded-xl shadow-2xl text-sm font-medium animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  )
}
