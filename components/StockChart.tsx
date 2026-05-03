'use client'
import { useId, useState } from 'react'
import {
  ResponsiveContainer, ComposedChart, Area, Line,
  XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid,
} from 'recharts'

interface Point { date: string; close: number }
interface ChartPoint extends Point { ma50?: number | null; ma200?: number | null }

function calcMA(data: Point[], period: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < period - 1) return null
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b.close, 0)
    return Math.round((sum / period) * 100) / 100
  })
}

function DarkTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; dataKey: string; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  const close = payload.find((p) => p.dataKey === 'close')
  const ma50  = payload.find((p) => p.dataKey === 'ma50')
  const ma200 = payload.find((p) => p.dataKey === 'ma200')
  return (
    <div className="bg-slate-900 text-white px-3 py-2.5 rounded-xl shadow-2xl text-sm pointer-events-none space-y-1 min-w-[120px]">
      <p className="text-slate-400 text-xs mb-1">{label}</p>
      {close  && <p className="font-bold">${close.value.toFixed(2)}</p>}
      {ma50   && <p className="text-amber-400 text-xs">MA50: ${ma50.value.toFixed(2)}</p>}
      {ma200  && <p className="text-blue-400 text-xs">MA200: ${ma200.value.toFixed(2)}</p>}
    </div>
  )
}

function fmtY(v: number) {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`
  return `$${v.toFixed(0)}`
}

const MA_DESC: Record<string, string> = {
  MA50:  '50denní klouzavý průměr — sleduje krátkodobý trend. Pokud cena je nad MA50, trh je v krátkodobém uptrendu.',
  MA200: '200denní klouzavý průměr — sleduje dlouhodobý trend. Překřížení MA50 nad MA200 = „zlatý kříž" (silný BUY signál).',
}

function MABtn({ label, active, color, onClick }: { label: string; active: boolean; color: string; onClick: () => void }) {
  return (
    <div className="relative group">
      <button onClick={onClick}
        className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-all ${
          active ? `text-white border-transparent` : 'text-slate-400 border-slate-200 bg-white hover:border-slate-300'
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
  const [showMA50, setShowMA50] = useState(true)
  const [showMA200, setShowMA200] = useState(true)

  if (!data || data.length === 0) {
    return <div className="h-16 flex items-center justify-center text-slate-400 text-xs">Žádná data</div>
  }

  const isUp = data[data.length - 1].close >= data[0].close
  const lineColor = isUp ? '#6c63ff' : '#ef4444'
  const gradId = `g-${uid}`

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

  const hasMA50  = data.length >= 50
  const hasMA200 = data.length >= 200
  const ma50arr  = hasMA50  ? calcMA(data, 50)  : []
  const ma200arr = hasMA200 ? calcMA(data, 200) : []

  const chartData: ChartPoint[] = data.map((p, i) => ({
    ...p,
    ma50:  hasMA50  ? ma50arr[i]  : undefined,
    ma200: hasMA200 ? ma200arr[i] : undefined,
  }))

  const values = data.map((d) => d.close)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = (max - min) * 0.1

  return (
    <div>
      {(hasMA50 || hasMA200) && (
        <div className="flex justify-end gap-1.5 mb-3">
          {hasMA50  && <MABtn label="MA50"  active={showMA50}  color="#f59e0b" onClick={() => setShowMA50(v => !v)} />}
          {hasMA200 && <MABtn label="MA200" active={showMA200} color="#3b82f6" onClick={() => setShowMA200(v => !v)} />}
        </div>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
          className="chart-glow" style={{ '--chart-color': lineColor + '99' } as React.CSSProperties}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity={0.3} />
              <stop offset="40%" stopColor={lineColor} stopOpacity={0.1} />
              <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="0" strokeWidth={1} />
          <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickLine={false} axisLine={false}
            tickFormatter={(v: string) => v.slice(5)} interval="preserveStartEnd" />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false}
            tickFormatter={fmtY} domain={[min - pad, max + pad]} width={55} />
          <ReferenceLine y={data[0].close} stroke="#cbd5e1" strokeDasharray="4 4" strokeWidth={1} />
          <Tooltip
            content={<DarkTooltip />}
            cursor={{ stroke: lineColor, strokeWidth: 1, strokeDasharray: '4 4', strokeOpacity: 0.4 }}
          />
          <Area type="natural" dataKey="close" stroke={lineColor} strokeWidth={2.5}
            fill={`url(#${gradId})`} dot={false}
            activeDot={{ r: 5, fill: lineColor, stroke: '#fff', strokeWidth: 2 }} />
          {hasMA50 && showMA50 && (
            <Line type="natural" dataKey="ma50" stroke="#f59e0b" strokeWidth={1.5}
              dot={false} activeDot={false} connectNulls />
          )}
          {hasMA200 && showMA200 && (
            <Line type="natural" dataKey="ma200" stroke="#3b82f6" strokeWidth={1.5}
              dot={false} activeDot={false} connectNulls />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
