import { NextRequest, NextResponse } from 'next/server'
import { getSettings, saveSettings } from '@/lib/storage'

export async function GET() {
  return NextResponse.json(getSettings())
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const current = getSettings()
    saveSettings({ ...current, ...body })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
