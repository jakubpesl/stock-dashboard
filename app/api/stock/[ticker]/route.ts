import { NextRequest, NextResponse } from 'next/server'
import { fetchStockData, fetchEarningsDate, fetchFundamentals } from '@/lib/yahooFinance'
import { getSignal } from '@/lib/storage'

export async function GET(
  _req: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase()
  const [data, signal, earningsDate, fundamentals] = await Promise.all([
    fetchStockData(ticker),
    Promise.resolve(getSignal(ticker)),
    fetchEarningsDate(ticker),
    fetchFundamentals(ticker),
  ])
  return NextResponse.json({ data, signal, earningsDate, fundamentals })
}
