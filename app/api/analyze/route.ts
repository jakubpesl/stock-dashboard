import { NextRequest, NextResponse } from 'next/server'
import { getWatchlist, getSignal, saveSettings, getSettings } from '@/lib/storage'
import { analyzeStock } from '@/lib/claudeAnalysis'
import { sendEmailNotification, sendPushNotification } from '@/lib/notifications'
import { getPushSubscriptions } from '@/lib/storage'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const ticker: string | undefined = body.ticker
    const { tickers } = getWatchlist()
    const targets = ticker ? tickers.filter((t) => t.symbol === ticker) : tickers

    const results = []
    for (const t of targets) {
      const prevSignal = getSignal(t.symbol)
      const newSignal = await analyzeStock(t.symbol)
      if (!newSignal) continue

      const changed = prevSignal?.signal !== newSignal.signal
      const actionable = newSignal.signal !== 'HOLD'
      if (changed && actionable && t.notificationsEnabled) {
        const settings = getSettings()
        const subs = getPushSubscriptions()
        await Promise.allSettled([
          sendEmailNotification(newSignal, settings.notificationEmail),
          sendPushNotification(newSignal, subs),
        ])
      }
      results.push(newSignal)
    }

    const settings = getSettings()
    saveSettings({ ...settings, lastAnalysisRun: new Date().toISOString() })
    return NextResponse.json({ analyzed: results.length, results })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
