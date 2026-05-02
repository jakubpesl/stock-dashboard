'use client'

interface SentimentItem { headline: string; sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' }
interface Headline { title: string; url: string; source: string; publishedAt: string }

const sentimentColors = {
  POSITIVE: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  NEUTRAL: 'text-slate-500 bg-slate-100 border-slate-200',
  NEGATIVE: 'text-red-600 bg-red-50 border-red-200',
}
const sentimentLabels = { POSITIVE: 'Pozitivní', NEUTRAL: 'Neutrální', NEGATIVE: 'Negativní' }

export default function NewsFeed({ headlines, newsSentiment }: {
  headlines?: Headline[]
  newsSentiment?: SentimentItem[]
}) {
  if (!headlines || headlines.length === 0) {
    return (
      <div className="text-slate-400 text-sm py-6 text-center italic">
        Spusťte AI analýzu pro načtení aktuálních zpráv.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {headlines.map((article, i) => {
        const sentItem = newsSentiment?.find((s) => s.headline === article.title) ?? newsSentiment?.[i]
        return (
          <a key={i} href={article.url} target="_blank" rel="noopener noreferrer"
            className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-[#6c63ff]/40 hover:bg-white transition-all group">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-slate-700 group-hover:text-[#6c63ff] transition-colors leading-snug font-medium">
                {article.title}
              </p>
              {sentItem && (
                <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 font-medium ${sentimentColors[sentItem.sentiment]}`}>
                  {sentimentLabels[sentItem.sentiment]}
                </span>
              )}
            </div>
            <div className="flex gap-3 mt-2 text-xs text-slate-400">
              <span>{article.source}</span>
              <span>{article.publishedAt?.slice(0, 10)}</span>
            </div>
          </a>
        )
      })}
    </div>
  )
}
