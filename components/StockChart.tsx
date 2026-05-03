'use client'
import { useId, useState } from 'react'
import {
  ResponsiveContainer, ComposedChart, Area, Line, Bar, Cell,
  XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid, ReferenceArea,
} from 'recharts'
import { calculateBollingerBands, calculateRSISeries } from '@/lib/indicators'

interface Point { date: string; close: number; volume?: number }
interface ChartPoint extends Point {
  ma50?: number | null
  ma200?: number | null
  bbUpper?: number | null
  bbMiddle?: number | null
  bbLower?: number | null
  rsi?: number | null
}

function calcMA(data: Point[], period: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < period - 1) return null
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b.close, 0)
    return Math.round((sum / period) * 100) / 100
  })
}

function DarkTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { value: number; dataKey: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const close  = payload.find((p) => p.dataKey === 'close')
  const ma50   = payload.find((p) => p.dataKey === 'ma50')
  const ma200  = payload.find((p) => p.dataKey === 'ma200')
  const bbU    = payload.find((p) => p.dataKey === 'bbUpper')
  const bbL    = payload.find((p) => p.dataKey === 'bbLower')
  const vol    = payload.find((p) => p.dataKey === 'volume')
  return (
    <div className="bg-slate-900 text-white px-3 py-2.5 rounded-xl shadow-2xl text-xs pointer-events-none space-y-1 min-w-[130px]">
      <p className="text-slate-400 mb-1">{label}</p>
      {close && <p className="font-bold text-sm">${close.value.toFixed(2)}</p>}
      {ma50  && <p className="text-amber-400">MA50: ${ma50.value.toFixed(2)}</p>}
      {ma200 && <p className="text-blue-400">MA200: ${ma200.value.toFixed(2)}</p>}
      {bbU   && <p className="text-purple-300">BB horní: ${bbU.value.toFixed(2)}</p>}
      {bbL   && <p className="text-purple-300">BB dolní: ${bbL.value.toFixed(2)}</p>}
      {vol   && <p className="text-slate-400">Objem: {(vol.value / 1e6).toFixed(1)}M</p>}
    </div>
  )
}

function RSITooltip({ active, payload, label }: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}) {
  if (!active || !payload?.length || payload[0].value == null) return null
  const rsi = payload[0].value
  const color = rsi < 30 ? '#22c55e' : rsi > 70 ? '#ef4444' : '#94a3b8'
  return (
    <div className="bg-slate-900 text-white px-2.5 py-1.5 rounded-lg shadow-xl text-xs pointer-events-none">
      <p className="text-slate-400">{label}</p>
      <p style={{ color }} className="font-bold">RSI: {rsi}</p>
    </div>
  )
}

function fmtY(v: number) {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`
  return `$${v.toFixed(0)}`
}

const MA_DESC: Record<string, string> = {
  MA50:  '50denní klouzavý průměr — krátkodobý trend. Cena nad MA50 = krátkodobý uptrend.',
  MA200: '200denní klouzavý průměr — dlouhodobý trend. MA50 nad MA200 = Golden Cross (BUY signál).',
  BB:    'Bollingerova pásma (20 dnů, 2σ). Cena u dolního pásma = přeprodáno, u horního = překoupeno.',
}

function ToggleBtn({ label, active, color, onClick }: { label: string; active: boolean; color: string; onClick: () => void }) {
  return (
    <div className="relative group">
      <button onClick={onClick}
        className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-all ${
          active ? 'text-white border-transparent' : 'text-slate-400 border-slate-200 bg-white hover:border-slate-300'
        }`}
        style={active ? { background: color, borderColor: color } : {}}>
        {label}
      </button>
      <div className="absolute bottom-full right-0 mb-2 w-56 bg-slate-900 text-white text-xs rounded-xl px-3 py-2 leading-relaxed shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <span className="font-bold" style={{ color }}>{label}</span> — {MA_DESC[label]}
        <span className="absolute bottom-[-4px] right-3 w-2 h-2 bg-slate-900 rotate-45" />
      </div>
    </div>
  )
}

export default function StockChart({ data, mini = false }: { data: Point[]; mini?: boolean }) {
  const uid = useId().replace(/:/g, '')
  const [showMA50,  setShowMA50]  = useState(true)
  const [showMA200, setShowMA200] = useState(true)
  const [showBB,    setShowBB]    = useState(false)
  const [showVol,   setShowVol]   = useState(true)
  const [showRSI,   setShowRSI]   = useState(true)

  if (!data || data.length === 0) {
    return <div className="h-16 flex items-center justify-center text-slate-400 text-xs">Žádná data</div>
  }

  const isUp = data[data.length - 1].close >= data[0].close
  const lineColor = isUp ? '#6c63ff' : '#ef4444'
  const gradId = `g-${uid}`
  const bbGradId = `bb-${uid}`

  // Mini chart (watchlist card)
  if (mini) {
    const min = Math.min(...data.map((d) => d.close))
    const max = Math.max(...data.map((d) => d.close))
    return (
      <ResponsiveContainer width="100%" height={72}>
        <ComposedChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 4 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity={0.22} />
              <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={[min * 0.997, max * 1.003]} hide />
          <Area type="natural" dataKey="close" stroke={lineColor} strokeWidth={2}
            fill={`url(#${gradId})`} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    )
  }

  // Full chart
  const hasMA50  = data.length >= 50
  const hasMA200 = data.length >= 200
  const hasBB    = data.length >= 20

  const ma50arr  = hasMA50  ? calcMA(data, 50)  : []
  const ma200arr = hasMA200 ? calcMA(data, 200) : []
  const closes   = data.map((d) => d.close)
  const bbArr    = hasBB ? calculateBollingerBands(closes) : []
  const rsiArr   = data.length >= 15 ? calculateRSISeries(closes) : []

  const chartData: ChartPoint[] = data.map((p, i) => ({
    ...p,
    ma50:     hasMA50  ? ma50arr[i]          : undefined,
    ma200:    hasMA200 ? ma200arr[i]         : undefined,
    bbUpper:  hasBB    ? bbArr[i]?.upper     : undefined,
    bbMiddle: hasBB    ? bbArr[i]?.middle    : undefined,
    bbLower:  hasBB    ? bbArr[i]?.lower     : undefined,
    rsi:      rsiArr.length ? rsiArr[i]      : undefined,
  }))

  const values = data.map((d) => d.close)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = (max - min) * 0.1

  const volumes = data.map((d) => d.volume ?? 0).filter(Boolean)
  const maxVol = volumes.length ? Math.max(...volumes) : 0

  const rsiData = chartData.filter((d) => d.rsi != null)
  const currentRSI: number | null = rsiData.length ? (rsiData[rsiData.length - 1].rsi ?? null) : null

  return (
    <div>
      {/* Toggle buttons */}
      <div className="flex justify-between items-center mb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs">
          {currentRSI !== null && (
            <span className={`px-2 py-0.5 rounded-md font-bold text-xs ${
              currentRSI < 30 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
              currentRSI > 70 ? 'bg-red-50 text-red-600 border border-red-200' :
              'bg-slate-100 text-slate-500'
            }`}>
              RSI {currentRSI}
            </span>
          )}
        </div>
        <div className="flex gap-1.5 flex-wrap justify-end">
          <ToggleBtn label="BB"   active={showBB}    color="#8b5cf6" onClick={() => setShowBB(v => !v)} />
          {hasMA50  && <ToggleBtn label="MA50"  active={showMA50}  color="#f59e0b" onClick={() => setShowMA50(v => !v)}  />}
          {hasMA200 && <ToggleBtn label="MA200" active={showMA200} color="#3b82f6" onClick={() => setShowMA200(v => !v)} />}
          {maxVol > 0 && (
            <button onClick={() => setShowVol(v => !v)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-all ${
                showVol ? 'bg-slate-600 text-white border-slate-600' : 'text-slate-400 border-slate-200 bg-white'
              }`}>
              VOL
            </button>
          )}
          <button onClick={() => setShowRSI(v => !v)}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-all ${
              showRSI ? 'text-white border-transparent' : 'text-slate-400 border-slate-200 bg-white'
            }`}
            style={showRSI ? { background: '#64748b', borderColor: '#64748b' } : {}}>
            RSI
          </button>
        </div>
      </div>

      {/* Main price chart */}
      <ResponsiveContainer width="100%" height={showVol && maxVol > 0 ? 260 : 300}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
          className="chart-glow" style={{ '--chart-color': lineColor + '99' } as React.CSSProperties}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity={0.3} />
              <stop offset="40%" stopColor={lineColor} stopOpacity={0.1} />
              <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
            </linearGradient>
            <linearGradient id={bbGradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.08} />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#f1f5f9" strokeWidth={1} />
          <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickLine={false} axisLine={false}
            tickFormatter={(v: string) => v.slice(5)} interval="preserveStartEnd" />
          <YAxis yAxisId="price" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false}
            tickFormatter={fmtY} domain={[min - pad, max + pad]} width={55} />
          {showVol && maxVol > 0 && (
            <YAxis yAxisId="vol" orientation="right" hide domain={[0, maxVol * 6]} />
          )}
          <ReferenceLine yAxisId="price" y={data[0].close} stroke="#cbd5e1" strokeDasharray="4 4" strokeWidth={1} />
          <Tooltip
            content={<DarkTooltip />}
            cursor={{ stroke: lineColor, strokeWidth: 1, strokeDasharray: '4 4', strokeOpacity: 0.4 }}
          />

          {/* Volume bars */}
          {showVol && maxVol > 0 && (
            <Bar yAxisId="vol" dataKey="volume" radius={[1, 1, 0, 0]} opacity={0.35}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.close >= (chartData[i - 1]?.close ?? entry.close) ? '#22c55e' : '#ef4444'} />
              ))}
            </Bar>
          )}

          {/* Bollinger Bands */}
          {showBB && hasBB && (
            <>
              <Area type="natural" yAxisId="price" dataKey="bbUpper" stroke="#8b5cf6" strokeWidth={1}
                strokeDasharray="3 2" fill={`url(#${bbGradId})`} dot={false} activeDot={false} connectNulls />
              <Line type="natural" yAxisId="price" dataKey="bbMiddle" stroke="#8b5cf6" strokeWidth={1}
                strokeDasharray="4 3" dot={false} activeDot={false} connectNulls opacity={0.5} />
              <Area type="natural" yAxisId="price" dataKey="bbLower" stroke="#8b5cf6" strokeWidth={1}
                strokeDasharray="3 2" fill="none" dot={false} activeDot={false} connectNulls />
            </>
          )}

          {/* Price area */}
          <Area yAxisId="price" type="natural" dataKey="close" stroke={lineColor} strokeWidth={2.5}
            fill={`url(#${gradId})`} dot={false}
            activeDot={{ r: 5, fill: lineColor, stroke: '#fff', strokeWidth: 2 }} />

          {/* MA lines */}
          {hasMA50 && showMA50 && (
            <Line yAxisId="price" type="natural" dataKey="ma50" stroke="#f59e0b" strokeWidth={1.5}
              dot={false} activeDot={false} connectNulls />
          )}
          {hasMA200 && showMA200 && (
            <Line yAxisId="price" type="natural" dataKey="ma200" stroke="#3b82f6" strokeWidth={1.5}
              dot={false} activeDot={false} connectNulls />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Volume bar chart */}
      {showVol && maxVol > 0 && (
        <ResponsiveContainer width="100%" height={50}>
          <ComposedChart data={chartData} margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
            <XAxis dataKey="date" hide />
            <YAxis hide domain={[0, maxVol * 1.1]} />
            <Bar dataKey="volume" radius={[1, 1, 0, 0]} opacity={0.5}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.close >= (chartData[i - 1]?.close ?? entry.close) ? '#22c55e' : '#ef4444'} />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      )}

      {/* RSI sub-chart */}
      {showRSI && rsiArr.length > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">RSI (14)</span>
            <span className="text-[10px] text-slate-400">
              <span className="text-emerald-500">▬ 30</span>
              <span className="mx-1.5 text-slate-200">|</span>
              <span className="text-red-400">▬ 70</span>
            </span>
          </div>
          <ResponsiveContainer width="100%" height={70}>
            <ComposedChart data={chartData} margin={{ top: 2, right: 12, left: 0, bottom: 0 }}>
              <XAxis dataKey="date" hide />
              <YAxis domain={[0, 100]} hide />
              <ReferenceArea y1={0}  y2={30} fill="#22c55e" fillOpacity={0.06} />
              <ReferenceArea y1={70} y2={100} fill="#ef4444" fillOpacity={0.06} />
              <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="3 3" strokeWidth={1} opacity={0.6} />
              <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1} opacity={0.6} />
              <ReferenceLine y={50} stroke="#cbd5e1" strokeDasharray="2 4" strokeWidth={1} opacity={0.4} />
              <Tooltip content={<RSITooltip />} cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '3 3' }} />
              <Line type="natural" dataKey="rsi" stroke="#6c63ff" strokeWidth={1.5}
                dot={false} activeDot={{ r: 3, fill: '#6c63ff', stroke: '#fff', strokeWidth: 1.5 }}
                connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
