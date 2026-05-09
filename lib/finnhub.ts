const BASE = 'https://finnhub.io/api/v1'

function token() {
  return process.env.FINNHUB_API_KEY ?? ''
}

async function get<T>(path: string, params: Record<string, string> = {}): Promise<T | null> {
  try {
    const qs = new URLSearchParams({ ...params, token: token() }).toString()
    const res = await fetch(`${BASE}${path}?${qs}`, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    return await res.json() as T
  } catch {
    return null
  }
}

export interface FinnhubInsider {
  netBuys: number
  netSells: number
  netShares: number
  totalValue: number
  transactions: { name: string; shares: number; price: number; date: string; type: 'BUY' | 'SELL' }[]
}

export async function fetchFinnhubInsiders(symbol: string): Promise<FinnhubInsider | null> {
  const cutoff = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)
  const data = await get<{
    data: { name: string; change: number; transactionPrice: number; transactionDate: string; transactionCode: string }[]
  }>('/stock/insider-transactions', { symbol, from: cutoff })

  if (!data?.data?.length) return null

  const result: FinnhubInsider = { netBuys: 0, netSells: 0, netShares: 0, totalValue: 0, transactions: [] }
  for (const tx of data.data) {
    if (!tx.transactionDate || new Date(tx.transactionDate) < new Date(cutoff)) continue
    const isBuy = tx.transactionCode === 'P'
    const isSell = tx.transactionCode === 'S'
    if (!isBuy && !isSell) continue
    const shares = Math.abs(tx.change)
    const value = shares * (tx.transactionPrice ?? 0)
    if (isBuy) { result.netBuys++; result.netShares += shares; result.totalValue += value }
    if (isSell) { result.netSells++; result.netShares -= shares; result.totalValue -= value }
    result.transactions.push({
      name: tx.name, shares, price: tx.transactionPrice,
      date: tx.transactionDate, type: isBuy ? 'BUY' : 'SELL',
    })
  }
  return result
}

export interface EarningsSurprise {
  period: string
  actual: number
  estimate: number
  surprise: number
  surprisePct: number
}

export async function fetchEarningsSurprises(symbol: string): Promise<EarningsSurprise[]> {
  const data = await get<{ actual: number; estimate: number; surprise: number; surprisePercent: number; period: string }[]>(
    '/stock/earnings', { symbol, limit: '4' }
  )
  if (!data?.length) return []
  return data.map((e) => ({
    period: e.period,
    actual: e.actual,
    estimate: e.estimate,
    surprise: e.surprise,
    surprisePct: parseFloat((e.surprisePercent ?? 0).toFixed(1)),
  }))
}

export interface FinnhubNews {
  headline: string
  summary: string
  url: string
  source: string
  datetime: number
}

export async function fetchFinnhubNews(symbol: string): Promise<FinnhubNews[]> {
  const to = new Date().toISOString().slice(0, 10)
  const from = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
  const data = await get<FinnhubNews[]>('/company-news', { symbol, from, to })
  if (!data?.length) return []
  return data.slice(0, 8).map((n) => ({
    headline: n.headline,
    summary: n.summary,
    url: n.url,
    source: n.source,
    datetime: n.datetime,
  }))
}
