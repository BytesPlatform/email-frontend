'use client'

import React from 'react'
import { Button } from '@/components/ui/Button'
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
}

interface SmsDraftsListProps {
  drafts: SmsDraft[]
  isLoading: boolean
  onView?: (draftId: number) => void
  onEdit?: (draftId: number) => void
  onSend?: (draftId: number) => void
}

export function SmsDraftsList({ 
  drafts, 
  isLoading, 
  onView, 
  onEdit, 
  onSend
}: SmsDraftsListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    )
  }

  if (drafts.length === 0) {
    return <EmptyDraftsState type="sms" />
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">✅ Sent</span>
      case 'delivered':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">✅ Delivered</span>
      default:
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">📝 Draft</span>
    }
  }

  return (
    <div className="space-y-3">
      {drafts.map((draft) => (
        <div key={draft.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all hover:border-green-300">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold text-xs">
                    {draft.contactName?.[0]?.toUpperCase() || 'C'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">
                    {draft.contactName || 'Unknown Contact'}
                  </h3>
                  <p className="text-xs text-gray-500 truncate">{draft.contactPhone || 'No phone'}</p>
                </div>
              </div>
              
              <div className="mt-2">
                <p className="text-sm text-gray-900 mb-1">{draft.message}</p>
                {draft.characterCount !== undefined && (
                  <p className="text-xs text-gray-500">
                    {draft.characterCount} / 160 characters
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {getStatusBadge(draft.status)}
                <span className="text-xs text-gray-500">
                  {new Date(draft.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              {onView && (
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => onView(draft.id)}
                >
                  View
                </Button>
              )}
              {draft.status === 'draft' && onEdit && (
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => onEdit(draft.id)}
                >
                  Edit
                </Button>
              )}
              {draft.status === 'draft' && onSend && (
                <Button
                  variant="primary"
                  size="xs"
                  onClick={() => onSend(draft.id)}
                >
                  Send
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

