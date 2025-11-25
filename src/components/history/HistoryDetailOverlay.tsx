'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { HistoryItem } from './HistoryList'

interface HistoryDetailOverlayProps {
  item: HistoryItem | null
  isOpen: boolean
  onClose: () => void
  isLoading?: boolean
  onResubscribe?: (contactId: number) => void
  isResubscribing?: boolean
  onNext?: () => void
  onPrevious?: () => void
  hasNext?: boolean
  hasPrevious?: boolean
  currentIndex?: number
  totalCount?: number
}

export function HistoryDetailOverlay({ 
  item, 
  isOpen, 
  onClose, 
  isLoading = false,
  onResubscribe, 
  isResubscribing = false,
  onNext,
  onPrevious,
  hasNext = false,
  hasPrevious = false,
  currentIndex,
  totalCount,
}: HistoryDetailOverlayProps) {
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false)

  if (!isOpen || !item) return null

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
      />
      
      {/* Gmail-style Window */}
      <div className="relative bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col transition-all duration-300 w-[600px] h-[600px]">
        {/* Title Bar - Dark Grey like Gmail */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-800 text-white rounded-t-lg flex-shrink-0">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {/* Navigation Controls */}
            {(hasPrevious || hasNext) && (
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button
                  onClick={onPrevious}
                  disabled={!hasPrevious}
                  className="p-1.5 hover:bg-gray-700 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Previous"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={onNext}
                  disabled={!hasNext}
                  className="p-1.5 hover:bg-gray-700 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Next"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
            {/* Counter and Business Name */}
            {currentIndex !== undefined && totalCount !== undefined && (
              <>
                <span className="text-xs text-gray-300 flex-shrink-0 font-normal">
                  {currentIndex + 1} of {totalCount}
                </span>
                <span className="text-sm font-medium text-white flex-shrink-0">
                  {item.contactName || 'Unknown Contact'}
                </span>
              </>
            )}
            {/* Empty space for alignment */}
            <div className="flex-1" />
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-700 rounded transition-colors"
              title="Close"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          {/* Subject - Above Dropdown */}
          {item.type === 'email-sent' && item.subject && (
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 leading-tight">{item.subject}</h2>
            </div>
          )}

          {/* Collapsible Details Dropdown - Gmail Style */}
          <div className="px-6 py-2.5 border-b border-gray-200">
            <button
              onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
              className="flex items-center justify-between w-full text-left py-1 -mx-2 px-2 hover:bg-gray-50 transition-colors rounded"
            >
              <span className="text-sm text-gray-900 font-normal">
                to {item.contactName || 'Unknown'}
              </span>
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${isDetailsExpanded ? 'transform rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {isDetailsExpanded && (
              <div className="mt-2.5 space-y-2 text-sm">
                {/* From */}
                {item.type === 'email-sent' && item.fromEmail && (
                  <div className="text-gray-900">
                    <span className="font-medium text-gray-700">From </span>
                    <span>{item.fromEmail}</span>
                  </div>
                )}
                {item.type === 'sms-sent' && item.fromPhone && (
                  <div className="text-gray-900">
                    <span className="font-medium text-gray-700">From </span>
                    <span>{item.fromPhone}</span>
                  </div>
                )}
                
                {/* To */}
                {item.type === 'email-sent' && item.toEmail && (
                  <div className="text-gray-900">
                    <span className="font-medium text-gray-700">To </span>
                    <span>{item.contactName || 'Unknown'} • {item.toEmail}</span>
                  </div>
                )}
                {item.type === 'sms-sent' && item.toPhone && (
                  <div className="text-gray-900">
                    <span className="font-medium text-gray-700">To </span>
                    <span>{item.contactName || 'Unknown'} • {item.toPhone}</span>
                  </div>
                )}
                
                {/* Date */}
                <div className="text-gray-900">
                  <span className="font-medium text-gray-700">Date </span>
                  <span>{formatDateShort(item.sentAt)}, {formatTime(item.sentAt)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Message Body - Large Clean Area */}
          <div className="flex-1 overflow-hidden flex flex-col bg-white">
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2"></div>
                    <div className="text-sm text-gray-500">Loading message...</div>
                  </div>
                </div>
              ) : item.type === 'email-sent' ? (
                <div 
                  className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: item.message || 'No message content' }}
                />
              ) : (
                <div className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
                  {item.message || 'No message content'}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Toolbar */}
          <div className="border-t border-gray-200 bg-white px-6 py-3">
            <div className="flex items-center justify-center">
              {/* Center: Navigation */}
              <div className="flex items-center gap-2">
                {onPrevious && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onPrevious}
                    disabled={!hasPrevious}
                    className="text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-1.5 text-sm font-normal"
                  >
                    Previous
                  </Button>
                )}
                {onNext && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onNext}
                    disabled={!hasNext}
                    className="text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-1.5 text-sm font-normal"
                  >
                    Next
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

