'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import StockChart from '@/components/StockChart'
import AISignalBadge from '@/components/AISignalBadge'
import NewsFeed from '@/components/NewsFeed'
import { detectCrossover, calcMA } from '@/lib/indicators'

const SIG_KEY = 'stock-signals'

type Tab = '1T' | '1M' | '3M' | '1R'
type HistKey = 'history7d' | 'history1m' | 'history3m' | 'history1y'
const tabMap: Record<Tab, HistKey> = { '1T': 'history7d', '1M': 'history1m', '3M': 'history3m', '1R': 'history1y' }

interface Point { date: string; close: number; volume?: number }
interface MarketData {
  price: number; change: number; changePercent: number
  open: number; high: number; low: number; volume: number
  high52w: number; low52w: number; marketCap: number
  history7d: Point[]; history1m: Point[]; history3m: Point[]; history1y: Point[]
}
interface Fundamentals {
  pe: number | null; forwardPe: number | null; eps: number | null
  dividendYield: number | null; beta: number | null
  analystTargetPrice: number | null; analystCount: number | null; analystKey: string | null
  insiderBuys: number; insiderSells: number; insiderNetValue: number
}
interface TermSignal {
  signal: 'BUY' | 'HOLD' | 'SELL'; confidence: number; reasoning: string
  priceTarget?: number; stopLoss?: number; riskReward?: number
}
interface Signal {
  signal: 'BUY' | 'HOLD' | 'SELL'; confidence: number; risk: string
  reasoning: string; analyzedAt: string; price: number
  priceTarget?: number; horizon?: string
  shortTerm?: TermSignal; longTerm?: TermSignal
  newsSentiment: { headline: string; sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' }[]
  headlines: { title: string; url: string; source: string; publishedAt: string }[]
}

function fmtCap(n: number) {
  if (!n) return '—'
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)} mld`
  return `$${(n / 1e6).toFixed(0)}M`
}

export default function StockDetail() {
  const { ticker } = useParams<{ ticker: string }>()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('3M')
  const [data, setData] = useState<MarketData | null>(null)
  const [signal, setSignal] = useState<Signal | null>(null)
  const [earningsDate, setEarningsDate] = useState<string | null>(null)
  const [fundamentals, setFundamentals] = useState<Fundamentals | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeMsg, setAnalyzeMsg] = useState('')

  useEffect(() => {
    fetch(`/api/stock/${ticker}`)
      .then((r) => r.json())
      .then((json) => {
        setData(json.data)
        setEarningsDate(json.earningsDate ?? null)
        setFundamentals(json.fundamentals ?? null)
        if (json.signal) {
          setSignal(json.signal)
        } else {
          const stored = localStorage.getItem(SIG_KEY)
          const saved: Record<string, Signal> = stored ? JSON.parse(stored) : {}
          setSignal(saved[ticker] ?? null)
        }
      })
  }, [ticker])

  async function analyze() {
    setAnalyzing(true)
    setAnalyzeMsg('')
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers: [ticker] }),
      })
      const json = await res.json() as { results?: Signal[]; error?: string; errors?: string[] }
      if (json.results?.[0]) {
        const sig = json.results[0]
        setSignal(sig)
        const stored = localStorage.getItem(SIG_KEY)
        const saved: Record<string, Signal> = stored ? JSON.parse(stored) : {}
        saved[ticker] = sig
        localStorage.setItem(SIG_KEY, JSON.stringify(saved))
        setAnalyzeMsg('✓ Analýza dokončena.')
      } else {
        setAnalyzeMsg(`Chyba: ${json.errors?.join('; ') ?? json.error ?? 'Neznámá chyba'}`)
      }
    } catch (e) {
      setAnalyzeMsg(`Chyba: ${String(e)}`)
    }
    setAnalyzing(false)
    setTimeout(() => setAnalyzeMsg(''), 6000)
  }

  const chartData = data ? data[tabMap[tab]] : []
  const isUp = (data?.changePercent ?? 0) >= 0
  const closes1y = data?.history1y.map((h) => h.close) ?? []
  const crossover = closes1y.length >= 202 ? detectCrossover(closes1y) : null
  const ma50  = calcMA(closes1y, 50)
  const ma200 = calcMA(closes1y, 200)

  // AI track record
  const signalPnL = signal && data
    ? parseFloat(((data.price - signal.price) / signal.price * 100).toFixed(2))
    : null
  const signalDaysAgo = signal
    ? Math.floor((Date.now() - new Date(signal.analyzedAt).getTime()) / 86400000)
    : null
  const trackCorrect = signalPnL !== null && signal
    ? (signal.signal === 'BUY' && signalPnL > 0) || (signal.signal === 'SELL' && signalPnL < 0)
    : null

  const daysToEarnings = earningsDate
    ? Math.ceil((new Date(earningsDate).getTime() - Date.now()) / 86400000)
    : null

  const analystUpside = fundamentals?.analystTargetPrice && data
    ? parseFloat(((fundamentals.analystTargetPrice - data.price) / data.price * 100).toFixed(1))
    : null
  const analystKeyLabel: Record<string, string> = {
    'strong_buy': 'Silně KUP', 'buy': 'KUP', 'hold': 'DRŽ', 'sell': 'PRODEJ', 'strong_sell': 'Silně PRODEJ',
  }
  const analystKeyColor: Record<string, string> = {
    'strong_buy': 'text-emerald-700', 'buy': 'text-emerald-600', 'hold': 'text-amber-600',
    'sell': 'text-red-500', 'strong_sell': 'text-red-600',
  }

  const metricGroups = data ? [
    [
      ['Otevření', `$${data.open.toFixed(2)}`],
      ['Max dne',  `$${data.high.toFixed(2)}`],
      ['Min dne',  `$${data.low.toFixed(2)}`],
      ['Objem',    data.volume.toLocaleString('cs-CZ')],
    ],
    [
      ['52t max',    `$${data.high52w.toFixed(2)}`],
      ['52t min',    `$${data.low52w.toFixed(2)}`],
      ['Tržní kap.', fmtCap(data.marketCap)],
    ],
    [
      ...(fundamentals?.pe        ? [['P/E',         `${fundamentals.pe.toFixed(1)}×`]]          : []),
      ...(fundamentals?.forwardPe ? [['Fwd P/E',     `${fundamentals.forwardPe.toFixed(1)}×`]]   : []),
      ...(fundamentals?.eps       ? [['EPS',         `$${fundamentals.eps.toFixed(2)}`]]          : []),
      ...(fundamentals?.beta      ? [['Beta',        `${fundamentals.beta}`]]                     : []),
      ...(fundamentals?.dividendYield ? [['Div. yield', `${fundamentals.dividendYield}%`]]        : []),
    ].filter(Boolean),
    [
      ...(ma50  ? [['vs MA50',  `${data.price > ma50  ? '▲' : '▼'} $${ma50}`]]  : []),
      ...(ma200 ? [['vs MA200', `${data.price > ma200 ? '▲' : '▼'} $${ma200}`]] : []),
      ...(earningsDate ? [['Výsledky', `za ${daysToEarnings}d`]] : []),
    ].filter(Boolean),
  ].filter((g) => g.length > 0) : []

  return (
    <div>
      <button onClick={() => router.back()}
        className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 mb-6 transition-colors text-sm font-medium">
        ← Zpět
      </button>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{ticker}</h1>
          {data && (
            <div className="flex items-baseline gap-3 mt-1 flex-wrap">
              <span className="text-2xl font-semibold text-slate-900">${data.price.toFixed(2)}</span>
              <span className={`text-base font-semibold tabular-nums ${isUp ? 'text-emerald-600' : 'text-red-500'}`}>
                {isUp ? '+' : ''}{data.change.toFixed(2)} ({isUp ? '+' : ''}{data.changePercent.toFixed(2)}%)
              </span>
              {earningsDate && daysToEarnings !== null && daysToEarnings >= 0 && daysToEarnings <= 30 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold rounded-full">
                  📅 Výsledky za {daysToEarnings}d
                </span>
              )}
              {crossover === 'golden_cross' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-300 text-amber-700 text-xs font-semibold rounded-full">
                  ⭐ Golden Cross
                </span>
              )}
              {crossover === 'death_cross' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 border border-slate-300 text-slate-600 text-xs font-semibold rounded-full">
                  ☠️ Death Cross
                </span>
              )}
              {fundamentals && fundamentals.insiderBuys > fundamentals.insiderSells && fundamentals.insiderBuys > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-full">
                  📈 Insideři kupují ({fundamentals.insiderBuys}×)
                </span>
              )}
              {fundamentals && fundamentals.insiderSells > fundamentals.insiderBuys && fundamentals.insiderSells > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-full">
                  📉 Insideři prodávají ({fundamentals.insiderSells}×)
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <button onClick={analyze} disabled={analyzing}
            className="px-5 py-2.5 bg-[#6c63ff] hover:bg-[#6c63ff]/90 disabled:opacity-50 text-white rounded-lg font-medium transition-colors shadow-sm">
            {analyzing ? '🤖 Analyzuji…' : '🤖 Analyzovat nyní'}
          </button>
          {analyzeMsg && (
            <span className={`text-xs font-medium ${analyzeMsg.startsWith('✓') ? 'text-emerald-600' : 'text-red-500'}`}>
              {analyzeMsg}
            </span>
          )}
        </div>
      </div>

      {/* Chart + metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex gap-1 mb-5">
            {(['1T', '1M', '3M', '1R'] as Tab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${tab === t ? 'bg-[#6c63ff] text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}>
                {t}
              </button>
            ))}
          </div>
          {chartData && chartData.length > 0
            ? <StockChart data={chartData} />
            : <div className="h-64 flex items-center justify-center text-slate-400">Načítám…</div>
          }
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-0">
          <h3 className="font-semibold text-slate-900 mb-4">Klíčové údaje</h3>
          {metricGroups.length > 0 ? (
            <dl className="text-sm space-y-0">
              {metricGroups.map((group, gi) => (
                <div key={gi}>
                  {gi > 0 && <div className="border-t border-slate-100 my-3" />}
                  <div className="space-y-2.5">
                    {group.map(([label, value]) => (
                      <div key={label} className="flex justify-between items-center">
                        <dt className="text-slate-400">{label}</dt>
                        <dd className="font-semibold text-slate-900 tabular-nums">{value}</dd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-slate-400 text-sm">Načítám…</p>
          )}

          {/* Analyst consensus */}
          {fundamentals?.analystTargetPrice && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Analytici</p>
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Konsenzus</span>
                <span className={`font-bold text-sm ${analystKeyColor[fundamentals.analystKey ?? ''] ?? 'text-slate-700'}`}>
                  {analystKeyLabel[fundamentals.analystKey ?? ''] ?? fundamentals.analystKey ?? '—'}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Cílová cena</span>
                <span className="font-bold text-sm text-[#6c63ff]">
                  ${fundamentals.analystTargetPrice.toFixed(2)}
                  {analystUpside !== null && (
                    <span className={`ml-1.5 text-xs font-semibold ${analystUpside >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      ({analystUpside >= 0 ? '+' : ''}{analystUpside}%)
                    </span>
                  )}
                </span>
              </div>
              {fundamentals.analystCount && (
                <p className="text-xs text-slate-400">{fundamentals.analystCount} analytiků</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* AI Signal */}
      {signal && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-5 shadow-sm">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="font-semibold text-slate-900">AI Analýza</h3>
              {/* Track record badge */}
              {signalPnL !== null && signalDaysAgo !== null && signalDaysAgo > 0 && (
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                  trackCorrect
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-red-50 border-red-200 text-red-600'
                }`}>
                  {signal.signal} za ${signal.price.toFixed(2)} →
                  {signalPnL >= 0 ? ' +' : ' '}{signalPnL}% ({signalDaysAgo}d)
                </span>
              )}
            </div>
            <span className="text-xs text-slate-400">
              {new Date(signal.analyzedAt).toLocaleString('cs-CZ')}
            </span>
          </div>

          {/* Short + Long term side by side */}
          {(signal.shortTerm || signal.longTerm) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {signal.shortTerm && (() => {
                const borderCol = signal.shortTerm.signal === 'BUY' ? 'border-l-emerald-400' : signal.shortTerm.signal === 'SELL' ? 'border-l-red-400' : 'border-l-amber-400'
                return (
                  <div className={`bg-slate-50 border border-slate-200 border-l-4 ${borderCol} rounded-xl p-4`}>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Krátkodobý · 1–4 týdny</p>
                    <AISignalBadge signal={signal.shortTerm.signal} confidence={signal.shortTerm.confidence} />
                    <p className="text-slate-600 text-sm mt-3 leading-relaxed">{signal.shortTerm.reasoning}</p>
                    <div className="flex flex-wrap gap-3 mt-3 text-xs">
                      {signal.shortTerm.stopLoss && (
                        <span className="text-slate-400">Stop-loss: <span className="text-red-500 font-semibold">${signal.shortTerm.stopLoss}</span></span>
                      )}
                      {signal.shortTerm.riskReward && (
                        <span className="text-slate-400">R:R: <span className="text-emerald-600 font-semibold">1:{signal.shortTerm.riskReward.toFixed(1)}</span></span>
                      )}
                    </div>
                  </div>
                )
              })()}
              {signal.longTerm && (() => {
                const borderCol = signal.longTerm.signal === 'BUY' ? 'border-l-emerald-400' : signal.longTerm.signal === 'SELL' ? 'border-l-red-400' : 'border-l-amber-400'
                return (
                  <div className={`bg-slate-50 border border-slate-200 border-l-4 ${borderCol} rounded-xl p-4`}>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Dlouhodobý · 3–12 měsíců</p>
                    <AISignalBadge signal={signal.longTerm.signal} confidence={signal.longTerm.confidence} />
                    <p className="text-slate-600 text-sm mt-3 leading-relaxed">{signal.longTerm.reasoning}</p>
                    <div className="flex flex-wrap gap-3 mt-3 text-xs">
                      {signal.longTerm.priceTarget && (
                        <span className="text-slate-400">Cíl: <span className="text-[#6c63ff] font-semibold">${signal.longTerm.priceTarget}</span></span>
                      )}
                      {signal.longTerm.stopLoss && (
                        <span className="text-slate-400">Stop-loss: <span className="text-red-500 font-semibold">${signal.longTerm.stopLoss}</span></span>
                      )}
                      {signal.longTerm.riskReward && (
                        <span className="text-slate-400">R:R: <span className="text-emerald-600 font-semibold">1:{signal.longTerm.riskReward.toFixed(1)}</span></span>
                      )}
                    </div>
                  </div>
                )
              })()}
            </div>
          ) : (
            <div className="mb-4">
              <AISignalBadge signal={signal.signal} confidence={signal.confidence} />
              {signal.priceTarget && (
                <p className="text-xs mt-2 text-slate-400">
                  Cílová cena: <span className="text-[#6c63ff] font-bold">${signal.priceTarget}</span>
                  {signal.horizon && <span> ({signal.horizon})</span>}
                </p>
              )}
            </div>
          )}

          {/* Summary + risk */}
          <div className="pt-3 border-t border-slate-100">
            <p className="text-slate-600 text-sm leading-relaxed mb-2">{signal.reasoning}</p>
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
              Riziko:
              <span className={`font-semibold ${signal.risk === 'LOW' ? 'text-emerald-600' : signal.risk === 'HIGH' ? 'text-red-500' : 'text-amber-600'}`}>
                {signal.risk === 'LOW' ? 'Nízké' : signal.risk === 'HIGH' ? 'Vysoké' : 'Střední'}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* News */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-slate-900 mb-4">Zprávy</h3>
        <NewsFeed headlines={signal?.headlines ?? []} newsSentiment={signal?.newsSentiment ?? []} />
      </div>
    </div>
  )
}
