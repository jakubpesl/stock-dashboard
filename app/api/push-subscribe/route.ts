import { NextRequest, NextResponse } from 'next/server'
import { getPushSubscriptions, savePushSubscriptions } from '@/lib/storage'

export async function POST(req: NextRequest) {
  try {
    const sub = await req.json()
    const existing = getPushSubscriptions()
    const alreadyExists = existing.some((s) => JSON.stringify(s) === JSON.stringify(sub))
    if (!alreadyExists) {
      savePushSubscriptions([...existing, sub])
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
