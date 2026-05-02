import { NextResponse } from 'next/server'
import { getSettings, getPushSubscriptions } from '@/lib/storage'
import { sendEmailNotification, sendPushNotification } from '@/lib/notifications'
import { Signal } from '@/lib/storage'

export async function POST() {
  const testSignal: Signal = {
    ticker: 'TEST',
    signal: 'BUY',
    confidence: 85,
    reasoning: 'Toto je testovací notifikace z vašeho Stock Intelligence Dashboard.',
    risk: 'LOW',
    price: 100,
    analyzedAt: new Date().toISOString(),
    newsSentiment: [],
    headlines: [],
  }
  const settings = getSettings()
  const subs = getPushSubscriptions()
  await Promise.allSettled([
    sendEmailNotification(testSignal, settings.notificationEmail),
    sendPushNotification(testSignal, subs),
  ])
  return NextResponse.json({ ok: true })
}
