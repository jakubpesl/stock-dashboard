import { NextRequest, NextResponse } from 'next/server'
import { analyzeStock } from '@/lib/claudeAnalysis'
import { sendEmailNotification, sendPushNotification } from '@/lib/notifications'
import { getSignal, saveSettings, getSettings, getPushSubscriptions } from '@/lib/storage'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { ticker?: string; tickers?: string[] }
    const symbols: string[] = body.tickers ?? (body.ticker ? [body.ticker] : [])

    if (symbols.length === 0) {
      return NextResponse.json({ error: 'No tickers provided' }, { status: 400 })
    }

    const results = []
    for (const sym of symbols) {
      const prevSignal = getSignal(sym)
      const newSignal = await analyzeStock(sym)
      if (!newSignal) continue

      const changed = prevSignal?.signal !== newSignal.signal
      const actionable = newSignal.signal !== 'HOLD'
      if (changed && actionable) {
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
