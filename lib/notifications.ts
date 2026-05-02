import nodemailer from 'nodemailer'
import webpush from 'web-push'
import { Signal } from './storage'

if (process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL ?? 'mailto:admin@example.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT ?? '587'),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
}

export async function sendEmailNotification(signal: Signal, to: string): Promise<void> {
  if (!to || !process.env.SMTP_USER) return
  const signalLabel = signal.signal === 'BUY' ? 'KUP' : signal.signal === 'SELL' ? 'PRODEJ' : 'DRŽ'
  const color = signal.signal === 'BUY' ? '#22c55e' : signal.signal === 'SELL' ? '#ef4444' : '#eab308'
  try {
    const transporter = createTransport()
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject: `📈 ${signal.ticker}: ${signalLabel} signál — Stock Dashboard`,
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#1a1a24;color:#f1f5f9;padding:24px;border-radius:12px;">
          <h2 style="margin:0 0 16px">📊 ${signal.ticker} — Nový signál</h2>
          <div style="background:${color};color:#fff;padding:12px 20px;border-radius:8px;font-size:24px;font-weight:700;text-align:center;margin-bottom:16px;">${signalLabel} — ${signal.confidence}% jistota</div>
          <p style="color:#94a3b8;margin:0 0 8px"><strong style="color:#f1f5f9">Cena:</strong> $${signal.price}</p>
          <p style="color:#94a3b8;margin:0 0 8px"><strong style="color:#f1f5f9">Riziko:</strong> ${signal.risk}</p>
          <p style="color:#94a3b8;margin:0 0 16px"><strong style="color:#f1f5f9">Zdůvodnění:</strong> ${signal.reasoning}</p>
          <p style="color:#484860;font-size:12px">⚠️ Tato aplikace slouží pouze k informačním účelům a nepředstavuje finanční poradenství.</p>
        </div>`,
    })
  } catch (err) {
    console.error('Email error:', err)
  }
}

export async function sendPushNotification(signal: Signal, subscriptions: PushSubscription[]): Promise<void> {
  if (!process.env.VAPID_PRIVATE_KEY) return
  const signalLabel = signal.signal === 'BUY' ? 'KUP' : signal.signal === 'SELL' ? 'PRODEJ' : 'DRŽ'
  const payload = JSON.stringify({
    title: `${signal.ticker}: ${signalLabel}`,
    body: signal.reasoning,
    icon: '/icon.png',
  })
  await Promise.allSettled(
    subscriptions.map((sub) => webpush.sendNotification(sub as unknown as webpush.PushSubscription, payload))
  )
}
