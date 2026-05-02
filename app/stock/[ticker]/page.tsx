'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import StockChart from '@/components/StockChart'
import AISignalBadge from '@/components/AISignalBadge'
import NewsFeed from '@/components/NewsFeed'

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
interface Signal {
  signal: 'BUY' | 'HOLD' | 'SELL'; confidence: number; risk: string
  reasoning: string; analyzedAt: string; price: number
  newsSentiment: { headline: string; sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' }[]
  headlines: { title: string; url: string; source: string; publishedAt: string }[]
}

function fmtCap(n: number) {
  if (!n) return '—'
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}mld`
  return `$${(n / 1e6).toFixed(0)}M`
}

export default function StockDetail() {
  const { ticker } = useParams<{ ticker: string }>()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('1M')
  const [data, setData] = useState<MarketData | null>(null)
  const [signal, setSignal] = useState<Signal | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeMsg, setAnalyzeMsg] = useState('')

  useEffect(() => {
    fetch(`/api/stock/${ticker}`)
      .then((r) => r.json())
      .then((json) => { setData(json.data); setSignal(json.signal) })
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
      const json = await res.json() as { results?: Signal[]; error?: string; errors?: string[]; analyzed?: number }
      if (json.results?.[0]) {
        setSignal(json.results[0])
        setAnalyzeMsg('Analýza dokončena.')
      } else {
        const detail = json.errors?.join('; ') ?? json.error ?? 'Neznámá chyba'
        setAnalyzeMsg(`Chyba: ${detail}`)
      }
    } catch (e) {
      setAnalyzeMsg(`Chyba: ${String(e)}`)
    }
    setAnalyzing(false)
    setTimeout(() => setAnalyzeMsg(''), 6000)
  }

  const chartData = data ? data[tabMap[tab]] : []

  const metrics = data ? [
    ['Otevření', `$${data.open.toFixed(2)}`],
    ['Max dne', `$${data.high.toFixed(2)}`],
    ['Min dne', `$${data.low.toFixed(2)}`],
    ['Objem', data.volume.toLocaleString('cs-CZ')],
    ['52t max', `$${data.high52w.toFixed(2)}`],
    ['52t min', `$${data.low52w.toFixed(2)}`],
    ['Tržní kap.', fmtCap(data.marketCap)],
  ] : []

  return (
    <div>
      <button onClick={() => router.back()}
        className="flex items-center gap-2 text-[#94a3b8] hover:text-[#f1f5f9] mb-6 transition-colors text-sm">
        ← Zpět
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#f1f5f9]">{ticker}</h1>
          {data && (
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-2xl font-semibold text-[#f1f5f9]">${data.price.toFixed(2)}</span>
              <span className={`text-lg font-medium ${data.changePercent >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                {data.changePercent >= 0 ? '+' : ''}{data.changePercent.toFixed(2)}%
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <button onClick={analyze} disabled={analyzing}
            className="px-5 py-2.5 bg-[#6c63ff] hover:bg-[#6c63ff]/80 disabled:opacity-50 text-white rounded-lg font-medium transition-colors">
            {analyzing ? '🤖 Analyzuji…' : '🤖 Analyzovat nyní'}
          </button>
          {analyzeMsg && (
            <span className={`text-xs ${analyzeMsg.startsWith('Analýza dokončena') ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
              {analyzeMsg}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-[#1a1a24] border border-[#2a2a3a] rounded-xl p-5">
          <div className="flex gap-2 mb-4">
            {(['1T', '1M', '3M', '1R'] as Tab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-[#6c63ff] text-white' : 'text-[#94a3b8] hover:text-[#f1f5f9]'}`}>
                {t}
              </button>
            ))}
          </div>
          {chartData && chartData.length > 0
            ? <StockChart data={chartData} />
            : <div className="h-64 flex items-center justify-center text-[#94a3b8]">Načítám…</div>
          }
        </div>

        <div className="bg-[#1a1a24] border border-[#2a2a3a] rounded-xl p-5">
          <h3 className="font-semibold text-[#f1f5f9] mb-4">Klíčové údaje</h3>
          {metrics.length > 0 ? (
            <dl className="space-y-2.5 text-sm">
              {metrics.map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-[#94a3b8]">{label}</dt>
                  <dd className="font-medium text-[#f1f5f9]">{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-[#94a3b8] text-sm">Načítám…</p>
          )}
        </div>
      </div>

      {signal && (
        <div className="bg-[#1a1a24] border border-[#2a2a3a] rounded-xl p-5 mb-6">
          <h3 className="font-semibold text-[#f1f5f9] mb-4">AI Analýza</h3>
          <AISignalBadge signal={signal.signal} confidence={signal.confidence} />
          <p className="text-[#94a3b8] text-sm mt-3 leading-relaxed">{signal.reasoning}</p>
          <div className="flex gap-4 mt-3 text-xs text-[#94a3b8]">
            <span>Riziko: <span className="text-[#f1f5f9]">{signal.risk}</span></span>
            <span>Analyzováno: <span className="text-[#f1f5f9]">{new Date(signal.analyzedAt).toLocaleString('cs-CZ')}</span></span>
          </div>
        </div>
      )}

      <div className="bg-[#1a1a24] border border-[#2a2a3a] rounded-xl p-5">
        <h3 className="font-semibold text-[#f1f5f9] mb-4">Zprávy</h3>
        <NewsFeed headlines={signal?.headlines ?? []} newsSentiment={signal?.newsSentiment ?? []} />
      </div>
    </div>
  )
}
