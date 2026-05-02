# Stock Intelligence Dashboard

Osobní akciový dashboard s AI signály KUP / DRŽ / PRODEJ.

## Zdroje dat
- **Ceny akcií:** Yahoo Finance (yahoo-finance2)
- **Zprávy:** Yahoo Finance RSS + Google News RSS (bez registrace)
- **AI analýza a sentiment:** Claude claude-sonnet-4-6 (Anthropic)

## Deployment na Vercel

### 1. Fork / upload na GitHub
Nahraj tento projekt do svého GitHub repozitáře.

### 2. Připoj na Vercel
1. Jdi na [vercel.com](https://vercel.com) a přihlas se přes GitHub
2. Klikni **Add New → Project** a vyber svůj repozitář
3. Framework: **Next.js** (detekuje automaticky)
4. Klikni **Deploy**

### 3. Nastav Environment Variables na Vercel
V Vercel dashboardu → Settings → Environment Variables přidej:

| Proměnná | Popis | Povinná |
|----------|-------|---------|
| `ANTHROPIC_API_KEY` | Klíč z [console.anthropic.com](https://console.anthropic.com) | ✅ |
| `NOTIFICATION_EMAIL` | Email pro notifikace | ❌ |
| `SMTP_HOST` | SMTP server (výchozí smtp.gmail.com) | ❌ |
| `SMTP_PORT` | SMTP port (výchozí 587) | ❌ |
| `SMTP_USER` | Gmail adresa | ❌ |
| `SMTP_PASS` | Gmail App Password | ❌ |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Pro push notifikace | ❌ |
| `VAPID_PRIVATE_KEY` | Pro push notifikace | ❌ |
| `VAPID_EMAIL` | mailto: adresa pro VAPID | ❌ |

### 4. Redeploy a otevři aplikaci
Po nastavení proměnných klikni **Redeploy**.

> ⚠️ Na Vercel jsou data v /tmp ephemeral (resetují se po cold startu). Pro trvalé uchování dat je třeba Vercel KV nebo jiné externé úložiště.

## Lokální vývoj

```bash
npm install
cp .env.local.example .env.local
# vyplň ANTHROPIC_API_KEY v .env.local
npm run dev
```

Otevři http://localhost:3000 a v Nastavení přidej první ticker.
