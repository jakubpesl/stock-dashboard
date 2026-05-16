import { NextRequest, NextResponse } from 'next/server'
import { fetchStockData, fetchEarningsDate, fetchFundamentals } from '@/lib/yahooFinance'
import { fetchFinnhubInsiders, fetchEarningsSurprises, fetchFinnhubNews } from '@/lib/finnhub'
import { fetchSecFinancials } from '@/lib/secEdgar'
import { getSignal } from '@/lib/storage'

export async function GET(
  req: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase()
  const priceOnly = req.nextUrl.searchParams.get('priceOnly') === 'true'

  if (priceOnly) {
    const [data, signal] = await Promise.all([
      fetchStockData(ticker),
      Promise.resolve(getSignal(ticker)),
    ])
    return NextResponse.json({ data, signal })
  }

  const [data, signal, earningsDate, fundamentals, insiders, earnings, finnhubNews, secFinancials] = await Promise.all([
    fetchStockData(ticker),
    Promise.resolve(getSignal(ticker)),
    fetchEarningsDate(ticker),
    fetchFundamentals(ticker),
    fetchFinnhubInsiders(ticker),
    fetchEarningsSurprises(ticker),
    fetchFinnhubNews(ticker),
    fetchSecFinancials(ticker),
  ])
  return NextResponse.json({ data, signal, earningsDate, fundamentals, insiders, earnings, finnhubNews, secFinancials })
}
