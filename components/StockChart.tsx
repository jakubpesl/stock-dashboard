'use client'
import { useId } from 'react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts'

interface Point { date: string; close: number }

function DarkTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 text-white px-3 py-2 rounded-xl shadow-2xl text-sm pointer-events-none">
      <p className="text-slate-400 text-xs mb-0.5">{label}</p>
      <p className="font-bold text-white">${payload[0].value.toFixed(2)}</p>
    </div>
  )
}

function fmtY(v: number) {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`
  return `$${v.toFixed(0)}`
}

export default function StockChart({ data, mini = false }: { data: Point[]; mini?: boolean }) {
  const uid = useId().replace(/:/g, '')

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
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 4 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity={0.22} />
              <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={[min * 0.997, max * 1.003]} hide />
          <Area type="natural" dataKey="close" stroke={lineColor} strokeWidth={2}
            fill={`url(#${gradId})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  const values = data.map((d) => d.close)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = (max - min) * 0.1
  const firstClose = data[0].close

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity={0.28} />
            <stop offset="55%" stopColor={lineColor} stopOpacity={0.06} />
            <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickLine={false} axisLine={false}
          tickFormatter={(v: string) => v.slice(5)} interval="preserveStartEnd" />
        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false}
          tickFormatter={fmtY} domain={[min - pad, max + pad]} width={55} />
        <ReferenceLine y={firstClose} stroke="#cbd5e1" strokeDasharray="4 4" strokeWidth={1} />
        <Tooltip
          content={<DarkTooltip />}
          cursor={{ stroke: lineColor, strokeWidth: 1, strokeDasharray: '4 4', strokeOpacity: 0.5 }}
        />
        <Area type="natural" dataKey="close" stroke={lineColor} strokeWidth={2.5}
          fill={`url(#${gradId})`} dot={false}
          activeDot={{ r: 5, fill: lineColor, stroke: '#fff', strokeWidth: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
