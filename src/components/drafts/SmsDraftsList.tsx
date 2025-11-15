'use client'

import React from 'react'
import { EmptyDraftsState } from './EmptyDraftsState'

export interface SmsDraft {
  id: number
  contactId: number
  contactName?: string
  contactPhone?: string
  message: string
  status: 'draft' | 'sent' | 'delivered'
  createdAt: string
  characterCount?: number
  clientSms?: {
    id: number
    phoneNumber?: string
    status?: string
    currentCounter?: number
    totalCounter?: number
    limit?: number | null
  }
}

interface SmsDraftsListProps {
  drafts: SmsDraft[]
  isLoading: boolean
  selectedIds: Set<number>
  starredIds: Set<number>
  onSelect: (draftId: number, selected: boolean) => void
  onSelectAll: (selected: boolean) => void
  onToggleStar: (draftId: number) => void
  onView?: (draftId: number) => void
  onEdit?: (draftId: number) => void
  onSend?: (draftId: number) => void
}

export function SmsDraftsList({ 
  drafts, 
  isLoading,
  selectedIds,
  starredIds,
  onSelect,
  onSelectAll,
  onToggleStar,
  onView, 
  onEdit, 
  onSend
}: SmsDraftsListProps) {
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
    return <EmptyDraftsState type="sms" />
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

              {/* Contact Avatar */}
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold text-sm">
                  {draft.contactName?.[0]?.toUpperCase() || 'C'}
                </span>
              </div>

              {/* SMS Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className={`text-sm truncate ${isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                    {draft.contactName || draft.contactPhone || 'Unknown Contact'}
                  </span>
                </div>
                <div className="mb-1">
                  <p className={`text-sm ${isUnread ? 'font-semibold text-gray-900' : 'text-gray-900'}`}>
                    {draft.message}
                  </p>
                </div>
                {draft.characterCount !== undefined && (
                  <div className="text-xs text-gray-500">
                    {draft.characterCount} / 160 characters
                  </div>
                )}
              </div>

              {/* Date */}
              <div className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                {formatDate(draft.createdAt)}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                {onView && (
                  <button
                    onClick={() => onView(draft.id)}
                    className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors"
                    title="View"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
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

