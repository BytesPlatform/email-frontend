'use client'

import { EmailAnalyticsEvent } from '@/types/analytics'
import { useMemo, useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'

export interface AnalyticsEventsTableProps {
  events: EmailAnalyticsEvent[]
  isLoading?: boolean
}

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

type EventFilterKey = 'all' | 'delivery' | 'engagement' | 'compliance'

const FILTER_OPTIONS: Array<{ key: EventFilterKey; label: string }> = [
  { key: 'all', label: 'All events' },
  { key: 'delivery', label: 'Delivery' },
  { key: 'engagement', label: 'Engagement' },
  { key: 'compliance', label: 'Compliance' },
]

const FILTER_MAP: Record<EventFilterKey, EmailAnalyticsEvent['type'][]> = {
  all: [],
  delivery: ['processed', 'deferred', 'delivered', 'bounced', 'blocked', 'dropped'],
  engagement: ['open', 'click'],
  compliance: ['spamreport', 'unsubscribe'],
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

export function AnalyticsEventsTable({ events, isLoading = false }: AnalyticsEventsTableProps) {
  const [activeFilter, setActiveFilter] = useState<EventFilterKey>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 7

  const filteredEvents = useMemo(() => {
    return activeFilter === 'all'
      ? events
      : events.filter(event => FILTER_MAP[activeFilter].includes(event.type))
  }, [events, activeFilter])

  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage)

  const rows = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredEvents.slice(startIndex, endIndex)
  }, [filteredEvents, currentPage, itemsPerPage])

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [activeFilter])

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
      <div className="px-6 py-5 border-b border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900">Recent webhook activity</h3>
        <p className="text-sm text-slate-500">
          View the latest delivery, engagement, and compliance events flowing from SendGrid.
        </p>
      </div>

      <div className="px-6 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap gap-2">
        {FILTER_OPTIONS.map(option => {
          const isActive = activeFilter === option.key
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => setActiveFilter(option.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                isActive
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      {isLoading ? (
        <div className="p-6">
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-12 w-full rounded-lg bg-slate-100 animate-pulse" />
            ))}
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="p-6 text-center text-sm text-slate-500">
          No webhook activity recorded for this filter.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Recipient
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Email address
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Subject
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Occurred
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {rows.map(event => (
                <tr key={event.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${EVENT_ACCENTS[event.type]}`}
                    >
                      {EVENT_LABELS[event.type]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {event.contactName || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {event.email || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {event.subject || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {formatDateTime(event.occurredAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && filteredEvents.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
          <div className="text-sm text-slate-600">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredEvents.length)} of {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}


