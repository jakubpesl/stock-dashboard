import _yahooFinance from 'yahoo-finance2'
// bundler moduleResolution types the default export as constructor; cast to instance type
const yahooFinance = _yahooFinance as unknown as InstanceType<typeof _yahooFinance>
import { CacheEntry, getCache, saveCache, isCacheFresh } from './storage'

export async function fetchStockData(ticker: string): Promise<CacheEntry | null> {
  const cached = getCache(ticker)
  if (isCacheFresh(cached)) return cached

  try {
    const [quote, hist1y] = await Promise.all([
      yahooFinance.quote(ticker),
      yahooFinance.historical(ticker, {
        period1: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        period2: new Date(),
        interval: '1d',
      }),
    ])

    const sorted = hist1y.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const toPoints = (arr: typeof sorted) =>
      arr.map((h) => ({ date: h.date.toISOString().split('T')[0], close: parseFloat((h.close ?? 0).toFixed(2)) }))

    const now = Date.now()
    const entry: CacheEntry = {
      ticker,
      price: parseFloat((quote.regularMarketPrice ?? 0).toFixed(2)),
      change: parseFloat((quote.regularMarketChange ?? 0).toFixed(2)),
      changePercent: parseFloat((quote.regularMarketChangePercent ?? 0).toFixed(2)),
      open: parseFloat((quote.regularMarketOpen ?? 0).toFixed(2)),
      high: parseFloat((quote.regularMarketDayHigh ?? 0).toFixed(2)),
      low: parseFloat((quote.regularMarketDayLow ?? 0).toFixed(2)),
      volume: quote.regularMarketVolume ?? 0,
      high52w: parseFloat((quote.fiftyTwoWeekHigh ?? 0).toFixed(2)),
      low52w: parseFloat((quote.fiftyTwoWeekLow ?? 0).toFixed(2)),
      marketCap: quote.marketCap ?? 0,
      history7d: toPoints(sorted.filter((h) => new Date(h.date).getTime() > now - 7 * 86400000)),
      history1m: toPoints(sorted.filter((h) => new Date(h.date).getTime() > now - 30 * 86400000)),
      history3m: toPoints(sorted.filter((h) => new Date(h.date).getTime() > now - 90 * 86400000)),
      history1y: toPoints(sorted),
      fetchedAt: new Date().toISOString(),
    }

    saveCache(entry)
    return entry
  } catch (err) {
    console.error(`Yahoo Finance error for ${ticker}:`, err)
    return cached ?? null
  }
}
