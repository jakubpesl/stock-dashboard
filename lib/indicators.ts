export function calculateRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50
  let gains = 0
  let losses = 0
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1]
    if (diff > 0) gains += diff
    else losses += Math.abs(diff)
  }
  const avgGain = gains / period
  const avgLoss = losses / period
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return Math.round(100 - 100 / (1 + rs))
}

export function calcChange(history: { close: number }[], daysBack: number): number {
  if (history.length < daysBack + 1) return 0
  const recent = history[history.length - 1].close
  const old = history[history.length - 1 - daysBack].close
  return parseFloat((((recent - old) / old) * 100).toFixed(2))
}

function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1)
  const result: number[] = []
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period
  result.push(prev)
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k)
    result.push(prev)
  }
  return result
}

export function calculateMACD(closes: number[]): { macd: number; signal: number; histogram: number } | null {
  if (closes.length < 35) return null
  const ema12 = ema(closes, 12)
  const ema26 = ema(closes, 26)
  const len = Math.min(ema12.length, ema26.length)
  const macdLine = ema12.slice(ema12.length - len).map((v, i) => v - ema26[ema26.length - len + i])
  if (macdLine.length < 9) return null
  const signalLine = ema(macdLine, 9)
  const macd = parseFloat(macdLine[macdLine.length - 1].toFixed(4))
  const signal = parseFloat(signalLine[signalLine.length - 1].toFixed(4))
  return { macd, signal, histogram: parseFloat((macd - signal).toFixed(4)) }
}

export function calcMA(closes: number[], period: number): number | null {
  if (closes.length < period) return null
  return parseFloat((closes.slice(-period).reduce((a, b) => a + b, 0) / period).toFixed(2))
}

export function priceVsMA(price: number, ma: number | null): string {
  if (ma === null) return 'N/A'
  const pct = ((price - ma) / ma) * 100
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`
}

export function detectCrossover(closes: number[], daysBack = 10): 'golden_cross' | 'death_cross' | null {
  if (closes.length < 202) return null
  const ma50now  = closes.slice(-50).reduce((a, b) => a + b, 0) / 50
  const ma200now = closes.slice(-200).reduce((a, b) => a + b, 0) / 200
  const past = closes.slice(0, -daysBack)
  if (past.length < 200) return null
  const ma50past  = past.slice(-50).reduce((a, b) => a + b, 0) / 50
  const ma200past = past.slice(-200).reduce((a, b) => a + b, 0) / 200
  if (ma50past <= ma200past && ma50now > ma200now) return 'golden_cross'
  if (ma50past >= ma200past && ma50now < ma200now) return 'death_cross'
  return null
}

export function calcVolumeChange(history: { close: number; volume?: number }[], daysBack = 20): string {
  const withVol = history.filter((h) => (h as { volume?: number }).volume)
  if (withVol.length < daysBack + 5) return 'N/A'
  const recent = withVol.slice(-5).reduce((s, h) => s + ((h as { volume?: number }).volume ?? 0), 0) / 5
  const avg = withVol.slice(-daysBack - 5, -5).reduce((s, h) => s + ((h as { volume?: number }).volume ?? 0), 0) / daysBack
  if (avg === 0) return 'N/A'
  const pct = ((recent - avg) / avg) * 100
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%`
}
