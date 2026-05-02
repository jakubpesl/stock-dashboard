'use client'
import { useState, useEffect } from 'react'
import NotificationToggle from '@/components/NotificationToggle'

const WL_KEY = 'stock-watchlist'
const SET_KEY = 'stock-settings'

interface Ticker { symbol: string; alias: string; notificationsEnabled: boolean }
interface Settings { notificationEmail: string; analysisInterval: string; lastAnalysisRun: string | null }

const DEFAULT_SETTINGS: Settings = { notificationEmail: '', analysisInterval: '6h', lastAnalysisRun: null }

export default function SettingsPage() {
  const [tickers, setTickers] = useState<Ticker[]>([])
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [symbol, setSymbol] = useState('')
  const [alias, setAlias] = useState('')
  const [adding, setAdding] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [toast, setToast] = useState('')

  function flash(text: string) { setToast(text); setTimeout(() => setToast(''), 3000) }

  function saveWL(list: Ticker[]) {
    localStorage.setItem(WL_KEY, JSON.stringify(list.map(({ symbol, alias }) => ({ symbol, alias }))))
  }

  useEffect(() => {
    const wl = localStorage.getItem(WL_KEY)
    const set = localStorage.getItem(SET_KEY)
    setTickers(wl ? (JSON.parse(wl) as Ticker[]).map((t) => ({ ...t, notificationsEnabled: t.notificationsEnabled ?? true })) : [])
    setSettings(set ? { ...DEFAULT_SETTINGS, ...JSON.parse(set) as Partial<Settings> } : DEFAULT_SETTINGS)
  }, [])

  function addTicker() {
    if (!symbol) return
    setAdding(true)
    const sym = symbol.trim().toUpperCase()
    if (tickers.find((t) => t.symbol === sym)) { flash('Ticker již existuje.'); setAdding(false); return }
    if (tickers.length >= 10) { flash('Maximum 10 tickerů.'); setAdding(false); return }
    const ticker: Ticker = { symbol: sym, alias: alias.trim() || sym, notificationsEnabled: true }
    const updated = [...tickers, ticker]
    setTickers(updated)
    saveWL(updated)
    setSymbol('')
    setAlias('')
    flash(`✓ ${sym} přidán.`)
    setAdding(false)
  }

  function deleteTicker(sym: string) {
    const updated = tickers.filter((t) => t.symbol !== sym)
    setTickers(updated)
    saveWL(updated)
  }

  function toggleNotif(sym: string, val: boolean) {
    const updated = tickers.map((t) => t.symbol === sym ? { ...t, notificationsEnabled: val } : t)
    setTickers(updated)
    localStorage.setItem(WL_KEY, JSON.stringify(updated))
  }

  function saveSettings() {
    localStorage.setItem(SET_KEY, JSON.stringify(settings))
    flash('✓ Nastavení uloženo.')
  }

  async function runAnalysis() {
    if (tickers.length === 0) { flash('Přidej nejprve ticker.'); return }
    setAnalyzing(true)
    try {
      await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers: tickers.map((t) => t.symbol) }),
      })
      const updated = { ...settings, lastAnalysisRun: new Date().toISOString() }
      setSettings(updated)
      localStorage.setItem(SET_KEY, JSON.stringify(updated))
      flash('✓ Analýza dokončena.')
    } catch { flash('Chyba při analýze.') }
    setAnalyzing(false)
  }

  const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#6c63ff] focus:ring-2 focus:ring-[#6c63ff]/10 transition-all'
  const sectionCls = 'bg-white border border-slate-200 rounded-2xl p-6 mb-5 shadow-sm'

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-8">Nastavení</h1>

      {/* WATCHLIST */}
      <section className={sectionCls}>
        <h2 className="font-semibold text-lg text-slate-900 mb-4">Watchlist</h2>
        <div className="flex gap-2 mb-4 flex-wrap">
          <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && addTicker()}
            placeholder="Ticker (AAPL)" maxLength={10}
            className="flex-1 min-w-28 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#6c63ff] focus:ring-2 focus:ring-[#6c63ff]/10 transition-all" />
          <input value={alias} onChange={(e) => setAlias(e.target.value)}
            placeholder="Název (Apple)" maxLength={30}
            className="flex-1 min-w-28 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#6c63ff] focus:ring-2 focus:ring-[#6c63ff]/10 transition-all" />
          <button onClick={addTicker} disabled={adding || tickers.length >= 10}
            className="px-4 py-2 bg-[#6c63ff] hover:bg-[#6c63ff]/90 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
            {adding ? '…' : '+ Přidat'}
          </button>
        </div>
        <div className="space-y-2">
          {tickers.map((t) => (
            <div key={t.symbol} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <span className="font-semibold text-slate-900">{t.symbol}</span>
                <span className="text-slate-500 text-sm ml-2">{t.alias}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">Notif.</span>
                <NotificationToggle symbol={t.symbol} enabled={t.notificationsEnabled}
                  onChange={(v) => toggleNotif(t.symbol, v)} />
                <button onClick={() => deleteTicker(t.symbol)}
                  className="text-red-400 hover:text-red-600 text-sm transition-colors font-medium">
                  Smazat
                </button>
              </div>
            </div>
          ))}
          {tickers.length === 0 && (
            <p className="text-slate-400 text-sm text-center py-6 italic">Žádné tickery ve watchlistu.</p>
          )}
        </div>
      </section>

      {/* NOTIFICATIONS */}
      <section className={sectionCls}>
        <h2 className="font-semibold text-lg text-slate-900 mb-4">Notifikace</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-slate-500 mb-1.5">E-mail pro notifikace</label>
            <input type="email" value={settings.notificationEmail}
              onChange={(e) => setSettings((s) => ({ ...s, notificationEmail: e.target.value }))}
              placeholder="vas@email.cz" className={inputCls} />
          </div>
          <button onClick={async () => { await fetch('/api/notify', { method: 'POST' }); flash('Testovací notifikace odeslána.') }}
            className="w-full py-2 border border-slate-200 hover:border-[#6c63ff]/50 hover:text-[#6c63ff] text-slate-500 rounded-lg text-sm transition-colors font-medium">
            📤 Odeslat testovací notifikaci
          </button>
        </div>
      </section>

      {/* ANALYSIS */}
      <section className={sectionCls}>
        <h2 className="font-semibold text-lg text-slate-900 mb-4">Analýza</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-slate-500 mb-1.5">Interval automatické analýzy</label>
            <select value={settings.analysisInterval}
              onChange={(e) => setSettings((s) => ({ ...s, analysisInterval: e.target.value }))}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#6c63ff]">
              {['1h', '6h', '12h', '24h'].map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          {settings.lastAnalysisRun && (
            <p className="text-xs text-slate-400">
              Poslední analýza: {new Date(settings.lastAnalysisRun).toLocaleString('cs-CZ')}
            </p>
          )}
          <button onClick={runAnalysis} disabled={analyzing}
            className="w-full py-2.5 bg-[#6c63ff] hover:bg-[#6c63ff]/90 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
            {analyzing ? '🤖 Analyzuji…' : '🤖 Spustit analýzu nyní'}
          </button>
        </div>
      </section>

      {/* ABOUT */}
      <section className={sectionCls}>
        <h2 className="font-semibold text-lg text-slate-900 mb-3">O aplikaci</h2>
        <ul className="text-sm space-y-2 text-slate-500">
          <li>📈 <strong className="text-slate-700">Ceny akcií:</strong> Yahoo Finance API</li>
          <li>📰 <strong className="text-slate-700">Zprávy:</strong> Yahoo Finance RSS + Google News RSS</li>
          <li>🤖 <strong className="text-slate-700">AI analýza:</strong> Claude (Anthropic)</li>
        </ul>
      </section>

      <button onClick={saveSettings}
        className="w-full py-3 bg-[#6c63ff] hover:bg-[#6c63ff]/90 text-white rounded-xl font-semibold transition-colors shadow-sm">
        💾 Uložit nastavení
      </button>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 bg-slate-900 text-white rounded-xl shadow-2xl text-sm font-medium animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  )
}
