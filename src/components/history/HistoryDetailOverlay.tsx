'use client'

import React from 'react'
import type { HistoryItem } from './HistoryList'

interface HistoryDetailOverlayProps {
  item: HistoryItem | null
  isOpen: boolean
  onClose: () => void
}

export function HistoryDetailOverlay({ item, isOpen, onClose }: HistoryDetailOverlayProps) {
  if (!isOpen || !item) return null

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'sms-sent':
        return 'SMS Sent'
      case 'email-sent':
        return 'Email Sent'
      case 'email-unsubscribed':
        return 'Email Unsubscribed'
      default:
        return 'History Item'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'sms-sent':
        return 'bg-green-100 text-green-800'
      case 'email-sent':
        return 'bg-indigo-100 text-indigo-800'
      case 'email-unsubscribed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Overlay */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(item.type)}`}>
                {getTypeLabel(item.type)}
              </span>
              <h2 className="text-lg font-semibold text-gray-900">{item.contactName}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-4">
              {/* Date */}
              <div>
                <label className="text-sm font-medium text-gray-500">Sent At</label>
                <p className="mt-1 text-sm text-gray-900">{formatDate(item.sentAt)}</p>
              </div>

              {/* Subject (if email) */}
              {item.subject && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Subject</label>
                  <p className="mt-1 text-sm text-gray-900">{item.subject}</p>
                </div>
              )}

              {/* Message */}
              <div>
                <label className="text-sm font-medium text-gray-500">Message</label>
                <div
                  className="mt-1 text-sm text-gray-900 whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: item.message || 'No message content' }}
                />
              </div>

              {/* Status */}
              {item.status && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <p className="mt-1 text-sm text-gray-900 capitalize">{item.status}</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

