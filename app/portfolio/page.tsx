'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const PORT_KEY = 'stock-portfolio'
const SIG_KEY = 'stock-signals'

interface StoredSignal { signal: 'BUY' | 'HOLD' | 'SELL'; confidence: number; price: number; analyzedAt: string }

interface Position {
  id: string
  symbol: string
  shares: number
  buyPrice: number
  buyDate: string
  note: string
}

interface LivePrice {
  price: number
  changePercent: number
}

function fmtCZK(n: number) {
  return n.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function PnLColor({ value }: { value: number }) {
  const cls = value >= 0 ? 'text-emerald-600' : 'text-red-500'
  return <span className={`font-semibold ${cls}`}>{value >= 0 ? '+' : ''}{fmtCZK(value)}</span>
}

export default function PortfolioPage() {
  const [positions, setPositions] = useState<Position[]>([])
  const [prices, setPrices] = useState<Record<string, LivePrice>>({})
  const [loading, setLoading] = useState(false)
  const [signals, setSignals] = useState<Record<string, StoredSignal>>({})
  const [reanalyzing, setReanalyzing] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [fSymbol, setFSymbol] = useState('')
  const [fShares, setFShares] = useState('')
  const [fPrice, setFPrice] = useState('')
  const [fDate, setFDate] = useState(new Date().toISOString().slice(0, 10))
  const [fNote, setFNote] = useState('')

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  async function reanalyze(symbol: string) {
    setReanalyzing(symbol)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers: [symbol] }),
      }).then((r) => r.json()) as { results?: StoredSignal[] }
      if (res.results?.[0]) {
        const updated = { ...signals, [symbol]: res.results[0] }
        setSignals(updated)
        localStorage.setItem(SIG_KEY, JSON.stringify(updated))
        flash(`✓ ${symbol} re-analyzován`)
      }
    } catch { flash('Chyba při analýze') }
    setReanalyzing(null)
  }

  useEffect(() => {
    const stored = localStorage.getItem(PORT_KEY)
    if (stored) setPositions(JSON.parse(stored))
    const storedSig = localStorage.getItem(SIG_KEY)
    if (storedSig) setSignals(JSON.parse(storedSig) as Record<string, StoredSignal>)
  }, [])

  useEffect(() => {
    if (positions.length === 0) return
    const symbols = Array.from(new Set(positions.map((p) => p.symbol)))
    setLoading(true)
    Promise.allSettled(
      symbols.map((s) => fetch(`/api/stock/${s}`).then((r) => r.json()).then((j) => ({ s, j })))
    ).then((results) => {
      const map: Record<string, LivePrice> = {}
      results.forEach((r) => {
        if (r.status === 'fulfilled' && r.value.j.data) {
          map[r.value.s] = { price: r.value.j.data.price, changePercent: r.value.j.data.changePercent }
        }
      })
      setPrices(map)
      setLoading(false)
    })
  }, [positions])

  function save(list: Position[]) {
    setPositions(list)
    localStorage.setItem(PORT_KEY, JSON.stringify(list))
  }

  function addPosition() {
    const sym = fSymbol.trim().toUpperCase()
    const shares = parseFloat(fShares)
    const price = parseFloat(fPrice)
    if (!sym || isNaN(shares) || shares <= 0 || isNaN(price) || price <= 0) {
      flash('Vyplň ticker, počet akcií a nákupní cenu.')
      return
    }
    const pos: Position = {
      id: `${sym}-${Date.now()}`,
      symbol: sym, shares, buyPrice: price,
      buyDate: fDate, note: fNote.trim(),
    }
    save([...positions, pos])
    setFSymbol(''); setFShares(''); setFPrice(''); setFNote('')
    setShowForm(false)
    flash(`✓ ${sym} přidán do portfolia.`)
  }

  function deletePosition(id: string) {
    save(positions.filter((p) => p.id !== id))
  }

  // Totals
  const totalInvested = positions.reduce((s, p) => s + p.shares * p.buyPrice, 0)
  const totalCurrent  = positions.reduce((s, p) => s + p.shares * (prices[p.symbol]?.price ?? p.buyPrice), 0)
  const totalPnL      = totalCurrent - totalInvested
  const totalPnLPct   = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0

  const inputCls = 'bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#6c63ff] focus:ring-2 focus:ring-[#6c63ff]/10 transition-all'

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Portfolio</h1>
          <p className="text-slate-500 text-sm mt-1">Sleduj své pozice a výkonnost oproti AI signálům</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)}
          className="px-5 py-2.5 bg-gradient-to-r from-[#6c63ff] to-[#818cf8] hover:shadow-lg hover:shadow-[#6c63ff]/30 hover:-translate-y-px text-white rounded-lg font-medium transition-all shadow-md shadow-[#6c63ff]/20">
          {showForm ? '✕ Zrušit' : '+ Přidat pozici'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">Nová pozice</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <input value={fSymbol} onChange={(e) => setFSymbol(e.target.value.toUpperCase())}
              placeholder="Ticker (AAPL)" maxLength={10} className={inputCls} />
            <input value={fShares} onChange={(e) => setFShares(e.target.value)}
              placeholder="Počet akcií" type="number" min="0.001" step="any" className={inputCls} />
            <input value={fPrice} onChange={(e) => setFPrice(e.target.value)}
              placeholder="Nákupní cena $" type="number" min="0.01" step="any" className={inputCls} />
            <input value={fDate} onChange={(e) => setFDate(e.target.value)}
              type="date" className={inputCls} />
            <input value={fNote} onChange={(e) => setFNote(e.target.value)}
              placeholder="Poznámka (volitelné)" maxLength={60} className={`${inputCls} lg:col-span-1`} />
            <button onClick={addPosition}
              className="px-4 py-2 bg-gradient-to-r from-[#6c63ff] to-[#818cf8] hover:shadow-lg hover:shadow-[#6c63ff]/30 hover:-translate-y-px text-white rounded-lg text-sm font-medium transition-all shadow-md shadow-[#6c63ff]/20">
              Přidat
            </button>
          </div>
        </div>
      )}

      {/* Summary cards */}
      {positions.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Investováno', value: `$${fmtCZK(totalInvested)}`, sub: '' },
            { label: 'Aktuální hodnota', value: `$${fmtCZK(totalCurrent)}`, sub: loading ? '…' : '' },
            { label: 'Zisk / Ztráta', value: `$${fmtCZK(Math.abs(totalPnL))}`, pnl: totalPnL, sub: `${totalPnL >= 0 ? '+' : ''}${totalPnLPct.toFixed(2)}%` },
            { label: 'Pozice', value: String(positions.length), sub: `${Array.from(new Set(positions.map(p => p.symbol))).length} titulů` },
          ].map(({ label, value, sub, pnl }) => (
            <div key={label} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-slate-400 mb-1">{label}</p>
              <p className={`text-xl font-bold ${pnl !== undefined ? (pnl >= 0 ? 'text-emerald-600' : 'text-red-500') : 'text-slate-900'}`}>
                {pnl !== undefined && (pnl >= 0 ? '+' : '-')}{value}
              </p>
              {sub && <p className={`text-xs mt-0.5 ${pnl !== undefined ? (pnl >= 0 ? 'text-emerald-500' : 'text-red-400') : 'text-slate-400'}`}>{sub}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Positions table */}
      {positions.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Ticker</th>
                  <th className="text-right px-4 py-3">Akcií</th>
                  <th className="text-right px-4 py-3">Nákup</th>
                  <th className="text-right px-4 py-3">Aktuální</th>
                  <th className="text-right px-4 py-3">P&L</th>
                  <th className="text-right px-4 py-3">P&L %</th>
                  <th className="text-left px-4 py-3">Datum</th>
                  <th className="text-left px-4 py-3">Poznámka</th>
                  <th className="text-center px-4 py-3">AI signál</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {positions.map((p) => {
                  const cur = prices[p.symbol]?.price ?? null
                  const pnl = cur !== null ? (cur - p.buyPrice) * p.shares : null
                  const pnlPct = cur !== null ? ((cur - p.buyPrice) / p.buyPrice) * 100 : null
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <Link href={`/stock/${p.symbol}`} className="font-bold text-[#6c63ff] hover:underline">{p.symbol}</Link>
                      </td>
                      <td className="px-4 py-3.5 text-right text-slate-700 tabular-nums">{p.shares}</td>
                      <td className="px-4 py-3.5 text-right text-slate-700 tabular-nums">${p.buyPrice.toFixed(2)}</td>
                      <td className="px-4 py-3.5 text-right tabular-nums">
                        {cur !== null
                          ? <span className="text-slate-900 font-medium">${cur.toFixed(2)}</span>
                          : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums">
                        {pnl !== null ? <PnLColor value={pnl} /> : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums">
                        {pnlPct !== null
                          ? <span className={`font-semibold ${pnlPct >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                            </span>
                          : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-slate-400">{p.buyDate}</td>
                      <td className="px-4 py-3.5 text-slate-400 max-w-[160px] truncate">{p.note || '—'}</td>
                      <td className="px-4 py-3.5 text-center">
                        {(() => {
                          const sig = signals[p.symbol]
                          if (!sig) return (
                            <button onClick={() => reanalyze(p.symbol)} disabled={reanalyzing === p.symbol}
                              className="text-xs text-[#6c63ff] hover:underline disabled:opacity-50">
                              {reanalyzing === p.symbol ? '…' : 'Analyzovat'}
                            </button>
                          )
                          const cur = prices[p.symbol]?.price ?? null
                          const drift = cur !== null ? ((cur - sig.price) / sig.price * 100) : null
                          const stale = (Date.now() - new Date(sig.analyzedAt).getTime()) > 7 * 86400000
                          const alert = drift !== null && (
                            (sig.signal === 'BUY' && drift < -7) ||
                            (sig.signal === 'SELL' && drift > 7) ||
                            Math.abs(drift) > 10
                          )
                          const sigColors = { BUY: 'text-emerald-600 bg-emerald-50 border-emerald-200', HOLD: 'text-amber-600 bg-amber-50 border-amber-200', SELL: 'text-red-500 bg-red-50 border-red-200' }
                          const sigLabels = { BUY: 'KUP', HOLD: 'DRŽ', SELL: 'PRODEJ' }
                          return (
                            <div className="flex flex-col items-center gap-1">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-bold ${sigColors[sig.signal]}`}>
                                {sigLabels[sig.signal]}
                              </span>
                              {drift !== null && (
                                <span className={`text-xs tabular-nums ${drift >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                                  {drift >= 0 ? '+' : ''}{drift.toFixed(1)}% od anal.
                                </span>
                              )}
                              {(alert || stale) && (
                                <button onClick={() => reanalyze(p.symbol)} disabled={reanalyzing === p.symbol}
                                  className="text-xs text-amber-600 hover:text-amber-700 disabled:opacity-50 font-medium">
                                  {reanalyzing === p.symbol ? '…' : (alert ? '⚠️ Re-analyzovat' : '🔄 Zastaralé')}
                                </button>
                              )}
                            </div>
                          )
                        })()}
                      </td>
                      <td className="px-4 py-3.5">
                        <button onClick={() => deletePosition(p.id)}
                          className="text-slate-300 hover:text-red-400 transition-colors text-xs">
                          Smazat
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 bg-[#6c63ff]/10 rounded-2xl flex items-center justify-center text-4xl mb-6">💼</div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Portfolio je prázdné</h2>
          <p className="text-slate-500 max-w-md mb-6">Přidej první pozici a sleduj výkonnost svých investic v reálném čase.</p>
          <button onClick={() => setShowForm(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-[#6c63ff] to-[#818cf8] hover:shadow-lg hover:shadow-[#6c63ff]/30 hover:-translate-y-px text-white rounded-lg font-medium transition-all shadow-md shadow-[#6c63ff]/20">
            + Přidat první pozici
          </button>
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
