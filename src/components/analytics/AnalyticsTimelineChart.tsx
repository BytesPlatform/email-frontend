'use client'

import { EmailAnalyticsTimelinePoint } from '@/types/analytics'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { useMemo } from 'react'

export interface AnalyticsTimelineChartProps {
  data: EmailAnalyticsTimelinePoint[]
  isLoading?: boolean
}

const COLORS = {
  requests: '#38bdf8',
  delivered: '#0ea5e9',
  opened: '#22d3ee',
  clicked: '#06b6d4',
  bounced: '#d946ef',
  spamReports: '#f43f5e',
}

const formatDateLabel = (iso: string) => {
  const date = new Date(iso)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function AnalyticsTimelineChart({ data, isLoading = false }: AnalyticsTimelineChartProps) {
  const chartData = useMemo(() => {
    if (!data?.length) {
      return []
    }
    return data.map(point => ({
      ...point,
      label: formatDateLabel(point.date),
    }))
  }, [data])

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Engagement trends</h3>
        <p className="text-sm text-slate-500">
          Track delivery and engagement metrics over time to identify performance patterns.
        </p>
      </div>

      <div className="h-80">
        {isLoading ? (
          <div className="h-full w-full animate-pulse rounded-xl bg-slate-100" />
        ) : chartData.length === 0 ? (
          <div className="h-full w-full flex items-center justify-center text-slate-500 text-sm">
            No timeline data available for the selected range.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="4 8" stroke="#e2e8f0" />
              <XAxis dataKey="label" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, borderColor: '#e2e8f0', boxShadow: 'none' }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="requests"
                stroke={COLORS.requests}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="delivered"
                stroke={COLORS.delivered}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="opened"
                stroke={COLORS.opened}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="clicked"
                stroke={COLORS.clicked}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="bounced"
                stroke={COLORS.bounced}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="spamReports"
                stroke={COLORS.spamReports}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}


