import Parser from 'rss-parser'
import fs from 'fs'
import path from 'path'

const parser = new Parser({ timeout: 8000 })
const CACHE_TTL_MS = 2 * 60 * 60 * 1000

export interface NewsHeadline {
  title: string
  url: string
  source: string
  publishedAt: string
}

function getCacheDir() {
  return process.env.VERCEL ? '/tmp/stock-dashboard/cache' : path.join(process.cwd(), 'data', 'cache')
}

function readNewsCache(ticker: string): NewsHeadline[] | null {
  try {
    const p = path.join(getCacheDir(), `news-${ticker}.json`)
    if (!fs.existsSync(p)) return null
    const data = JSON.parse(fs.readFileSync(p, 'utf-8'))
    if (Date.now() - new Date(data.fetchedAt).getTime() < CACHE_TTL_MS) return data.headlines
    return null
  } catch { return null }
}

function writeNewsCache(ticker: string, headlines: NewsHeadline[]) {
  try {
    const dir = getCacheDir()
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(
      path.join(dir, `news-${ticker}.json`),
      JSON.stringify({ headlines, fetchedAt: new Date().toISOString() }, null, 2)
    )
  } catch {}
}

export async function fetchNewsHeadlines(ticker: string): Promise<NewsHeadline[]> {
  const cached = readNewsCache(ticker)
  if (cached) return cached

  const feeds = [
    { url: `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${ticker}&region=US&lang=en-US`, source: 'Yahoo Finance' },
    { url: `https://news.google.com/rss/search?q=${ticker}+stock+market&hl=en-US&gl=US&ceid=US:en`, source: 'Google News' },
  ]

  for (const feed of feeds) {
    try {
      const result = await parser.parseURL(feed.url)
      if (!result.items?.length) continue
      const headlines: NewsHeadline[] = result.items.slice(0, 5).map((item) => ({
        title: item.title ?? '',
        url: item.link ?? '',
        source: feed.source,
        publishedAt: item.pubDate ?? new Date().toISOString(),
      }))
      writeNewsCache(ticker, headlines)
      return headlines
    } catch (err) {
      console.warn(`RSS feed failed (${feed.url}):`, err)
    }
  }

  console.warn(`All RSS feeds failed for ${ticker}, continuing without news`)
  return []
}
