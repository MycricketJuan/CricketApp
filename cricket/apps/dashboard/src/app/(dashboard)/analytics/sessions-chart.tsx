'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export interface DailySession {
  date: string
  isoDate: string
  total: number
  completed: number
  escalated: number
}

interface Props {
  data: DailySession[]
}

export function SessionsChart({ data }: Props) {
  const hasData = data.some((d) => d.total > 0)

  if (!hasData) {
    return (
      <div
        style={{
          height: 240,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-tertiary)',
          fontSize: 13,
        }}
      >
        Sin sesiones en los últimos 30 días
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} barGap={2} barCategoryGap="30%">
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--color-border-tertiary)"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
          width={28}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--color-background-primary)',
            border: '0.5px solid var(--color-border-tertiary)',
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: 'var(--color-text-primary)', marginBottom: 4 }}
          cursor={{ fill: 'var(--color-background-secondary)' }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{
            fontSize: 12,
            paddingTop: 16,
            color: 'var(--color-text-secondary)',
          }}
        />
        <Bar dataKey="total" name="Total" fill="#D85A30" radius={[3, 3, 0, 0]} />
        <Bar dataKey="completed" name="Completadas" fill="#1D9E75" radius={[3, 3, 0, 0]} />
        <Bar dataKey="escalated" name="Escaladas" fill="#BA7517" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
