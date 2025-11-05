'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { EmailDraft as ComponentEmailDraft } from './EmailDraftsList'

interface EmailDraftOverlayProps {
  isOpen: boolean
  emailDraft: ComponentEmailDraft | null
  spamCheckResult?: {
    score: number
    keywords: string[]
    suggestions: string[]
    blocked: boolean
  }
  onClose: () => void
  onEdit?: (draftId: number) => void
  onSend?: (draftId: number) => void
  onNext?: () => void
  hasNext?: boolean
}

export function EmailDraftOverlay({
  isOpen,
  emailDraft,
  spamCheckResult,
  onClose,
  onEdit,
  onSend,
  onNext,
  hasNext = false,
}: EmailDraftOverlayProps) {
  const [isMinimized, setIsMinimized] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)

  if (!isOpen || !emailDraft) return null

  const handleAttachFile = () => {
    // TODO: Implement file attachment functionality
    alert('Attach file functionality coming soon')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/30 cursor-pointer"
        onClick={onClose}
      />
      
      {/* Gmail-style Email Window */}
      <div className={`relative bg-white rounded-lg shadow-2xl border border-gray-300 flex flex-col transition-all duration-300 ${
        isMinimized 
          ? 'w-96 h-16' 
          : isMaximized 
          ? 'w-[95vw] h-[95vh]' 
          : 'w-[600px] h-[600px]'
      }`}>
        {/* Title Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-300 rounded-t-lg flex-shrink-0">
          <h3 className="text-sm font-medium text-gray-700 truncate flex-1">
            {emailDraft.subject || 'Draft'}
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 hover:bg-gray-200 rounded transition-colors"
              title="Minimize"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
              </svg>
            </button>
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 hover:bg-gray-200 rounded transition-colors"
              title="Maximize"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-200 rounded transition-colors"
              title="Close"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* To Field */}
              <div className="px-4 py-2 border-b border-gray-200">
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 mr-2 min-w-[40px]">To</span>
                  <div className="flex-1">
                    <span className="text-sm text-gray-900 underline">
                      {emailDraft.contactEmail || 'No email'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Subject Field */}
              <div className="px-4 py-2 border-b border-gray-200">
                <input
                  type="text"
                  value={emailDraft.subject || ''}
                  readOnly
                  className="w-full text-sm text-gray-900 outline-none bg-transparent"
                  placeholder="Subject"
                />
              </div>

              {/* Email Body */}
              <div className="flex-1 overflow-y-auto px-4 py-3">
                <div className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed min-h-full">
                  {emailDraft.body || 'No content'}
                </div>
              </div>

              {/* Formatting Toolbar (simplified) */}
              <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex items-center gap-2 flex-wrap">
                <button
                  className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                  title="Bold"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6" />
                  </svg>
                </button>
                <button
                  className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                  title="Italic"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </button>
                <button
                  className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                  title="Underline"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.657 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.879 16.121A3 3 0 1012.015 11.985" />
                  </svg>
                </button>
                <div className="w-px h-6 bg-gray-300"></div>
                <button
                  className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                  title="Text Color"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                </button>
                <button
                  className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                  title="Align Left"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18" />
                  </svg>
                </button>
                <button
                  className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                  title="Bullet List"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 6h13M8 12h13m-13 6h13M3 6h.01M3 12h.01M3 18h.01" />
                  </svg>
                </button>
              </div>

              {/* Bottom Action Bar */}
              <div className="px-4 py-3 border-t border-gray-200 bg-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    onClick={() => onSend && onSend(emailDraft.id)}
                    disabled={emailDraft.status !== 'draft'}
                  >
                    Send
                  </Button>
                  {emailDraft.status === 'draft' && onEdit && (
                    <Button
                      variant="outline"
                      onClick={() => onEdit(emailDraft.id)}
                    >
                      Edit
                    </Button>
                  )}
                  {onNext && hasNext && (
                    <Button
                      variant="outline"
                      onClick={onNext}
                    >
                      Next
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleAttachFile}
                    className="p-2 hover:bg-gray-100 rounded transition-colors"
                    title="Attach file"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </button>
                  <button
                    className="p-2 hover:bg-gray-100 rounded transition-colors"
                    title="Insert link"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </button>
                  <button
                    className="p-2 hover:bg-gray-100 rounded transition-colors"
                    title="Emoji"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  <button
                    className="p-2 hover:bg-gray-100 rounded transition-colors"
                    title="More options"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
