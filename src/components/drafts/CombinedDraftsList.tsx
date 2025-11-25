'use client'

import React from 'react'
import { EmptyDraftsState } from './EmptyDraftsState'
import type { EmailDraft } from './EmailDraftsList'
import type { SmsDraft } from './SmsDraftsList'

type CombinedDraft = {
  type: 'email' | 'sms'
  draft: EmailDraft | SmsDraft
  contactId: number
}

interface CombinedDraftsListProps {
  combinedDrafts: CombinedDraft[]
  isLoading: boolean
  selectedEmailIds: Set<number>
  selectedSmsIds: Set<number>
  starredEmailIds: Set<number>
  starredSmsIds: Set<number>
  onEmailSelect: (draftId: number, selected: boolean) => void
  onSmsSelect: (draftId: number, selected: boolean) => void
  onSelectAll: (selected: boolean) => void
  onToggleEmailStar: (draftId: number) => void
  onToggleSmsStar: (draftId: number) => void
  onView?: (draftId: number, type: 'email' | 'sms') => void
  subscriptionDataLoaded?: boolean
  onEmailResubscribe?: (draftId: number) => void
  resubscribingEmailDraftId?: number | null
}

export function CombinedDraftsList({
  combinedDrafts,
  isLoading,
  selectedEmailIds,
  selectedSmsIds,
  starredEmailIds,
  starredSmsIds,
  onEmailSelect,
  onSmsSelect,
  onSelectAll,
  onToggleEmailStar,
  onToggleSmsStar,
  onView,
  subscriptionDataLoaded: _subscriptionDataLoaded = false,
  onEmailResubscribe: _onEmailResubscribe,
  resubscribingEmailDraftId: _resubscribingEmailDraftId = null,
}: CombinedDraftsListProps) {
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

  if (combinedDrafts.length === 0) {
    return <EmptyDraftsState type="email" />
  }

  const allSelected = combinedDrafts.every(item => {
    if (item.type === 'email') {
      return selectedEmailIds.has(item.draft.id)
    } else {
      return selectedSmsIds.has(item.draft.id)
    }
  })
  const someSelected = combinedDrafts.some(item => {
    if (item.type === 'email') {
      return selectedEmailIds.has(item.draft.id)
    } else {
      return selectedSmsIds.has(item.draft.id)
    }
  })

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

  const getPreviewText = (body: string | undefined, message: string | undefined) => {
    const text = body || message || ''
    const cleanText = text.replace(/<[^>]*>/g, '').trim()
    return cleanText.length > 100 ? cleanText.substring(0, 100) + '...' : cleanText
  }

  // Group drafts by contactId for better organization
  const groupedByContact = combinedDrafts.reduce((acc, item) => {
    if (!acc[item.contactId]) {
      acc[item.contactId] = []
    }
    acc[item.contactId].push(item)
    return acc
  }, {} as Record<number, CombinedDraft[]>)

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
          {selectedEmailIds.size + selectedSmsIds.size > 0 
            ? `${selectedEmailIds.size + selectedSmsIds.size} selected` 
            : 'Select all'}
        </span>
      </div>

      {/* Drafts List - Grouped by Contact */}
      <div className="divide-y divide-gray-100">
        {Object.entries(groupedByContact).map(([contactId, items]) => {
          const contactName = items[0].type === 'email' 
            ? (items[0].draft as EmailDraft).contactName 
            : (items[0].draft as SmsDraft).contactName
          
          return (
            <div key={contactId} className="bg-blue-50/20">
              {/* Contact Header (if multiple drafts for same contact) */}
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
                      ({items.length} drafts)
                    </span>
                  </div>
                </div>
              )}

              {/* Draft Items for this Contact */}
              {items.map((item) => {
                const isSelected = item.type === 'email' 
                  ? selectedEmailIds.has(item.draft.id)
                  : selectedSmsIds.has(item.draft.id)
                const isStarred = item.type === 'email'
                  ? starredEmailIds.has(item.draft.id)
                  : starredSmsIds.has(item.draft.id)
                const isUnread = item.draft.status === 'draft'
                
                const emailDraft = item.type === 'email' ? item.draft as EmailDraft : null
                const smsDraft = item.type === 'sms' ? item.draft as SmsDraft : null

                return (
                  <div
                    key={`${item.type}-${item.draft.id}`}
                    className={`flex items-center gap-4 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50' : ''
                    } ${isUnread ? 'bg-blue-50/30' : ''}`}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('input[type="checkbox"]') ||
                          (e.target as HTMLElement).closest('button')) {
                        return
                      }
                      onView?.(item.draft.id, item.type)
                    }}
                  >
                    {/* Checkbox */}
                    <div onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (item.type === 'email') {
                            onEmailSelect(item.draft.id, e.target.checked)
                          } else {
                            onSmsSelect(item.draft.id, e.target.checked)
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>

                    {/* Star Icon */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (item.type === 'email') {
                          onToggleEmailStar(item.draft.id)
                        } else {
                          onToggleSmsStar(item.draft.id)
                        }
                      }}
                      className={`flex-shrink-0 transition-colors ${
                        isStarred
                          ? 'text-yellow-500'
                          : 'text-gray-400 hover:text-yellow-500'
                      }`}
                      title={isStarred ? 'Unstar' : 'Star'}
                    >
                      <svg className="w-5 h-5" fill={isStarred ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </button>

                    {/* Type Icon */}
                    <div
                      className={`h-10 w-10 flex items-center justify-center rounded-full ${
                        item.type === 'email'
                          ? 'bg-gradient-to-br from-indigo-500 to-purple-600'
                          : 'bg-gradient-to-br from-green-500 to-teal-600'
                      }`}
                    >
                      {item.type === 'email' ? (
                        <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      )}
                    </div>

                    {/* Draft Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-1">
                        <span className={`text-sm truncate ${isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                          {emailDraft?.contactName || smsDraft?.contactName || 'Unknown Contact'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        {emailDraft && (
                          <>
                            <span className={`text-sm truncate ${isUnread ? 'font-semibold text-gray-900' : 'text-gray-900'}`}>
                              {emailDraft.subject || 'No Subject'}
                            </span>
                            {emailDraft.body && (
                              <span className="text-sm text-gray-500 truncate">
                                - {getPreviewText(emailDraft.body, undefined)}
                              </span>
                            )}
                          </>
                        )}
                        {smsDraft && (
                          <span className={`text-sm ${isUnread ? 'font-semibold text-gray-900' : 'text-gray-900'}`}>
                            {getPreviewText(undefined, smsDraft.message)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Date */}
                    <div className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                      {formatDate(item.draft.createdAt)}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      {onView && (
                        <button
                          onClick={() => onView(item.draft.id, item.type)}
                          className={`p-2 rounded-full transition-colors ${
                            item.type === 'email'
                              ? 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50'
                              : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
                          }`}
                          title="View"
                        >
                          {item.type === 'email' ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
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

