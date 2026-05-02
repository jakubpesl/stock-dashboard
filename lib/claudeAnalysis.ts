import Anthropic from '@anthropic-ai/sdk'
import { fetchStockData } from './yahooFinance'
import { fetchNewsHeadlines, NewsHeadline } from './newsRss'
import { calculateRSI, calcChange } from './indicators'
import { getSignal, saveSignal, Signal } from './storage'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function analyzeStock(ticker: string): Promise<Signal | null> {
  try {
    const data = await fetchStockData(ticker)
    if (!data) throw new Error('No market data')

    const closes = data.history1y.map((h) => h.close)
    const rsi = calculateRSI(closes)
    const pct7d = calcChange(data.history1y, 7)
    const pct30d = calcChange(data.history1y, 30)

    const headlines: NewsHeadline[] = await fetchNewsHeadlines(ticker)
    const headlineLines = headlines.length > 0
      ? headlines.map((h, i) => `${i + 1}. ${h.title}`).join('\n')
      : '(no recent news available)'

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: 'You are a conservative personal finance assistant. Analyze stock data and news headlines. Respond ONLY with valid JSON, no markdown, no text outside JSON. Return exactly: {"signal": "BUY" or "HOLD" or "SELL", "confidence": number 0-100, "reasoning": "max 2 sentences in Czech", "risk": "LOW" or "MEDIUM" or "HIGH", "priceTarget": number or null, "horizon": "1 month" or "3 months" or "6 months" or null, "newsSentiment": [{"headline": "...", "sentiment": "POSITIVE" or "NEUTRAL" or "NEGATIVE"}]}. priceTarget is your 12-month price target in USD. Be conservative — default to HOLD unless evidence is clear.',
      messages: [
        {
          role: 'user',
          content: `Ticker: ${ticker}\nCurrent price: ${data.price} USD\nChange 1d: ${data.changePercent}%\nChange 7d: ${pct7d}%\nChange 30d: ${pct30d}%\nRSI(14): ${rsi}\nRecent news headlines:\n${headlineLines}\nAnalyze and return JSON.`,
        },
      ],
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
      newsSentiment?: { headline: string; sentiment: string }[]
    }

    const signal: Signal = {
      ticker,
      signal: parsed.signal as Signal['signal'],
      confidence: Math.min(100, Math.max(0, parsed.confidence)),
      reasoning: parsed.reasoning,
      risk: parsed.risk as Signal['risk'],
      price: data.price,
      analyzedAt: new Date().toISOString(),
      priceTarget: parsed.priceTarget ?? undefined,
      horizon: parsed.horizon ?? undefined,
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
