'use client'

import React from 'react'
import type { HistoryViewType } from './HistorySidebar'

export type HistoryItem = {
  id: number
  type: 'sms-sent' | 'email-sent' | 'email-unsubscribed'
  contactName: string
  contactId: number
  emailDraftId?: number
  smsDraftId?: number
  subject?: string
  message?: string
  sentAt: string
  status?: string
  fromEmail?: string
  fromPhone?: string
  toEmail?: string
  toPhone?: string
}

interface HistoryListProps {
  historyItems: HistoryItem[]
  isLoading: boolean
  selectedIds: Set<number>
  onSelect: (id: number, selected: boolean) => void
  onSelectAll: (selected: boolean) => void
  onView?: (id: number) => void
  activeView: HistoryViewType
}

export function HistoryList({
  historyItems,
  isLoading,
  selectedIds,
  onSelect,
  onSelectAll,
  onView,
  activeView,
}: HistoryListProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 p-3 border-b border-gray-100 animate-pulse">
            <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (historyItems.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No History Found</h3>
          <p className="text-sm text-gray-500 text-center mb-6 max-w-md">
            {activeView === 'all' 
              ? "You don't have any history yet. Sent messages and emails will appear here."
              : activeView === 'sms-sent'
              ? "You haven't sent any SMS messages yet."
              : activeView === 'email-sent'
              ? "You haven't sent any emails yet."
              : "No email unsubscribes found."
            }
          </p>
        </div>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (date.toDateString() === today.toDateString()) {
      return `Today ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    }
  }

  const getPreviewText = (message: string | undefined, subject: string | undefined) => {
    const text = subject || message || ''
    const cleanText = text.replace(/<[^>]*>/g, '').trim()
    return cleanText.length > 100 ? cleanText.substring(0, 100) + '...' : cleanText
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sms-sent':
        return (
          <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )
      case 'email-sent':
        return (
          <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        )
      case 'email-unsubscribed':
        return (
          <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        )
      default:
        return null
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'sms-sent':
        return 'bg-gradient-to-br from-green-500 to-teal-600'
      case 'email-sent':
        return 'bg-gradient-to-br from-indigo-500 to-purple-600'
      case 'email-unsubscribed':
        return 'bg-gradient-to-br from-red-500 to-rose-600'
      default:
        return 'bg-gradient-to-br from-gray-500 to-gray-600'
    }
  }

  const getStatusBadge = (type: string, status?: string) => {
    if (type === 'email-unsubscribed') {
      return (
        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
          Unsubscribed
        </span>
      )
    }
    if (status === 'delivered') {
      return (
        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
          Delivered
        </span>
      )
    }
    if (status === 'sent') {
      return (
        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
          Sent
        </span>
      )
    }
    if (status === 'deferred') {
      return (
        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
          Deferred
        </span>
      )
    }
    if (status === 'bounced') {
      return (
        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
          Bounced
        </span>
      )
    }
    if (status === 'dropped') {
      return (
        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
          Dropped
        </span>
      )
    }
    if (status === 'blocked') {
      return (
        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
          Blocked
        </span>
      )
    }
    if (status === 'spamreport') {
      return (
        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
          Spam Report
        </span>
      )
    }
    return null
  }

  // Group history by contactId for better organization
  const groupedByContact = historyItems.reduce((acc, item) => {
    if (!acc[item.contactId]) {
      acc[item.contactId] = []
    }
    acc[item.contactId].push(item)
    return acc
  }, {} as Record<number, HistoryItem[]>)

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* History List - Grouped by Contact */}
      <div className="divide-y divide-gray-100">
        {Object.entries(groupedByContact).map(([contactId, items]) => {
          const contactName = items[0].contactName
          
            return (
            <div key={contactId} className="bg-blue-50/20">
              {/* Contact Header (if multiple items for same contact) */}
              {items.length > 1 && (
                <div className="px-4 py-2 bg-blue-50/50 border-b border-blue-100">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                      <span className="text-white font-semibold text-xs">
                        {contactName?.[0]?.toUpperCase() || 'C'}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {contactName || `Contact ${contactId}`}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({items.length} items)
                    </span>
                  </div>
                </div>
              )}

              {/* History Items for this Contact */}
              {items.map((item) => {
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('button')) {
                        return
                      }
                      onView?.(item.id)
                    }}
                  >
                    {/* Type Icon */}
                    <div className={`h-10 w-10 flex items-center justify-center rounded-full ${getTypeColor(item.type)}`}>
                      {getTypeIcon(item.type)}
              </div>

                    {/* History Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-1">
                        <span className="text-sm font-medium text-gray-700">
                          {contactName || 'Unknown Contact'}
                        </span>
                        {getStatusBadge(item.type, item.status)}
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        {item.subject && (
                          <span className="text-sm font-semibold text-gray-900 truncate">
                            {item.subject}
                          </span>
                        )}
                        {item.message && (
                          <span className="text-sm text-gray-600 truncate">
                            {item.subject ? '- ' : ''}{getPreviewText(item.message, item.subject)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Date */}
                    <div className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                      {formatDate(item.sentAt)}
                            </div>
                            
                    {/* View Button */}
                    {onView && (
                      <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onView(item.id)}
                          className={`p-2 rounded-full transition-colors ${
                            item.type === 'sms-sent'
                              ? 'text-gray-500 hover:text-green-600 hover:bg-green-50'
                              : item.type === 'email-sent'
                              ? 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50'
                              : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                          }`}
                          title="View"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        </div>
                      )}
                  </div>
                )
              })}
            </div>
          )
        })}
            </div>
          </div>
  )
}
