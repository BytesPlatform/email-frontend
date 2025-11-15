'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { sendgridAnalyticsApi } from '@/api/analytics'
import { EmailAnalyticsEvent } from '@/types/analytics'

const EVENT_LABELS: Record<EmailAnalyticsEvent['type'], string> = {
  processed: 'Processed',
  deferred: 'Deferred',
  delivered: 'Delivered',
  bounced: 'Bounced',
  blocked: 'Blocked',
  dropped: 'Dropped',
  spamreport: 'Spam Report',
  unsubscribe: 'Unsubscribe',
  open: 'Open',
  click: 'Click',
}

const EVENT_ACCENTS: Record<EmailAnalyticsEvent['type'], string> = {
  processed: 'bg-indigo-100 text-indigo-700',
  deferred: 'bg-amber-100 text-amber-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  bounced: 'bg-rose-100 text-rose-700',
  blocked: 'bg-fuchsia-100 text-fuchsia-700',
  dropped: 'bg-slate-100 text-slate-700',
  spamreport: 'bg-rose-100 text-rose-700',
  unsubscribe: 'bg-orange-100 text-orange-700',
  open: 'bg-sky-100 text-sky-700',
  click: 'bg-cyan-100 text-cyan-700',
}

const formatDateTime = (iso: string) => {
  const date = new Date(iso)
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const makeRange = (days: number) => {
  const to = new Date()
  const from = new Date()
  from.setDate(to.getDate() - (days - 1))
  return {
    from: from.toISOString(),
    to: to.toISOString(),
  }
}

export function RecentActivity() {
  const [events, setEvents] = useState<EmailAnalyticsEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await sendgridAnalyticsApi.getRecentEvents(makeRange(14))
      if (response.success) {
        setEvents(response.data ?? [])
      } else {
        setError(response.error || 'Unable to load recent activity.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load recent activity.')
      console.error('[RecentActivity] Failed to load analytics events:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchEvents()
  }, [])

  const rows = useMemo(() => events.slice(0, 6), [events])

  return (
    <Card variant="elevated">
      <CardHeader
        title="Recent Activity"
        subtitle="Latest delivery, engagement, and compliance events"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      >
        <Link
          href="/dashboard/analytics"
          className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition"
        >
          View analytics
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-12 w-full rounded-lg bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700 space-y-3">
            <p>We couldn’t load the latest activity right now.</p>
            <button
              type="button"
              onClick={() => fetchEvents()}
              className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition border border-amber-200"
            >
              Try again
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-8">
            <div className="mx-auto w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">No recent activity</h3>
            <p className="text-sm text-slate-500">Send some emails to see webhook events appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map(event => (
              <div key={event.id} className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold min-w-[90px] ${EVENT_ACCENTS[event.type]}`}
                  >
                    {EVENT_LABELS[event.type]}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {event.contactName || event.email || 'Unknown recipient'}
                    </p>
                    <p className="text-xs text-slate-500 line-clamp-1">
                      {event.subject || event.email || 'No subject available'}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap">{formatDateTime(event.occurredAt)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}