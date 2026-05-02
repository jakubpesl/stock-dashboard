'use client'

interface SentimentItem { headline: string; sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' }
interface Headline { title: string; url: string; source: string; publishedAt: string }

const sentimentColors = {
  POSITIVE: 'text-[#22c55e] bg-[#22c55e]/10',
  NEUTRAL: 'text-[#94a3b8] bg-white/5',
  NEGATIVE: 'text-[#ef4444] bg-[#ef4444]/10',
}
const sentimentLabels = { POSITIVE: 'Pozitivní', NEUTRAL: 'Neutrální', NEGATIVE: 'Negativní' }

export default function NewsFeed({
  headlines,
  newsSentiment,
}: {
  headlines?: Headline[]
  newsSentiment?: SentimentItem[]
}) {
  if (!headlines || headlines.length === 0) {
    return (
      <div className="text-[#94a3b8] text-sm py-6 text-center">
        Zprávy nejsou k dispozici — spusťte AI analýzu pro načtení aktuálních zpráv.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {headlines.map((article, i) => {
        const sentItem = newsSentiment?.find((s) => s.headline === article.title) ?? newsSentiment?.[i]
        return (
          <a key={i} href={article.url} target="_blank" rel="noopener noreferrer"
            className="p-4 bg-white/5 rounded-lg border border-[#2a2a3a] hover:border-[#6c63ff]/40 transition-colors group">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-[#f1f5f9] group-hover:text-[#6c63ff] transition-colors leading-snug">
                {article.title}
              </p>
              {sentItem && (
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${sentimentColors[sentItem.sentiment]}`}>
                  {sentimentLabels[sentItem.sentiment]}
                </span>
              )}
            </div>
            <div className="flex gap-3 mt-2 text-xs text-[#94a3b8]">
              <span>{article.source}</span>
              <span>{article.publishedAt?.slice(0, 10)}</span>
            </div>
          </a>
        )
      })}
    </div>
  )
}
