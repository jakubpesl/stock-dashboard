'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import StockChart from '@/components/StockChart'
import AISignalBadge from '@/components/AISignalBadge'
import NewsFeed from '@/components/NewsFeed'

const SIG_KEY = 'stock-signals'

type Tab = '1T' | '1M' | '3M' | '1R'
type HistKey = 'history7d' | 'history1m' | 'history3m' | 'history1y'
const tabMap: Record<Tab, HistKey> = { '1T': 'history7d', '1M': 'history1m', '3M': 'history3m', '1R': 'history1y' }

interface Point { date: string; close: number }
interface MarketData {
  price: number; change: number; changePercent: number
  open: number; high: number; low: number; volume: number
  high52w: number; low52w: number; marketCap: number
  history7d: Point[]; history1m: Point[]; history3m: Point[]; history1y: Point[]
}
interface TermSignal {
  signal: 'BUY' | 'HOLD' | 'SELL'; confidence: number; reasoning: string; priceTarget?: number
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
  const [tab, setTab] = useState<Tab>('1M')
  const [data, setData] = useState<MarketData | null>(null)
  const [signal, setSignal] = useState<Signal | null>(null)
  const [earningsDate, setEarningsDate] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeMsg, setAnalyzeMsg] = useState('')

  useEffect(() => {
    fetch(`/api/stock/${ticker}`)
      .then((r) => r.json())
      .then((json) => {
        setData(json.data)
        setEarningsDate(json.earningsDate ?? null)
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

  const daysToEarnings = earningsDate
    ? Math.ceil((new Date(earningsDate).getTime() - Date.now()) / 86400000)
    : null

  const metrics = data ? [
    ['Otevření', `$${data.open.toFixed(2)}`],
    ['Max dne', `$${data.high.toFixed(2)}`],
    ['Min dne', `$${data.low.toFixed(2)}`],
    ['Objem', data.volume.toLocaleString('cs-CZ')],
    ['52t max', `$${data.high52w.toFixed(2)}`],
    ['52t min', `$${data.low52w.toFixed(2)}`],
    ['Tržní kap.', fmtCap(data.marketCap)],
    ...(earningsDate ? [['Výsledky', `${earningsDate} (za ${daysToEarnings}d)`]] : []),
  ] : []

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
              <span className={`text-lg font-semibold ${isUp ? 'text-emerald-600' : 'text-red-500'}`}>
                {isUp ? '+' : ''}{data.changePercent.toFixed(2)}%
              </span>
              {earningsDate && daysToEarnings !== null && daysToEarnings >= 0 && daysToEarnings <= 30 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold rounded-full">
                  📅 Výsledky za {daysToEarnings}d
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

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">Klíčové údaje</h3>
          {metrics.length > 0 ? (
            <dl className="space-y-3 text-sm">
              {metrics.map(([label, value]) => (
                <div key={label} className="flex justify-between items-center">
                  <dt className="text-slate-400">{label}</dt>
                  <dd className="font-semibold text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-slate-400 text-sm">Načítám…</p>
          )}
        </div>
      </div>

      {/* AI Signal */}
      {signal && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-5 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-slate-900">AI Analýza</h3>
            <span className="text-xs text-slate-400">
              {new Date(signal.analyzedAt).toLocaleString('cs-CZ')}
            </span>
          </div>

          {/* Short + Long term side by side */}
          {(signal.shortTerm || signal.longTerm) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {signal.shortTerm && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Krátkodobý · 1–4 týdny</p>
                  <AISignalBadge signal={signal.shortTerm.signal} confidence={signal.shortTerm.confidence} />
                  <p className="text-slate-600 text-sm mt-3 leading-relaxed">{signal.shortTerm.reasoning}</p>
                </div>
              )}
              {signal.longTerm && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Dlouhodobý · 3–12 měsíců</p>
                  <AISignalBadge signal={signal.longTerm.signal} confidence={signal.longTerm.confidence} />
                  <p className="text-slate-600 text-sm mt-3 leading-relaxed">{signal.longTerm.reasoning}</p>
                  {signal.longTerm.priceTarget && (
                    <p className="text-xs mt-2 text-slate-400">
                      Cílová cena: <span className="text-[#6c63ff] font-bold">${signal.longTerm.priceTarget}</span>
                    </p>
                  )}
                </div>
              )}
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
