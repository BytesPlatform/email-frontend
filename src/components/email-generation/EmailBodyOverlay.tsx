'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { copyToClipboard } from '@/lib/utils'

interface EmailBodyOverlayProps {
  overlay: {
    isOpen: boolean
    subject: string
    body: string
    isEditMode?: boolean
    smsDraftId?: number
    emailDraftId?: number
    spamCheckResult?: {
      score: number
      keywords: string[]
      suggestions: string[]
      blocked: boolean
    }
    optimizationSuggestions?: {
      suggestions: string[]
      optimizedContent?: string
    }
  }
  onClose: () => void
  onSave: (newBody: string) => Promise<void>
  onToggleEdit: () => void
  onCancelEdit: () => void
  onGetOptimizationSuggestions?: () => Promise<void>
  onAcceptOptimizedContent?: () => Promise<void>
  isLoadingOptimization?: boolean
}

export const EmailBodyOverlay: React.FC<EmailBodyOverlayProps> = ({
  overlay,
  onClose,
  onSave,
  onToggleEdit,
  onCancelEdit,
  onGetOptimizationSuggestions,
  onAcceptOptimizedContent,
  isLoadingOptimization = false,
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
        className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-pointer"
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
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
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

            {/* Spam Check Result - only for Email */}
            {!isSMS && overlay.spamCheckResult && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <div className={`px-4 py-3 flex items-center justify-between ${
                  overlay.spamCheckResult.blocked 
                    ? 'bg-red-50 border-b border-red-200' 
                    : overlay.spamCheckResult.score > 50 
                    ? 'bg-yellow-50 border-b border-yellow-200'
                    : 'bg-green-50 border-b border-green-200'
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${ 
                      overlay.spamCheckResult.blocked 
                        ? 'bg-red-100' 
                        : overlay.spamCheckResult.score > 50 
                        ? 'bg-yellow-100'
                        : 'bg-green-100'
                    }`}>
                      <svg className={`w-5 h-5 ${
                        overlay.spamCheckResult.blocked 
                          ? 'text-red-600' 
                          : overlay.spamCheckResult.score > 50 
                          ? 'text-yellow-600'
                          : 'text-green-600'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {overlay.spamCheckResult.blocked ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        )}
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">
                        Spam Score
                      </h3>
                      <p className={`text-xs ${
                        overlay.spamCheckResult.blocked 
                          ? 'text-red-700' 
                          : overlay.spamCheckResult.score > 50 
                          ? 'text-yellow-700'
                          : 'text-green-700'
                      }`}>
                        {overlay.spamCheckResult.blocked 
                          ? 'Email Blocked - High Spam Risk' 
                          : overlay.spamCheckResult.score > 50 
                          ? 'Warning - Medium Spam Risk'
                          : 'Safe - Low Spam Risk'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${
                      overlay.spamCheckResult.blocked 
                        ? 'text-red-600' 
                        : overlay.spamCheckResult.score > 50 
                        ? 'text-yellow-600'
                        : 'text-green-600'
                    }`}>
                      {overlay.spamCheckResult.score.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-500">/ 100</div>
                  </div>
                </div>
                
                {/* Keywords */}
                {overlay.spamCheckResult.keywords && overlay.spamCheckResult.keywords.length > 0 && (
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <h4 className="text-xs font-semibold text-gray-700 mb-2">Spam Keywords Detected:</h4>
                    <div className="flex flex-wrap gap-2">
                      {overlay.spamCheckResult.keywords.map((keyword, idx) => (
                        <span 
                          key={idx}
                          className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-md font-medium"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Suggestions */}
                {overlay.spamCheckResult.suggestions && overlay.spamCheckResult.suggestions.length > 0 && (
                  <div className="px-4 py-3 bg-blue-50">
                    <h4 className="text-xs font-semibold text-gray-700 mb-2">Suggestions to Improve:</h4>
                    <ul className="space-y-1">
                      {overlay.spamCheckResult.suggestions.map((suggestion, idx) => (
                        <li key={idx} className="text-sm text-gray-700 flex items-start">
                          <svg className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Get AI-Optimized Version Button - Show for all emails (not just blocked) */}
                {!overlay.optimizationSuggestions && onGetOptimizationSuggestions && overlay.subject && (
                  <div className="px-4 py-3 bg-indigo-50 border-t border-indigo-200">
                    <Button
                      onClick={onGetOptimizationSuggestions}
                      disabled={isLoadingOptimization}
                      isLoading={isLoadingOptimization}
                      variant="primary"
                      className="w-full"
                    >
                      {isLoadingOptimization ? 'Getting AI-Optimized Version...' : '🤖 Get AI-Optimized Version'}
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            {/* AI-Optimized Content Section */}
            {!isSMS && overlay.optimizationSuggestions && (
              <div className="border-2 border-indigo-300 rounded-lg overflow-hidden bg-indigo-50">
                <div className="px-4 py-3 bg-indigo-100 border-b border-indigo-200">
                  <h3 className="text-sm font-semibold text-indigo-900 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    AI-Optimized Content
                  </h3>
                </div>
                
                {/* Optimized Content */}
                {overlay.optimizationSuggestions.optimizedContent && (
                  <div className="px-4 py-4 space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 mb-2 block">Optimized Email Body:</label>
                      <textarea
                        readOnly
                        value={overlay.optimizationSuggestions.optimizedContent}
                        className="w-full h-48 p-4 border border-gray-300 rounded-lg text-base text-gray-800 bg-white resize-none"
                      />
                    </div>
                    
                    {/* Additional Suggestions */}
                    {overlay.optimizationSuggestions.suggestions && overlay.optimizationSuggestions.suggestions.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-700 mb-2">Additional Optimization Suggestions:</h4>
                        <ul className="space-y-1 bg-white rounded-lg p-3 border border-gray-200">
                          {overlay.optimizationSuggestions.suggestions.map((suggestion, idx) => (
                            <li key={idx} className="text-sm text-gray-700 flex items-start">
                              <svg className="w-4 h-4 text-indigo-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>{suggestion}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Action Buttons */}
                    {onAcceptOptimizedContent && (
                      <div className="flex items-center space-x-3 pt-2">
                        <Button
                          onClick={onAcceptOptimizedContent}
                          variant="success"
                          className="flex-1"
                        >
                          ✅ Use Optimized Version
                        </Button>
                        <Button
                          onClick={onClose}
                          variant="outline"
                          className="flex-1"
                        >
                          Keep Original
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                
                {/* If only suggestions without optimized content */}
                {!overlay.optimizationSuggestions.optimizedContent && overlay.optimizationSuggestions.suggestions && overlay.optimizationSuggestions.suggestions.length > 0 && (
                  <div className="px-4 py-4">
                    <h4 className="text-xs font-semibold text-gray-700 mb-2">Optimization Suggestions:</h4>
                    <ul className="space-y-1 bg-white rounded-lg p-3 border border-gray-200">
                      {overlay.optimizationSuggestions.suggestions.map((suggestion, idx) => (
                        <li key={idx} className="text-sm text-gray-700 flex items-start">
                          <svg className="w-4 h-4 text-indigo-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
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
