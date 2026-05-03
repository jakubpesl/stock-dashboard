import fs from 'fs'
import path from 'path'

const IS_VERCEL = !!process.env.VERCEL
const DATA_DIR = IS_VERCEL ? '/tmp/stock-dashboard' : path.join(process.cwd(), 'data')

function initVercelData() {
  if (!IS_VERCEL) return
  if (fs.existsSync(DATA_DIR)) return
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.mkdirSync(path.join(DATA_DIR, 'signals'), { recursive: true })
  fs.mkdirSync(path.join(DATA_DIR, 'cache'), { recursive: true })
  const srcDir = path.join(process.cwd(), 'data')
  for (const file of ['watchlist.json', 'settings.json']) {
    const src = path.join(srcDir, file)
    const dst = path.join(DATA_DIR, file)
    if (fs.existsSync(src)) fs.copyFileSync(src, dst)
  }
}
initVercelData()

export interface Ticker {
  symbol: string
  alias: string
  addedAt: string
  notificationsEnabled: boolean
}

export interface Watchlist {
  tickers: Ticker[]
}

export interface Settings {
  notificationEmail: string
  analysisInterval: '1h' | '6h' | '12h' | '24h'
  lastAnalysisRun: string | null
}

export interface TermSignal {
  signal: 'BUY' | 'HOLD' | 'SELL'
  confidence: number
  reasoning: string
  priceTarget?: number
  stopLoss?: number
  riskReward?: number
}

export interface Signal {
  ticker: string
  signal: 'BUY' | 'HOLD' | 'SELL'
  confidence: number
  reasoning: string
  risk: 'LOW' | 'MEDIUM' | 'HIGH'
  price: number
  analyzedAt: string
  priceTarget?: number
  horizon?: string
  shortTerm?: TermSignal
  longTerm?: TermSignal
  newsSentiment: { headline: string; sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' }[]
  headlines: { title: string; url: string; source: string; publishedAt: string }[]
}

export interface CacheEntry {
  ticker: string
  price: number
  change: number
  changePercent: number
  open: number
  high: number
  low: number
  volume: number
  high52w: number
  low52w: number
  marketCap: number
  history7d: { date: string; close: number }[]
  history1m: { date: string; close: number }[]
  history3m: { date: string; close: number }[]
  history1y: { date: string; close: number }[]
  fetchedAt: string
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function readJSON<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T
  } catch {
    return fallback
  }
}

function writeJSON(filePath: string, data: unknown) {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
}

export function getWatchlist(): Watchlist {
  return readJSON<Watchlist>(path.join(DATA_DIR, 'watchlist.json'), { tickers: [] })
}

export function saveWatchlist(watchlist: Watchlist) {
  writeJSON(path.join(DATA_DIR, 'watchlist.json'), watchlist)
}

export function getSettings(): Settings {
  return readJSON<Settings>(path.join(DATA_DIR, 'settings.json'), {
    notificationEmail: '',
    analysisInterval: '6h',
    lastAnalysisRun: null,
  })
}

export function saveSettings(settings: Settings) {
  writeJSON(path.join(DATA_DIR, 'settings.json'), settings)
}

export function getSignal(ticker: string): Signal | null {
  return readJSON<Signal | null>(path.join(DATA_DIR, 'signals', `${ticker}.json`), null)
}

export function saveSignal(signal: Signal) {
  writeJSON(path.join(DATA_DIR, 'signals', `${signal.ticker}.json`), signal)
}

export function getCache(ticker: string): CacheEntry | null {
  return readJSON<CacheEntry | null>(path.join(DATA_DIR, 'cache', `${ticker}.json`), null)
}

export function saveCache(entry: CacheEntry) {
  writeJSON(path.join(DATA_DIR, 'cache', `${entry.ticker}.json`), entry)
}

export function isCacheFresh(entry: CacheEntry | null, maxAgeMinutes = 15): boolean {
  if (!entry) return false
  const age = (Date.now() - new Date(entry.fetchedAt).getTime()) / 1000 / 60
  return age < maxAgeMinutes
}

export function getPushSubscriptions(): PushSubscription[] {
  return readJSON<PushSubscription[]>(path.join(DATA_DIR, 'push-subscriptions.json'), [])
}

export function savePushSubscriptions(subs: PushSubscription[]) {
  writeJSON(path.join(DATA_DIR, 'push-subscriptions.json'), subs)
}
