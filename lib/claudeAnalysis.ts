import Anthropic from '@anthropic-ai/sdk'
import { fetchStockData } from './yahooFinance'
import { fetchNewsHeadlines, NewsHeadline } from './newsRss'
import { calculateRSI, calcChange, calculateMACD, calcMA, priceVsMA } from './indicators'
import { getSignal, saveSignal, Signal, TermSignal } from './storage'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function analyzeStock(ticker: string, lite = false): Promise<Signal | null> {
  try {
    const data = await fetchStockData(ticker)
    if (!data) throw new Error('No market data')

    const closes = data.history1y.map((h) => h.close)
    const price = data.price

    // Technical indicators
    const rsi = calculateRSI(closes)
    const macd = calculateMACD(closes)
    const ma50  = calcMA(closes, 50)
    const ma200 = calcMA(closes, 200)
    const pct7d  = calcChange(data.history1y, 7)
    const pct30d = calcChange(data.history1y, 30)
    const pct90d = calcChange(data.history1y, 90)
    const distFrom52wLow  = data.low52w  > 0 ? parseFloat(((price - data.low52w)  / data.low52w  * 100).toFixed(1)) : null
    const distFrom52wHigh = data.high52w > 0 ? parseFloat(((price - data.high52w) / data.high52w * 100).toFixed(1)) : null
    const goldenCross = ma50 && ma200 ? (ma50 > ma200 ? 'MA50 above MA200 (bullish)' : 'MA50 below MA200 (bearish)') : null

    const headlines: NewsHeadline[] = lite ? [] : await fetchNewsHeadlines(ticker)
    const headlineLines = headlines.length > 0
      ? headlines.map((h, i) => `${i + 1}. ${h.title}`).join('\n')
      : '(no recent news)'

    const model = lite ? 'claude-haiku-4-5-20251001' : 'claude-sonnet-4-6'

    const technicalData = lite
      ? `Ticker: ${ticker}
Price: $${price}
1d: ${data.changePercent}% | 7d: ${pct7d}% | 30d: ${pct30d}%
RSI(14): ${rsi}
vs MA50: ${priceVsMA(price, ma50)} | vs MA200: ${priceVsMA(price, ma200)}
52w range: $${data.low52w}–$${data.high52w} (now ${distFrom52wHigh}% from high, +${distFrom52wLow}% from low)
${goldenCross ? goldenCross : ''}`
      : `Ticker: ${ticker}
Price: $${price}
Changes: 1d ${data.changePercent}% | 7d ${pct7d}% | 30d ${pct30d}% | 90d ${pct90d}%
RSI(14): ${rsi} ${rsi < 30 ? '← OVERSOLD' : rsi > 70 ? '← OVERBOUGHT' : ''}
MACD: ${macd ? `${macd.macd > 0 ? 'positive' : 'negative'}, histogram ${macd.histogram > 0 ? 'rising ↑' : 'falling ↓'} (${macd.histogram})` : 'N/A'}
vs MA50: ${priceVsMA(price, ma50)} | vs MA200: ${priceVsMA(price, ma200)}
${goldenCross ?? ''}
52w high: $${data.high52w} (${distFrom52wHigh}%) | 52w low: $${data.low52w} (+${distFrom52wLow}%)
Recent news:\n${headlineLines}`

    const system = lite
      ? `You are a stock screener for active traders. Analyze technical data objectively.
Respond ONLY with valid JSON:
{"signal":"BUY"|"HOLD"|"SELL","confidence":0-100,"reasoning":"1 sentence in Czech","risk":"LOW"|"MEDIUM"|"HIGH","priceTarget":number|null,"horizon":"1 month"|"3 months"|"6 months"|null,"newsSentiment":[]}
Rules: RSI<35 + uptrend = consider BUY. RSI>65 + downtrend = consider SELL. Be direct, not overly conservative.`
      : `You are a technical analyst for an active trader. Analyze objectively using all provided data.
Respond ONLY with valid JSON (no markdown):
{
  "signal": "BUY"|"HOLD"|"SELL",
  "confidence": 0-100,
  "reasoning": "2-3 sentences in Czech: overall verdict with key evidence",
  "risk": "LOW"|"MEDIUM"|"HIGH",
  "shortTerm": {
    "signal": "BUY"|"HOLD"|"SELL",
    "confidence": 0-100,
    "reasoning": "1-2 sentences in Czech: momentum, RSI, MACD, news for next 1-4 weeks",
    "stopLoss": number or null,
    "riskReward": number or null
  },
  "longTerm": {
    "signal": "BUY"|"HOLD"|"SELL",
    "confidence": 0-100,
    "reasoning": "1-2 sentences in Czech: trend, MA position, 52w context for next 3-12 months",
    "priceTarget": number or null,
    "stopLoss": number or null,
    "riskReward": number or null
  },
  "newsSentiment": [{"headline":"...","sentiment":"POSITIVE"|"NEUTRAL"|"NEGATIVE"}]
}
Rules for signals:
- BUY: RSI oversold (<35) OR price near 52w low with improving momentum OR MA golden cross OR strong positive catalysts
- SELL: RSI overbought (>70) with weakening momentum OR MA death cross OR clear downtrend OR negative catalysts
- HOLD: genuinely mixed signals — not as a default
- stopLoss: realistic support level (e.g. below MA50, recent swing low). riskReward = (target-entry)/(entry-stop).
- Be direct and actionable. Do NOT default to HOLD — give the most likely correct signal based on data.`

    const message = await client.messages.create({
      model,
      max_tokens: lite ? 300 : 800,
      system,
      messages: [{ role: 'user', content: technicalData }],
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
      shortTerm?: { signal: string; confidence: number; reasoning: string; stopLoss?: number | null; riskReward?: number | null }
      longTerm?: { signal: string; confidence: number; reasoning: string; priceTarget?: number | null; stopLoss?: number | null; riskReward?: number | null }
      newsSentiment?: { headline: string; sentiment: string }[]
    }

    const toTermSignal = (t: typeof parsed.shortTerm | typeof parsed.longTerm): TermSignal | undefined => {
      if (!t) return undefined
      return {
        signal: t.signal as TermSignal['signal'],
        confidence: Math.min(100, Math.max(0, t.confidence)),
        reasoning: t.reasoning,
        priceTarget: (t as typeof parsed.longTerm)?.priceTarget ?? undefined,
        stopLoss: t.stopLoss ?? undefined,
        riskReward: t.riskReward ?? undefined,
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
