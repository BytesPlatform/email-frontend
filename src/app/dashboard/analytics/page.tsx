'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AuthGuard } from '@/components/auth/AuthGuard'
import {
  AnalyticsStatCards,
  AnalyticsTimelineChart,
  AnalyticsEventsTable,
  AnalyticsEventTrendCard,
} from '@/components/analytics'
import { sendgridAnalyticsApi } from '@/api/analytics'
import {
  AnalyticsQueryParams,
  EmailAnalyticsEvent,
  EmailAnalyticsOverview,
  EmailAnalyticsTimelinePoint,
} from '@/types/analytics'

const RANGE_OPTIONS = [
  { label: '1 day', value: 1 },
  { label: '7 days', value: 7 },
  { label: '14 days', value: 14 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
]

const makeRangeParams = (days: number): AnalyticsQueryParams => {
  const to = new Date()
  const from = new Date()
  from.setDate(to.getDate() - (days - 1))
  return {
    from: from.toISOString(),
    to: to.toISOString(),
  }
}

export default function AnalyticsPage() {
  const [selectedRange, setSelectedRange] = useState<number>(14)
  const [selectedFromEmail, setSelectedFromEmail] = useState<string>('')
  const [availableEmails, setAvailableEmails] = useState<string[]>([])
  const [isLoadingEmails, setIsLoadingEmails] = useState<boolean>(false)
  const [overview, setOverview] = useState<EmailAnalyticsOverview | null>(null)
  const [timeline, setTimeline] = useState<EmailAnalyticsTimelinePoint[]>([])
  const [events, setEvents] = useState<EmailAnalyticsEvent[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const rangeParams = useMemo(() => {
    const params = makeRangeParams(selectedRange)
    if (selectedFromEmail) {
      params.fromEmail = selectedFromEmail
    }
    return params
  }, [selectedRange, selectedFromEmail])

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [overviewRes, timelineRes, eventsRes] = await Promise.all([
        sendgridAnalyticsApi.getOverview(rangeParams),
        sendgridAnalyticsApi.getTimeline(rangeParams),
        sendgridAnalyticsApi.getRecentEvents(rangeParams),
      ])

      if (!overviewRes.success) {
        throw new Error(overviewRes.error || 'Failed to load overview metrics.')
      }

      if (!timelineRes.success) {
        throw new Error(timelineRes.error || 'Failed to load timeline metrics.')
      }

      if (!eventsRes.success) {
        throw new Error(eventsRes.error || 'Failed to load recent events.')
      }

      setOverview(overviewRes.data ?? null)
      setTimeline(timelineRes.data ?? [])
      setEvents(eventsRes.data ?? [])
    } catch (err) {
      console.error('[AnalyticsPage] Failed to load analytics', err)
      setError(err instanceof Error ? err.message : 'Unexpected error loading analytics.')
    } finally {
      setIsLoading(false)
    }
  }, [rangeParams])

  // Load available sender emails (emails that have actually sent emails)
  useEffect(() => {
    const loadSenderEmails = async () => {
      setIsLoadingEmails(true)
      try {
        const response = await sendgridAnalyticsApi.getSenders()
        if (response.success && response.data) {
          setAvailableEmails(response.data)
        }
      } catch (err) {
        console.error('[AnalyticsPage] Failed to load sender emails', err)
      } finally {
        setIsLoadingEmails(false)
      }
    }
    void loadSenderEmails()
  }, [])

  useEffect(() => {
    void loadAnalytics()
  }, [loadAnalytics])

  return (
    <AuthGuard>
      <div className="bg-gray-50 min-h-screen py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
           <header className="rounded-3xl bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white shadow-xl space-y-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm font-medium text-white/90 hover:text-white transition"
            >
              <span className="text-lg leading-none">←</span>
              Back to Dashboard
            </Link>

            <div className="space-y-2">
               <h1 className="text-3xl font-semibold">Analytics</h1>
              <p className="text-white/90 max-w-3xl text-sm sm:text-base">
                 Monitor the full lifecycle of your outbound email traffic : deliveries, engagement,
                 complaints, and unsubscribes.
              </p>
            </div>
          </header>

          <div className="space-y-8 pt-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
                {RANGE_OPTIONS.map(option => {
                  const isActive = selectedRange === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                      onClick={() => setSelectedRange(option.value)}
                      disabled={isActive}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>

              {/* From Email Filter */}
              {availableEmails.length > 0 && (
                <div className="relative">
                  <select
                    value={selectedFromEmail}
                    onChange={(e) => setSelectedFromEmail(e.target.value)}
                    disabled={isLoadingEmails}
                    className="appearance-none bg-white border border-slate-200 rounded-full px-4 py-1.5 pr-8 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">All Email Addresses</option>
                    {availableEmails.map((email) => (
                      <option key={email} value={email}>
                        {email}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => loadAnalytics()}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
              >
                Refresh
              </button>
            </div>

            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}
          </div>

          <section className="space-y-6 pt-2">
            <AnalyticsStatCards overview={overview} isLoading={isLoading} />
            <AnalyticsTimelineChart data={timeline} isLoading={isLoading} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <AnalyticsEventTrendCard
                title="Unsubscribes"
                subtitle="Recipients opting out per day"
                data={timeline}
                dataKey="unsubscribes"
                color="#fbbf24"
                isLoading={isLoading}
              />
              <AnalyticsEventTrendCard
                title="Bounces"
                subtitle="Hard & soft bounces detected"
                data={timeline}
                dataKey="bounced"
                color="#f472b6"
                isLoading={isLoading}
              />
              <AnalyticsEventTrendCard
                title="Spam complaints"
                subtitle="Spam reports received"
                data={timeline}
                dataKey="spamReports"
                color="#f87171"
                isLoading={isLoading}
              />
            </div>

            <AnalyticsEventsTable events={events} isLoading={isLoading} />
          </section>
        </div>
      </div>
    </AuthGuard>
  )
}


