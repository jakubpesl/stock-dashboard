'use client'
import { useState, useEffect } from 'react'
import NotificationToggle from '@/components/NotificationToggle'

interface Ticker { symbol: string; alias: string; notificationsEnabled: boolean }
interface Settings { notificationEmail: string; analysisInterval: string; lastAnalysisRun: string | null }

export default function SettingsPage() {
  const [tickers, setTickers] = useState<Ticker[]>([])
  const [settings, setSettings] = useState<Settings>({ notificationEmail: '', analysisInterval: '6h', lastAnalysisRun: null })
  const [symbol, setSymbol] = useState('')
  const [alias, setAlias] = useState('')
  const [adding, setAdding] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [msg, setMsg] = useState('')

  function flash(text: string) { setMsg(text); setTimeout(() => setMsg(''), 3000) }

  useEffect(() => {
    Promise.all([
      fetch('/api/watchlist').then((r) => r.json()),
      fetch('/api/settings').then((r) => r.json()),
    ]).then(([wl, s]) => { setTickers(wl.tickers ?? []); setSettings(s) })
  }, [])

  async function addTicker() {
    if (!symbol) return
    setAdding(true)
    const res = await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, alias: alias || symbol }),
    })
    const json = await res.json()
    if (json.ok) { setTickers((p) => [...p, json.ticker]); setSymbol(''); setAlias(''); flash('Ticker přidán.') }
    else flash(json.error ?? 'Chyba')
    setAdding(false)
  }

  async function deleteTicker(sym: string) {
    await fetch(`/api/watchlist?symbol=${sym}`, { method: 'DELETE' })
    setTickers((p) => p.filter((t) => t.symbol !== sym))
  }

  async function saveSettings() {
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) })
    flash('Nastavení uloženo.')
  }

  async function runAnalysis() {
    setAnalyzing(true)
    await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    flash('Analýza dokončena.')
    setAnalyzing(false)
  }

  async function enablePush() {
    if (!('Notification' in window)) return alert('Prohlížeč nepodporuje notifikace.')
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') return alert('Notifikace zamítnuty.')
    const reg = await navigator.serviceWorker.ready
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidKey) return alert('VAPID klíč není nastaven v .env.local')
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKey })
    await fetch('/api/push-subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub) })
    flash('Push notifikace aktivovány.')
  }

  const inputCls = 'w-full bg-white/5 border border-[#2a2a3a] rounded-lg px-3 py-2 text-sm text-[#f1f5f9] outline-none focus:border-[#6c63ff] transition-colors'

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-[#f1f5f9] mb-8">Nastavení</h1>

      {msg && (
        <div className="mb-4 px-4 py-2 bg-[#6c63ff]/20 text-[#6c63ff] rounded-lg text-sm">{msg}</div>
      )}

      {/* WATCHLIST */}
      <section className="bg-[#1a1a24] border border-[#2a2a3a] rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-lg text-[#f1f5f9] mb-4">Watchlist</h2>
        <div className="flex gap-2 mb-4 flex-wrap">
          <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && addTicker()}
            placeholder="Ticker (AAPL)" maxLength={10}
            className="flex-1 min-w-28 bg-white/5 border border-[#2a2a3a] rounded-lg px-3 py-2 text-sm text-[#f1f5f9] outline-none focus:border-[#6c63ff]" />
          <input value={alias} onChange={(e) => setAlias(e.target.value)}
            placeholder="Název (Apple)" maxLength={30}
            className="flex-1 min-w-28 bg-white/5 border border-[#2a2a3a] rounded-lg px-3 py-2 text-sm text-[#f1f5f9] outline-none focus:border-[#6c63ff]" />
          <button onClick={addTicker} disabled={adding || tickers.length >= 10}
            className="px-4 py-2 bg-[#6c63ff] hover:bg-[#6c63ff]/80 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
            {adding ? '…' : '+ Přidat'}
          </button>
        </div>
        <div className="space-y-2">
          {tickers.map((t) => (
            <div key={t.symbol} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div>
                <span className="font-medium text-[#f1f5f9]">{t.symbol}</span>
                <span className="text-[#94a3b8] text-sm ml-2">{t.alias}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#94a3b8]">Notif.</span>
                <NotificationToggle symbol={t.symbol} enabled={t.notificationsEnabled}
                  onChange={(v) => setTickers((p) => p.map((x) => x.symbol === t.symbol ? { ...x, notificationsEnabled: v } : x))} />
                <button onClick={() => deleteTicker(t.symbol)}
                  className="text-[#ef4444] hover:text-[#ef4444]/70 text-sm transition-colors">
                  Smazat
                </button>
              </div>
            </div>
          ))}
          {tickers.length === 0 && (
            <p className="text-[#94a3b8] text-sm text-center py-4">Žádné tickery ve watchlistu.</p>
          )}
        </div>
      </section>

      {/* NOTIFICATIONS */}
      <section className="bg-[#1a1a24] border border-[#2a2a3a] rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-lg text-[#f1f5f9] mb-4">Notifikace</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-[#94a3b8] mb-1">E-mail pro notifikace</label>
            <input type="email" value={settings.notificationEmail}
              onChange={(e) => setSettings((s) => ({ ...s, notificationEmail: e.target.value }))}
              placeholder="vas@email.cz" className={inputCls} />
          </div>
          <button onClick={enablePush}
            className="w-full py-2 border border-[#2a2a3a] hover:border-[#6c63ff] text-[#94a3b8] hover:text-[#f1f5f9] rounded-lg text-sm transition-colors">
            🔔 Aktivovat Push Notifikace
          </button>
          <button onClick={async () => { await fetch('/api/notify', { method: 'POST' }); flash('Testovací notifikace odeslána.') }}
            className="w-full py-2 border border-[#2a2a3a] hover:border-[#6c63ff] text-[#94a3b8] hover:text-[#f1f5f9] rounded-lg text-sm transition-colors">
            📤 Odeslat testovací notifikaci
          </button>
        </div>
      </section>

      {/* ANALYSIS */}
      <section className="bg-[#1a1a24] border border-[#2a2a3a] rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-lg text-[#f1f5f9] mb-4">Analýza</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-[#94a3b8] mb-1">Interval automatické analýzy</label>
            <select value={settings.analysisInterval}
              onChange={(e) => setSettings((s) => ({ ...s, analysisInterval: e.target.value }))}
              className="bg-white/5 border border-[#2a2a3a] rounded-lg px-3 py-2 text-sm text-[#f1f5f9] outline-none focus:border-[#6c63ff]">
              {['1h', '6h', '12h', '24h'].map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          {settings.lastAnalysisRun && (
            <p className="text-xs text-[#94a3b8]">
              Poslední analýza: {new Date(settings.lastAnalysisRun).toLocaleString('cs-CZ')}
            </p>
          )}
          <button onClick={runAnalysis} disabled={analyzing}
            className="w-full py-2 bg-[#6c63ff] hover:bg-[#6c63ff]/80 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
            {analyzing ? '🤖 Analyzuji…' : '🤖 Spustit analýzu nyní'}
          </button>
        </div>
      </section>

      {/* ABOUT */}
      <section className="bg-[#1a1a24] border border-[#2a2a3a] rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-lg text-[#f1f5f9] mb-2">O aplikaci</h2>
        <p className="text-[#94a3b8] text-sm mb-3">Zdroje dat — bez registrace, zdarma:</p>
        <ul className="text-sm space-y-2 text-[#94a3b8]">
          <li>📈 <strong className="text-[#f1f5f9]">Ceny akcií:</strong> Yahoo Finance (yahoo-finance2)</li>
          <li>📰 <strong className="text-[#f1f5f9]">Zprávy:</strong> Yahoo Finance RSS + Google News RSS</li>
          <li>🤖 <strong className="text-[#f1f5f9]">AI analýza a sentiment:</strong> Claude (Anthropic)</li>
        </ul>
        <p className="text-[#94a3b8] text-sm mt-3">
          Jediný požadovaný API klíč:{' '}
          <code className="bg-white/10 px-1 rounded text-[#f1f5f9]">ANTHROPIC_API_KEY</code>{' '}
          v souboru{' '}
          <code className="bg-white/10 px-1 rounded text-[#f1f5f9]">.env.local</code> —{' '}
          viz{' '}
          <a href="https://console.anthropic.com" target="_blank" className="text-[#6c63ff] underline">
            console.anthropic.com
          </a>
        </p>
      </section>

      <button onClick={saveSettings}
        className="w-full py-3 bg-[#6c63ff] hover:bg-[#6c63ff]/80 text-white rounded-xl font-medium transition-colors">
        💾 Uložit nastavení
      </button>
    </div>
  )
}
