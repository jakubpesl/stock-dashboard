import Anthropic from '@anthropic-ai/sdk'
import { fetchStockData } from './yahooFinance'
import { fetchNewsHeadlines, NewsHeadline } from './newsRss'
import { calculateRSI, calcChange } from './indicators'
import { getSignal, saveSignal, Signal, TermSignal } from './storage'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function analyzeStock(ticker: string, lite = false): Promise<Signal | null> {
  try {
    const data = await fetchStockData(ticker)
    if (!data) throw new Error('No market data')

    const closes = data.history1y.map((h) => h.close)
    const rsi = calculateRSI(closes)
    const pct7d = calcChange(data.history1y, 7)
    const pct30d = calcChange(data.history1y, 30)

    const headlines: NewsHeadline[] = lite ? [] : await fetchNewsHeadlines(ticker)
    const headlineLines = headlines.length > 0
      ? headlines.map((h, i) => `${i + 1}. ${h.title}`).join('\n')
      : '(no recent news available)'

    const model = lite ? 'claude-haiku-4-5-20251001' : 'claude-sonnet-4-6'
    const system = lite
      ? 'You are a stock screener. Respond ONLY with valid JSON, no markdown. Return: {"signal": "BUY" or "HOLD" or "SELL", "confidence": number 0-100, "reasoning": "1 sentence in Czech", "risk": "LOW" or "MEDIUM" or "HIGH", "priceTarget": number or null, "horizon": "3 months" or "6 months" or null, "newsSentiment": []}. Be conservative.'
      : 'You are a conservative personal finance assistant. Analyze stock data and news. Respond ONLY with valid JSON, no markdown. Return exactly this structure:\n{"signal":"BUY"|"HOLD"|"SELL","confidence":0-100,"reasoning":"1-2 sentences in Czech summarizing both horizons","risk":"LOW"|"MEDIUM"|"HIGH","shortTerm":{"signal":"BUY"|"HOLD"|"SELL","confidence":0-100,"reasoning":"1 sentence in Czech about next 1-4 weeks: momentum, RSI, news"},"longTerm":{"signal":"BUY"|"HOLD"|"SELL","confidence":0-100,"reasoning":"1 sentence in Czech about next 3-12 months: fundamentals, trend, valuation","priceTarget":number or null},"newsSentiment":[{"headline":"...","sentiment":"POSITIVE"|"NEUTRAL"|"NEGATIVE"}]}\nTop-level signal = overall verdict. Be conservative — default HOLD unless evidence is clear.'
    const userContent = lite
      ? `Ticker: ${ticker}\nPrice: ${data.price} USD\n1d: ${data.changePercent}%\n7d: ${pct7d}%\n30d: ${pct30d}%\nRSI: ${rsi}\n52w high: ${data.high52w}\nReturn JSON.`
      : `Ticker: ${ticker}\nCurrent price: ${data.price} USD\nChange 1d: ${data.changePercent}%\nChange 7d: ${pct7d}%\nChange 30d: ${pct30d}%\nRSI(14): ${rsi}\nRecent news headlines:\n${headlineLines}\nAnalyze and return JSON.`

    const message = await client.messages.create({
      model,
      max_tokens: lite ? 300 : 600,
      system,
      messages: [{ role: 'user', content: userContent }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : '{}'
    const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    const parsed = JSON.parse(text) as {
      signal: string
      confidence: number
      reasoning: string
      risk: string
      priceTarget?: number | null
      horizon?: string | null
      shortTerm?: { signal: string; confidence: number; reasoning: string }
      longTerm?: { signal: string; confidence: number; reasoning: string; priceTarget?: number | null }
      newsSentiment?: { headline: string; sentiment: string }[]
    }

    function toTermSignal(t: { signal: string; confidence: number; reasoning: string; priceTarget?: number | null } | undefined): TermSignal | undefined {
      if (!t) return undefined
      return {
        signal: t.signal as TermSignal['signal'],
        confidence: Math.min(100, Math.max(0, t.confidence)),
        reasoning: t.reasoning,
        priceTarget: t.priceTarget ?? undefined,
      }
    }

    const signal: Signal = {
      ticker,
      signal: parsed.signal as Signal['signal'],
      confidence: Math.min(100, Math.max(0, parsed.confidence)),
      reasoning: parsed.reasoning,
      risk: parsed.risk as Signal['risk'],
      price: data.price,
      analyzedAt: new Date().toISOString(),
      priceTarget: parsed.longTerm?.priceTarget ?? parsed.priceTarget ?? undefined,
      horizon: parsed.horizon ?? undefined,
      shortTerm: toTermSignal(parsed.shortTerm),
      longTerm: toTermSignal(parsed.longTerm),
      newsSentiment: (parsed.newsSentiment ?? []).map((s) => ({
        headline: s.headline,
        sentiment: s.sentiment as 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE',
      })),
      headlines,
    }

    saveSignal(signal)
    return signal
  } catch (err) {
    throw err
  }
}
