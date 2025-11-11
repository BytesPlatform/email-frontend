'use client'

import { EmailAnalyticsTimelinePoint } from '@/types/analytics'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { useMemo } from 'react'

export interface AnalyticsEventTrendCardProps {
  title: string
  subtitle: string
  data: EmailAnalyticsTimelinePoint[]
  dataKey: keyof EmailAnalyticsTimelinePoint
  color: string
  isLoading?: boolean
}

const formatDateLabel = (iso: string) => {
  const date = new Date(iso)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function AnalyticsEventTrendCard({
  title,
  subtitle,
  data,
  dataKey,
  color,
  isLoading = false,
}: AnalyticsEventTrendCardProps) {
  const chartData = useMemo(() => {
    if (!data?.length) {
      return []
    }

    return data.map(point => ({
      date: formatDateLabel(point.date),
      value: point[dataKey] as number,
    }))
  }, [data, dataKey])

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
      <div>
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>

      <div className="h-56">
        {isLoading ? (
          <div className="h-full w-full animate-pulse rounded-xl bg-slate-100" />
        ) : chartData.length === 0 ? (
          <div className="h-full w-full flex items-center justify-center text-sm text-slate-500">
            No data available for this range.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id={`trend-${String(dataKey)}-gradient`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 6" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, borderColor: '#e2e8f0', boxShadow: 'none' }}
                formatter={value => [value, title]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#trend-${String(dataKey)}-gradient)`}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}


