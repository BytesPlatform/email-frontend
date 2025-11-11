'use client'

import { EmailAnalyticsOverview } from '@/types/analytics'
import { Fragment } from 'react'

const cardConfig = [
  {
    key: 'requests',
    label: 'Requests',
    description: 'Total emails sent in range',
    accent: 'bg-slate-100 text-slate-900',
    valueKey: 'requests',
    rateKey: null,
  },
  {
    key: 'delivered',
    label: 'Delivered',
    description: 'Successful deliveries',
    accent: 'bg-lime-100 text-lime-800',
    valueKey: 'delivered',
    rateKey: 'deliveryRate',
  },
  {
    key: 'opened',
    label: 'Opened',
    description: 'Recipients who opened',
    accent: 'bg-sky-100 text-sky-800',
    valueKey: 'opened',
    rateKey: 'openRate',
  },
  {
    key: 'clicked',
    label: 'Clicked',
    description: 'Tracked link clicks',
    accent: 'bg-cyan-100 text-cyan-800',
    valueKey: 'clicked',
    rateKey: 'clickRate',
  },
  {
    key: 'bounced',
    label: 'Bounces',
    description: 'Hard & soft bounces',
    accent: 'bg-fuchsia-100 text-fuchsia-800',
    valueKey: 'bounced',
    rateKey: 'bounceRate',
  },
  {
    key: 'spamReports',
    label: 'Spam Reports',
    description: 'Complaints from recipients',
    accent: 'bg-rose-100 text-rose-800',
    valueKey: 'spamReports',
    rateKey: 'spamReportRate',
  },
  {
    key: 'unsubscribes',
    label: 'Unsubscribes',
    description: 'Global unsubscribe events',
    accent: 'bg-amber-100 text-amber-800',
    valueKey: 'unsubscribes',
    rateKey: null,
  },
] as const

export interface AnalyticsStatCardsProps {
  overview?: EmailAnalyticsOverview | null
  isLoading?: boolean
}

const formatPercent = (value: number | undefined) => {
  if (value === undefined || Number.isNaN(value)) {
    return '0%'
  }

  if (value === Infinity) {
    return '∞'
  }

  return `${value.toFixed(1)}%`
}

export function AnalyticsStatCards({ overview, isLoading = false }: AnalyticsStatCardsProps) {
  const isEmpty = !overview

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cardConfig.map(({ key, label, description, accent, valueKey, rateKey }) => {
        const value = overview?.totals?.[valueKey] ?? 0
        const rateValue = rateKey ? overview?.rates?.[rateKey] : undefined

        return (
          <div
            key={key}
            className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">{label}</p>
                <p className="text-xs text-slate-400">{description}</p>
              </div>
              <span
                className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold ${accent}`}
              >
                {isLoading ? '...' : value}
              </span>
            </div>

            <div className="flex items-end justify-between mt-auto">
              <p className="text-3xl font-semibold text-slate-900">
                {isLoading ? (
                  <span className="inline-block h-7 w-20 rounded bg-slate-200 animate-pulse" />
                ) : (
                  value
                )}
              </p>
              <div className="text-right text-sm text-slate-500 space-y-1">
                {rateKey ? (
                  <Fragment>
                    <p className="font-medium text-slate-900">
                      {isLoading ? (
                        <span className="inline-block h-4 w-16 rounded bg-slate-200 animate-pulse" />
                      ) : (
                        formatPercent(rateValue ?? 0)
                      )}
                    </p>
                    <p>{label} rate</p>
                  </Fragment>
                ) : (
                  <p>{isEmpty && !isLoading ? 'No data' : '\u00A0'}</p>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}


