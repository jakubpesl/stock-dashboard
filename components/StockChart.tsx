'use client'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

interface Point { date: string; close: number }

export default function StockChart({
  data,
  mini = false,
}: {
  data: Point[]
  mini?: boolean
}) {
  if (!data || data.length === 0) {
    return <div className="h-16 flex items-center justify-center text-[#94a3b8] text-xs">Žádná data</div>
  }

  if (mini) {
    const isUp = data[data.length - 1].close >= data[0].close
    const color = isUp ? '#22c55e' : '#ef4444'
    const min = Math.min(...data.map((d) => d.close))
    const max = Math.max(...data.map((d) => d.close))
    return (
      <ResponsiveContainer width="100%" height={64}>
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
          <defs>
            <linearGradient id={`mini-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={[min * 0.998, max * 1.002]} hide />
          <Area type="monotone" dataKey="close" stroke={color} strokeWidth={1.5}
            fill={`url(#mini-${color})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6c63ff" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6c63ff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
        <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false}
          tickFormatter={(v) => v.slice(5)} interval="preserveStartEnd" />
        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false}
          tickFormatter={(v: number) => `$${v}`} domain={['auto', 'auto']} width={60} />
        <Tooltip
          contentStyle={{ background: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: 8 }}
          labelStyle={{ color: '#94a3b8' }} itemStyle={{ color: '#f1f5f9' }}
          formatter={(v: number) => [`$${v.toFixed(2)}`, 'Cena']}
        />
        <Area type="monotone" dataKey="close" stroke="#6c63ff" strokeWidth={2}
          fill="url(#chartGrad)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
