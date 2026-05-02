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
