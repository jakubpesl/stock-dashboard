import { NextResponse } from 'next/server'
import { getWatchlist } from '@/lib/storage'
import { fetchStockData } from '@/lib/yahooFinance'

export async function POST() {
  try {
    const { tickers } = getWatchlist()
    const results = await Promise.allSettled(tickers.map((t) => fetchStockData(t.symbol)))
    const success = results.filter((r) => r.status === 'fulfilled').length
    return NextResponse.json({ refreshed: success, total: tickers.length })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
