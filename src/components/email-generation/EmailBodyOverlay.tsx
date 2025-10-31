'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { copyToClipboard } from './utils/emailGenerationUtils'

interface EmailBodyOverlayProps {
  overlay: {
    isOpen: boolean
    subject: string
    body: string
    isEditMode?: boolean
    smsDraftId?: number
  }
  onClose: () => void
  onSave: (newBody: string) => Promise<void>
  onToggleEdit: () => void
  onCancelEdit: () => void
}

export const EmailBodyOverlay: React.FC<EmailBodyOverlayProps> = ({
  overlay,
  onClose,
  onSave,
  onToggleEdit,
  onCancelEdit,
}) => {
  const isSMS = !!overlay.smsDraftId
  const isEditMode = overlay.isEditMode || false
  const [editText, setEditText] = useState(overlay.body)
  const [isSaving, setIsSaving] = useState(false)
  const characterCount = editText.length
  const maxChars = 160

  // Reset edit text when body changes or entering edit mode
  useEffect(() => {
    setEditText(overlay.body)
  }, [overlay.body, isEditMode])

  const handleSave = async () => {
    if (editText.trim().length === 0) {
      alert('SMS message cannot be empty')
      return
    }
    if (editText.trim().length > maxChars) {
      alert(`SMS must be ${maxChars} characters or less`)
      return
    }
    setIsSaving(true)
    try {
      await onSave(editText.trim())
    } finally {
      setIsSaving(false)
    }
  }

  if (!overlay.isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Overlay Content */}
      <div className="relative w-full max-w-3xl h-[85vh] bg-white rounded-2xl shadow-2xl border border-gray-200 transform transition-transform overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 rounded-t-2xl flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {isSMS ? (isEditMode ? 'Edit SMS' : 'SMS Preview') : 'Email Preview'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {isSMS ? 'Short message service' : 'Full email body content'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Subject - only for Email */}
            {!isSMS && (
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Subject:</label>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-base font-medium text-gray-900">{overlay.subject}</p>
                </div>
              </div>
            )}

            {/* Body */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-gray-700">
                  {isSMS ? 'SMS Message:' : 'Email Body:'}
                </label>
                {!isEditMode && (
                  <Button
                    onClick={() => copyToClipboard(isEditMode ? editText : overlay.body)}
                    variant="outline"
                    size="sm"
                  >
                    Copy {isSMS ? 'Message' : 'Body'}
                  </Button>
                )}
              </div>
              
              {isEditMode && isSMS ? (
                <div>
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full h-32 p-4 border border-gray-300 rounded-lg text-base text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter your SMS message..."
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <span className={`text-sm ${characterCount > maxChars ? 'text-red-600' : characterCount > 0 ? 'text-gray-600' : 'text-gray-400'}`}>
                      {characterCount} / {maxChars} characters
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <div className="text-base text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {overlay.body}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 rounded-b-2xl flex-shrink-0 space-x-3 bg-white">
          <div>
            {isSMS && !isEditMode && (
              <Button
                onClick={onToggleEdit}
                variant="outline"
              >
                Edit SMS
              </Button>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {!isEditMode && (
              <Button
                onClick={() => copyToClipboard(isEditMode ? editText : overlay.body)}
                variant="outline"
              >
                Copy {isSMS ? 'Message' : 'Body'}
              </Button>
            )}
            {isEditMode && (
              <>
                <Button
                  onClick={handleSave}
                  disabled={isSaving || characterCount === 0 || characterCount > maxChars}
                  isLoading={isSaving}
                  variant="success"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  onClick={onCancelEdit}
                  disabled={isSaving}
                  variant="outline"
                >
                  Cancel
                </Button>
              </>
            )}
            {!isEditMode && (
              <Button
                onClick={onClose}
                variant="primary"
              >
                Close
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
