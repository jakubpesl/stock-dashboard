import { CacheEntry, getCache, saveCache, isCacheFresh } from './storage'

interface ChartMeta {
  regularMarketPrice: number
  chartPreviousClose?: number
  previousClose?: number
  regularMarketOpen?: number
  regularMarketDayHigh?: number
  regularMarketDayLow?: number
  regularMarketVolume?: number
  fiftyTwoWeekHigh?: number
  fiftyTwoWeekLow?: number
  marketCap?: number
}

interface ChartResponse {
  chart: {
    result?: Array<{
      meta: ChartMeta
      timestamp?: number[]
      indicators?: {
        quote?: Array<{
          open?: (number | null)[]
          high?: (number | null)[]
          low?: (number | null)[]
          close?: (number | null)[]
          volume?: (number | null)[]
        }>
      }
    }>
    error?: { code: string; description: string }
  }
}

export async function fetchStockData(ticker: string): Promise<CacheEntry | null> {
  const cached = getCache(ticker)
  if (isCacheFresh(cached)) return cached

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1y&includePrePost=false`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      cache: 'no-store',
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const json: ChartResponse = await res.json()
    const result = json.chart.result?.[0]
    if (!result) throw new Error(json.chart.error?.description ?? 'No data returned')

    const meta = result.meta
    const timestamps = result.timestamp ?? []
    const q = result.indicators?.quote?.[0] ?? {}
    const closes = q.close ?? []

    const history: { date: string; close: number }[] = []
    for (let i = 0; i < timestamps.length; i++) {
      const c = closes[i]
      if (c != null) {
        history.push({
          date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
          close: parseFloat(c.toFixed(2)),
        })
      }
    }
    history.sort((a, b) => a.date.localeCompare(b.date))

    const price = parseFloat((meta.regularMarketPrice ?? 0).toFixed(2))
    // Use second-to-last historical point for day-over-day change (chartPreviousClose is start of range)
    const prevDayClose = history.length >= 2
      ? history[history.length - 2].close
      : (meta.chartPreviousClose ?? meta.previousClose ?? price)
    const change = parseFloat((price - prevDayClose).toFixed(2))
    const changePercent = prevDayClose ? parseFloat(((change / prevDayClose) * 100).toFixed(2)) : 0

    const lastIdx = Math.max(0, closes.length - 1)
    const open = parseFloat(((meta.regularMarketOpen ?? q.open?.[lastIdx] ?? price) as number).toFixed(2))
    const high = parseFloat(((meta.regularMarketDayHigh ?? q.high?.[lastIdx] ?? price) as number).toFixed(2))
    const low = parseFloat(((meta.regularMarketDayLow ?? q.low?.[lastIdx] ?? price) as number).toFixed(2))
    const volume = (meta.regularMarketVolume ?? q.volume?.[lastIdx] ?? 0) as number

    const allCloses = history.map((h) => h.close)
    const high52w = parseFloat((meta.fiftyTwoWeekHigh ?? (allCloses.length ? Math.max(...allCloses) : 0)).toFixed(2))
    const low52w = parseFloat((meta.fiftyTwoWeekLow ?? (allCloses.length ? Math.min(...allCloses) : 0)).toFixed(2))

    const now = Date.now()
    const entry: CacheEntry = {
      ticker,
      price,
      change,
      changePercent,
      open,
      high,
      low,
      volume,
      high52w,
      low52w,
      marketCap: meta.marketCap ?? 0,
      history7d: history.filter((h) => new Date(h.date).getTime() > now - 7 * 86400000),
      history1m: history.filter((h) => new Date(h.date).getTime() > now - 30 * 86400000),
      history3m: history.filter((h) => new Date(h.date).getTime() > now - 90 * 86400000),
      history1y: history,
      fetchedAt: new Date().toISOString(),
    }

    saveCache(entry)
    return entry
  } catch (err) {
    console.error(`Yahoo Finance error for ${ticker}:`, err)
    return cached ?? null
  }
}
