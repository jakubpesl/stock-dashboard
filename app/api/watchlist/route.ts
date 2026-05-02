import { NextRequest, NextResponse } from 'next/server'
import { getWatchlist, saveWatchlist, Ticker } from '@/lib/storage'

export async function GET() {
  return NextResponse.json(getWatchlist())
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const wl = getWatchlist()
    if (wl.tickers.length >= 10) {
      return NextResponse.json({ error: 'Maximum 10 tickerů' }, { status: 400 })
    }
    if (wl.tickers.find((t) => t.symbol === body.symbol.toUpperCase())) {
      return NextResponse.json({ error: 'Ticker již existuje' }, { status: 400 })
    }
    const ticker: Ticker = {
      symbol: body.symbol.toUpperCase(),
      alias: body.alias || body.symbol.toUpperCase(),
      addedAt: new Date().toISOString(),
      notificationsEnabled: true,
    }
    saveWatchlist({ tickers: [...wl.tickers, ticker] })
    return NextResponse.json({ ok: true, ticker })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol')
  if (!symbol) return NextResponse.json({ error: 'Symbol required' }, { status: 400 })
  const wl = getWatchlist()
  saveWatchlist({ tickers: wl.tickers.filter((t) => t.symbol !== symbol.toUpperCase()) })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const wl = getWatchlist()
    const updated = wl.tickers.map((t) =>
      t.symbol === body.symbol ? { ...t, ...body } : t
    )
    saveWatchlist({ tickers: updated })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
