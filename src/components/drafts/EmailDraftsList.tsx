'use client'

import React from 'react'
import { EmptyDraftsState } from './EmptyDraftsState'

export interface EmailDraft {
  id: number
  contactId: number
  contactName?: string
  contactEmail?: string
  fromEmail?: string
  subject: string
  body?: string
  status: 'draft' | 'sent' | 'delivered'
  createdAt: string
  opens?: number
  clicks?: number
  isUnsubscribed?: boolean
  unsubscribedAt?: string | null
  unsubscribeReason?: string | null
}

interface EmailDraftsListProps {
  drafts: EmailDraft[]
  isLoading: boolean
  selectedIds: Set<number>
  starredIds: Set<number>
  onSelect: (draftId: number, selected: boolean) => void
  onSelectAll: (selected: boolean) => void
  onToggleStar: (draftId: number) => void
  onView?: (draftId: number) => void
  onEdit?: (draftId: number) => void
  onSend?: (draftId: number) => void
  subscriptionDataLoaded?: boolean
  onResubscribe?: (draftId: number) => void
  resubscribingDraftId?: number | null
}

export function EmailDraftsList({ 
  drafts, 
  isLoading, 
  selectedIds,
  starredIds,
  onSelect,
  onSelectAll,
  onToggleStar,
  onView, 
  onEdit, 
  onSend,
  subscriptionDataLoaded = false,
  onResubscribe,
  resubscribingDraftId = null,
}: EmailDraftsListProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 p-3 border-b border-gray-100 animate-pulse">
            <div className="h-5 w-5 bg-gray-200 rounded"></div>
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

  if (drafts.length === 0) {
    return <EmptyDraftsState type="email" />
  }

  const allSelected = drafts.length > 0 && drafts.every(draft => selectedIds.has(draft.id))
  const someSelected = drafts.some(draft => selectedIds.has(draft.id))

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  const getPreviewText = (body: string | undefined) => {
    if (!body) return ''
    // Remove HTML tags if present and get first 100 characters
    const text = body.replace(/<[^>]*>/g, '').trim()
    return text.length > 100 ? text.substring(0, 100) + '...' : text
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Select All Checkbox */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-gray-200 bg-gray-50">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(input) => {
              if (input) input.indeterminate = someSelected && !allSelected
            }}
            onChange={(e) => onSelectAll(e.target.checked)}
            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
          />
        </label>
        <span className="text-sm text-gray-600">
          {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
        </span>
      </div>

      {/* Drafts List */}
      <div className="divide-y divide-gray-100">
        {drafts.map((draft) => {
          const isSelected = selectedIds.has(draft.id)
          const isUnread = draft.status === 'draft'
          
          return (
            <div
              key={draft.id}
              className={`flex items-center gap-4 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                isSelected ? 'bg-blue-50' : ''
              } ${isUnread ? 'bg-blue-50/30' : ''}`}
              onClick={(e) => {
                // Don't trigger row click if clicking checkbox or action buttons
                if ((e.target as HTMLElement).closest('input[type="checkbox"]') ||
                    (e.target as HTMLElement).closest('button')) {
                  return
                }
                onView?.(draft.id)
              }}
            >
              {/* Checkbox */}
              <div onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => onSelect(draft.id, e.target.checked)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                />
              </div>

              {/* Star Icon */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleStar(draft.id)
                }}
                className={`flex-shrink-0 transition-colors ${
                  starredIds.has(draft.id)
                    ? 'text-yellow-500'
                    : 'text-gray-400 hover:text-yellow-500'
                }`}
                title={starredIds.has(draft.id) ? 'Unstar' : 'Star'}
              >
                <svg className="w-5 h-5" fill={starredIds.has(draft.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </button>

              {/* Sender Avatar */}
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold text-sm">
                  {draft.contactName?.[0]?.toUpperCase() || 'C'}
                </span>
              </div>

              {/* Email Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className={`text-sm truncate ${isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                    {draft.contactName || draft.contactEmail || 'Unknown Contact'}
                  </span>
                  {subscriptionDataLoaded && (
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                          draft.isUnsubscribed ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}
                        title={
                          draft.isUnsubscribed
                            ? [
                                draft.unsubscribedAt ? `Unsubscribed on ${new Date(draft.unsubscribedAt).toLocaleString()}` : undefined,
                                draft.unsubscribeReason ? `Reason: ${draft.unsubscribeReason}` : undefined,
                              ]
                                .filter(Boolean)
                                .join('\n') || 'Contact is unsubscribed'
                            : 'Contact is currently subscribed'
                        }
                      >
                        {draft.isUnsubscribed ? 'Unsubscribed' : 'Subscribed'}
                      </span>
                      {draft.isUnsubscribed && onResubscribe && (
                        <button
                          type="button"
                          className="text-xs text-blue-600 hover:text-blue-800 underline disabled:opacity-60 disabled:cursor-not-allowed"
                          onClick={(e) => {
                            e.stopPropagation()
                            onResubscribe(draft.id)
                          }}
                          disabled={resubscribingDraftId === draft.id}
                        >
                          {resubscribingDraftId === draft.id ? 'Resubscribing…' : 'Resubscribe'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-sm truncate ${isUnread ? 'font-semibold text-gray-900' : 'text-gray-900'}`}>
                    {draft.subject || 'No Subject'}
                  </span>
                  {draft.body && (
                    <span className="text-sm text-gray-500 truncate">
                      - {getPreviewText(draft.body)}
                    </span>
                  )}
                </div>
                {draft.status === 'sent' && (draft.opens !== undefined || draft.clicks !== undefined) && (
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    {draft.opens !== undefined && (
                      <span>📧 {draft.opens} opens</span>
                    )}
                    {draft.clicks !== undefined && draft.clicks > 0 && (
                      <span>📎 {draft.clicks} clicks</span>
                    )}
                  </div>
                )}
              </div>

              {/* Date */}
              <div className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                {formatDate(draft.createdAt)}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                {draft.status === 'draft' && onSend && (
                  <button
                    onClick={() => onSend(draft.id)}
                    className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                    title="Send"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </button>
                )}
                {draft.status === 'draft' && onEdit && (
                  <button
                    onClick={() => onEdit(draft.id)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                    title="Edit"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

