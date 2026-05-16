import Anthropic from '@anthropic-ai/sdk'
import { fetchStockData } from './yahooFinance'
import { fetchNewsHeadlines, NewsHeadline } from './newsRss'
import { fetchFinnhubNews, fetchEarningsSurprises, fetchFinnhubInsiders } from './finnhub'
import { fetchSecFinancials, fmtBig } from './secEdgar'
import { calculateRSI, calcChange, calculateMACD, calcMA, priceVsMA, detectCrossover, calculateATR } from './indicators'
import { getSignal, saveSignal, Signal, TermSignal } from './storage'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const THESIS_LABELS: Record<string, string> = {
  value:    'Value investing — prioritize low P/E, discount from 52w high, strong balance sheet',
  growth:   'Growth investing — prioritize revenue growth, momentum, market expansion',
  dividend: 'Dividend investing — prioritize dividend yield, payout stability, low beta',
  garp:     'GARP (Growth at Reasonable Price) — moderate P/E + consistent earnings growth',
}

export async function analyzeStock(ticker: string, lite = false, thesis?: string): Promise<Signal | null> {
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
    const atr   = calculateATR(closes)
    const pct7d  = calcChange(data.history1y, 7)
    const pct30d = calcChange(data.history1y, 30)
    const pct90d = calcChange(data.history1y, 90)
    const distFrom52wLow  = data.low52w  > 0 ? parseFloat(((price - data.low52w)  / data.low52w  * 100).toFixed(1)) : null
    const distFrom52wHigh = data.high52w > 0 ? parseFloat(((price - data.high52w) / data.high52w * 100).toFixed(1)) : null
    const goldenCross = ma50 && ma200 ? (ma50 > ma200 ? 'MA50 above MA200 (bullish)' : 'MA50 below MA200 (bearish)') : null
    const crossover = detectCrossover(closes)
    const atrStop = atr ? parseFloat((price - 1.5 * atr).toFixed(2)) : null

    // Market context — SPY trend
    let marketContext = ''
    if (ticker !== 'SPY') {
      try {
        const spy = await fetchStockData('SPY')
        if (spy) {
          const spyCloses = spy.history1y.map((h) => h.close)
          const spyMA50  = calcMA(spyCloses, 50)
          const spyMA200 = calcMA(spyCloses, 200)
          const spyTrend = spyMA50 && spyMA200
            ? (spyMA50 > spyMA200 ? 'BULLISH (MA50 above MA200)' : 'BEARISH (MA50 below MA200)')
            : 'unknown'
          marketContext = `S&P 500 (SPY): $${spy.price} (${spy.changePercent >= 0 ? '+' : ''}${spy.changePercent.toFixed(2)}% today), market trend: ${spyTrend}`
        }
      } catch { /* non-critical */ }
    }

    // SEC EDGAR financials context — only in full mode (lite has strict timeout)
    let secContext = ''
    if (!lite) try {
      const sec = await fetchSecFinancials(ticker)
      if (sec) {
        const revStr = sec.revenue.map(r => `${r.year}: ${fmtBig(r.value)}`).join(', ')
        const niStr  = sec.netIncome.map(r => `${r.year}: ${fmtBig(r.value)}`).join(', ')
        const fcfStr = sec.freeCashFlow.map(r => `${r.year}: ${fmtBig(r.value)}`).join(', ')
        secContext = `SEC EDGAR (annual):
Revenue: ${revStr || 'N/A'}${sec.revenueGrowthYoY !== null ? ` (YoY ${sec.revenueGrowthYoY >= 0 ? '+' : ''}${sec.revenueGrowthYoY}%)` : ''}
Net Income: ${niStr || 'N/A'}${sec.netMarginLatest !== null ? ` (margin ${sec.netMarginLatest}%)` : ''}
Free Cash Flow: ${fcfStr || 'N/A'}${sec.totalDebt !== null ? `\nTotal Debt: ${fmtBig(sec.totalDebt)}` : ''}`
      }
    } catch { /* non-critical */ }


    // Investment thesis context
    const thesisContext = thesis && THESIS_LABELS[thesis]
      ? `\nInvestment focus: ${THESIS_LABELS[thesis]}`
      : ''

    // News: Finnhub preferred, RSS fallback
    let headlines: NewsHeadline[] = []
    let headlineLines = '(no recent news)'
    if (!lite) {
      const finnhubNews = await fetchFinnhubNews(ticker)
      if (finnhubNews.length > 0) {
        headlineLines = finnhubNews.map((n, i) => `${i + 1}. ${n.headline}`).join('\n')
      } else {
        headlines = await fetchNewsHeadlines(ticker)
        headlineLines = headlines.length > 0
          ? headlines.map((h, i) => `${i + 1}. ${h.title}`).join('\n')
          : '(no recent news)'
      }
    }

    // Earnings surprises + insider context
    let earningsContext = ''
    if (!lite) {
      const [surprises, insiders] = await Promise.all([
        fetchEarningsSurprises(ticker),
        fetchFinnhubInsiders(ticker),
      ])
      if (surprises.length > 0) {
        const last = surprises[0]
        earningsContext = `Last earnings (${last.period}): EPS actual $${last.actual} vs estimate $${last.estimate} (${last.surprisePct >= 0 ? '+' : ''}${last.surprisePct}% surprise)`
      }
      if (insiders) {
        const insiderLine = insiders.netBuys > insiders.netSells
          ? `Insider activity (90d): ${insiders.netBuys} purchases vs ${insiders.netSells} sales — NET BUYING`
          : insiders.netSells > insiders.netBuys
          ? `Insider activity (90d): ${insiders.netSells} sales vs ${insiders.netBuys} purchases — NET SELLING`
          : ''
        if (insiderLine) earningsContext += (earningsContext ? '\n' : '') + insiderLine
      }
    }

    // ── LITE MODE ─────────────────────────────────────────────────────────────
    if (lite) {
      const technicalData = `Ticker: ${ticker}
Price: $${price}
1d: ${data.changePercent}% | 7d: ${pct7d}% | 30d: ${pct30d}%
RSI(14): ${rsi}
vs MA50: ${priceVsMA(price, ma50)} | vs MA200: ${priceVsMA(price, ma200)}
52w range: $${data.low52w}–$${data.high52w} (now ${distFrom52wHigh}% from high, +${distFrom52wLow}% from low)
${goldenCross ?? ''}${crossover ? ` ⚡ RECENT ${crossover.toUpperCase().replace('_', ' ')}` : ''}
${marketContext}${secContext ? `\n${secContext}` : ''}${thesisContext}`

      const message = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 350,
        system: `You are a stock screener for active traders. Analyze technical and fundamental data objectively.${thesisContext ? ` The user focuses on ${thesis} investing — weight your analysis accordingly.` : ''}
Respond ONLY with valid JSON:
{"signal":"BUY"|"HOLD"|"SELL","confidence":0-100,"reasoning":"1 sentence in Czech","risk":"LOW"|"MEDIUM"|"HIGH","risks":["max 2 specific risk factors in Czech"],"priceTarget":number|null,"horizon":"1 month"|"3 months"|"6 months"|null,"newsSentiment":[]}
Rules: RSI<35 + uptrend = consider BUY. RSI>65 + downtrend = consider SELL. Be direct, not overly conservative.`,
        messages: [{ role: 'user', content: technicalData }],
      })

      const raw = message.content[0].type === 'text' ? message.content[0].text : '{}'
      const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
      const parsed = JSON.parse(text) as {
        signal: string; confidence: number; reasoning: string; risk: string
        risks?: string[]; priceTarget?: number | null; horizon?: string | null
      }

      const signal: Signal = {
        ticker,
        signal: parsed.signal as Signal['signal'],
        confidence: Math.min(100, Math.max(0, parsed.confidence)),
        reasoning: parsed.reasoning,
        risk: parsed.risk as Signal['risk'],
        risks: Array.isArray(parsed.risks) ? parsed.risks.slice(0, 3) : undefined,
        price: data.price,
        analyzedAt: new Date().toISOString(),
        priceTarget: parsed.priceTarget ?? undefined,
        horizon: parsed.horizon ?? undefined,
        newsSentiment: [],
        headlines: [],
      }
      saveSignal(signal)
      return signal
    }

    // ── FULL MODE — Bull / Bear debate + Haiku synthesis ──────────────────────
    const technicalData = `Ticker: ${ticker}
Price: $${price}
Changes: 1d ${data.changePercent}% | 7d ${pct7d}% | 30d ${pct30d}% | 90d ${pct90d}%
RSI(14): ${rsi} ${rsi < 30 ? '← OVERSOLD' : rsi > 70 ? '← OVERBOUGHT' : ''}
MACD: ${macd ? `${macd.macd > 0 ? 'positive' : 'negative'}, histogram ${macd.histogram > 0 ? 'rising ↑' : 'falling ↓'} (${macd.histogram})` : 'N/A'}
vs MA50: ${priceVsMA(price, ma50)} | vs MA200: ${priceVsMA(price, ma200)}
${goldenCross ?? ''}${crossover ? ` ⚡ RECENT ${crossover.toUpperCase().replace('_', ' ')} — strong signal!` : ''}
52w high: $${data.high52w} (${distFrom52wHigh}%) | 52w low: $${data.low52w} (+${distFrom52wLow}%)
ATR(14): $${atr ?? 'N/A'} | ATR-based stop: $${atrStop ?? 'N/A'} (1.5× ATR below entry)
${marketContext}${earningsContext ? `\n${earningsContext}` : ''}${secContext ? `\n${secContext}` : ''}
Recent news:\n${headlineLines}`

    const [bullMsg, bearMsg] = await Promise.all([
      client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 350,
        system: `You are a BULL analyst. Your job is to find the strongest possible case FOR buying ${ticker}.
List exactly 3-4 specific bullish arguments based on the technical and fundamental data. Be direct and specific. Write in Czech.
Format: numbered list of arguments only, no conclusion.`,
        messages: [{ role: 'user', content: technicalData }],
      }),
      client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 350,
        system: `You are a BEAR analyst. Your job is to find the strongest possible case AGAINST buying ${ticker}.
List exactly 3-4 specific bearish risks and warning signs based on the technical and fundamental data. Be direct and specific. Write in Czech.
Format: numbered list of risks only, no conclusion.`,
        messages: [{ role: 'user', content: technicalData }],
      }),
    ])

    const bullCase = bullMsg.content[0].type === 'text' ? bullMsg.content[0].text : ''
    const bearCase = bearMsg.content[0].type === 'text' ? bearMsg.content[0].text : ''

    const synthesisPrompt = `${technicalData}

=== BULL ANALYTIK (argumenty PRO nákup) ===
${bullCase}

=== BEAR ANALYTIK (argumenty PROTI nákupu) ===
${bearCase}

Jako research manager, proveď finální investiční rozhodnutí. Zvaž oba pohledy a rozhodni na základě váhy argumentů a dat.`

    const systemPrompt = `You are an investment research manager making a final trading decision after hearing bull and bear analysts.
Respond ONLY with valid JSON (no markdown):
{
  "signal": "BUY"|"HOLD"|"SELL",
  "confidence": 0-100,
  "reasoning": "2-3 sentences in Czech: final verdict explaining which arguments won and why",
  "risk": "LOW"|"MEDIUM"|"HIGH",
  "risks": ["max 3 specific risk factors in Czech — concrete, not generic"],
  "shortTerm": {
    "signal": "BUY"|"HOLD"|"SELL",
    "confidence": 0-100,
    "reasoning": "1-2 sentences in Czech: momentum, RSI, MACD for next 1-4 weeks",
    "stopLoss": number or null,
    "riskReward": number or null
  },
  "longTerm": {
    "signal": "BUY"|"HOLD"|"SELL",
    "confidence": 0-100,
    "reasoning": "1-2 sentences in Czech: trend, MA position, fundamentals for next 3-12 months",
    "priceTarget": number or null,
    "stopLoss": number or null,
    "riskReward": number or null
  },
  "newsSentiment": [{"headline":"...","sentiment":"POSITIVE"|"NEUTRAL"|"NEGATIVE"}]
}
Rules:
- BUY: weight of evidence clearly bullish
- SELL: weight of evidence clearly bearish
- HOLD: genuinely balanced — NOT a default cop-out
- risks: name concrete risks like "Zpomalení růstu tržeb", "Vysoké P/E vs sektor", "Regulatorní riziko v EU"
- For stopLoss: prefer ATR-based stop. riskReward = (target-entry)/(entry-stop).
- Be decisive.`

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: synthesisPrompt }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : '{}'
    const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    const parsed = JSON.parse(text) as {
      signal: string; confidence: number; reasoning: string; risk: string
      risks?: string[]; priceTarget?: number | null; horizon?: string | null
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
      risks: Array.isArray(parsed.risks) ? parsed.risks.slice(0, 3) : undefined,
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
