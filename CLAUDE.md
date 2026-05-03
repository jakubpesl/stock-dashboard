# Stock Intelligence Dashboard — CLAUDE.md

## Stack
- **Next.js 14** App Router, TypeScript strict, Tailwind CSS
- **Anthropic Claude API**: `claude-sonnet-4-6` (full analysis), `claude-haiku-4-5-20251001` (lite/scanner)
- **Recharts** for charts, **Yahoo Finance** (unofficial API) for market data
- **Vercel** deploy (Git → GitHub → auto-deploy). Use `vercel` CLI for logs.

## Key architecture decisions
- **No database** — all persistence in browser `localStorage` (watchlist, signals, portfolio, scanner results)
- **Serverless `/tmp` is ephemeral** on Vercel — never rely on it for shared or persistent state
- Signal results include a `ticker` field — always map by `sig.ticker`, never by array index (index breaks when errors skip items)
- Multiple charts on one page need unique SVG gradient IDs → use React `useId()`

## LocalStorage keys
| Key | Content |
|-----|---------|
| `stock-watchlist` | `{ symbol, alias }[]` max 10 |
| `stock-signals` | `Record<ticker, Signal>` |
| `stock-portfolio` | `Position[]` |
| `scanner-results` | `ScanResult[]` |
| `scanner-timestamp` | last scan date string |
| `stock-settings` | notification email, lastAnalysisRun |

## Pages & routes
- `/` — Dashboard (watchlist grid, MarketContext banner, Refresh + Analyze buttons)
- `/stock/[ticker]` — Detail: chart tabs (1T/1M/3M/1R), metrics, short+long AI signal, news
- `/scanner` — S&P 500 scanner (30 tickers, lite Haiku analysis, filters)
- `/portfolio` — Portfolio tracker with live P&L
- `/settings` — Manage watchlist, run analysis, notifications
- `/api/stock/[ticker]` — Fetches price data + cached signal + earnings date
- `/api/analyze` — POST `{ tickers, lite? }` → calls Claude, returns `{ results, errors }`
- `/api/refresh` — POST → clears Yahoo Finance price cache

## Common pitfalls (TypeScript / build)
- `[...new Set()]` fails on ES5 target → use `Array.from(new Set())`
- `function foo(){}` inside `try` block fails in strict mode → use `const foo = () =>`
- MA50 toggle needs 50+ data points — default chart tab is `3M`, not `1M`

## Design conventions
- Primary color: `#6c63ff` (purple)
- Signal colors: emerald (BUY), amber (HOLD), red (SELL)
- Cards: `bg-white border border-slate-200 rounded-2xl shadow-sm`
- Signal badge glow: CSS classes `signal-buy`, `signal-sell`, `signal-hold` (globals.css)
- Chart glow: `chart-glow` class on ComposedChart + CSS drop-shadow
- AI signal cards use colored left border (`border-l-4`) based on signal type

## Git & deploy
- Author email: `jkoudy@seznam.cz` (required, Vercel rejects without it)
- Never commit `.env` — secrets via Vercel environment variables
- Required env vars: `ANTHROPIC_API_KEY`, `NOTIFICATION_EMAIL`, `EMAIL_USER`, `EMAIL_PASS`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
