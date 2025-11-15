'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import type { EmailDraft as ComponentEmailDraft } from './EmailDraftsList'
import { ingestionApi } from '@/api/ingestion'
import { clientAccountsApi, ClientEmail } from '@/api/clientAccounts'
import { emailGenerationApi } from '@/api/emailGeneration'

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
  onEdit?: (draftId: number, subject: string, body: string) => Promise<void>
  onSend?: (draftId: number) => void
  onNext?: () => void
  onPrevious?: () => void
  hasNext?: boolean
  hasPrevious?: boolean
  currentIndex?: number
  totalCount?: number
  selectedCount?: number // Actual count of selected drafts (for Send All button)
  isSelected?: boolean
  onToggleSelect?: (draftId: number, selected: boolean) => void
  onSendAll?: () => void
  subscriptionDataLoaded?: boolean
  onResubscribe?: (draftId: number) => void
  isResubscribing?: boolean
}

export function EmailDraftOverlay({
  isOpen,
  emailDraft,
  spamCheckResult,
  onClose,
  onEdit,
  onSend,
  onNext,
  onPrevious,
  hasNext = false,
  hasPrevious = false,
  currentIndex,
  totalCount,
  selectedCount,
  isSelected = false,
  onToggleSelect,
  onSendAll,
  subscriptionDataLoaded = false,
  onResubscribe,
  isResubscribing = false,
}: EmailDraftOverlayProps) {
  const [isMinimized, setIsMinimized] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editedSubject, setEditedSubject] = useState('')
  const [editedBody, setEditedBody] = useState('')
  const [editedEmail, setEditedEmail] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingEmail, setIsSavingEmail] = useState(false)
  const [availableEmails, setAvailableEmails] = useState<ClientEmail[]>([])
  const [selectedFromEmail, setSelectedFromEmail] = useState<number | null>(null)
  const [isLoadingEmails, setIsLoadingEmails] = useState(false)
  const [isUpdatingFromEmail, setIsUpdatingFromEmail] = useState(false)
  const [isEmailDropdownOpen, setIsEmailDropdownOpen] = useState(false)
  const [errorDialog, setErrorDialog] = useState<{ isOpen: boolean; message: string }>({
    isOpen: false,
    message: '',
  })

  // Load available client emails
  useEffect(() => {
    if (isOpen) {
      loadAvailableEmails()
    }
  }, [isOpen])

  // Initialize edited content when draft changes or edit mode is enabled
  useEffect(() => {
    if (emailDraft) {
      setEditedSubject(emailDraft.subject || '')
      setEditedBody(emailDraft.body || '')
      setEditedEmail(emailDraft.contactEmail || '')
      // Find the selected email ID based on fromEmail
      if (emailDraft.fromEmail && availableEmails.length > 0) {
        const matchingEmail = availableEmails.find(e => e.emailAddress === emailDraft.fromEmail)
        setSelectedFromEmail(matchingEmail?.id || null)
      }
    }
  }, [emailDraft, availableEmails])

  const loadAvailableEmails = async () => {
    setIsLoadingEmails(true)
    try {
      const response = await clientAccountsApi.getClientEmails()
      if (response.success && response.data) {
        setAvailableEmails(response.data)
      }
    } catch (error) {
      console.error('Error loading available emails:', error)
    } finally {
      setIsLoadingEmails(false)
    }
  }

  const handleFromEmailChange = async (clientEmailId: number) => {
    if (!emailDraft || selectedFromEmail === clientEmailId) {
      setIsEmailDropdownOpen(false)
      return
    }

    setIsUpdatingFromEmail(true)
    setIsEmailDropdownOpen(false)
    try {
      const response = await emailGenerationApi.updateEmailDraft(emailDraft.id, {
        clientEmailId,
      })
      
      if (response.success && response.data) {
        setSelectedFromEmail(clientEmailId)
      } else {
        setErrorDialog({
          isOpen: true,
          message: response.error || 'Failed to update from email',
        })
      }
    } catch (error) {
      console.error('Error updating from email:', error)
      let errorMessage = 'Failed to update from email'
      if (error instanceof Error) {
        errorMessage = error.message
        // Clean up common error patterns
        if (errorMessage.includes('BadRequestException')) {
          errorMessage = errorMessage.replace(/BadRequestException:\s*/g, '')
          errorMessage = errorMessage.split('\n')[0]
        }
      }
      setErrorDialog({
        isOpen: true,
        message: errorMessage,
      })
    } finally {
      setIsUpdatingFromEmail(false)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isEmailDropdownOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.email-dropdown-container')) {
        setIsEmailDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isEmailDropdownOpen])

  // Reset edit mode when overlay closes
  useEffect(() => {
    if (!isOpen) {
      setIsEditMode(false)
      setIsSaving(false)
    }
  }, [isOpen])

  // Prevent background scrolling when overlay is open
  useEffect(() => {
    if (isOpen && !isMinimized) {
      // Save current scroll position
      const scrollY = window.scrollY
      // Disable scrolling on body
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'
      
      return () => {
        // Re-enable scrolling when overlay closes
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        document.body.style.overflow = ''
        window.scrollTo(0, scrollY)
      }
    }
  }, [isOpen, isMinimized])

  const handleSave = async () => {
    if (!emailDraft || !onEdit) return
    
    setIsSaving(true)
    try {
      await onEdit(emailDraft.id, editedSubject, editedBody)
      setIsEditMode(false)
    } catch (error) {
      console.error('Error saving email draft:', error)
      alert('Failed to save email draft: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (emailDraft) {
      setEditedSubject(emailDraft.subject || '')
      setEditedBody(emailDraft.body || '')
      setEditedEmail(emailDraft.contactEmail || '')
    }
    setIsEditMode(false)
  }

  const handleSaveEmail = async () => {
    if (!emailDraft || !emailDraft.contactId) return
    
    const trimmedEmail = editedEmail.trim()
    if (!trimmedEmail) {
      alert('Please enter a valid email address')
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      alert('Please enter a valid email address')
      return
    }

    // If email hasn't changed, no need to update
    if (trimmedEmail === emailDraft.contactEmail) {
      return
    }

    setIsSavingEmail(true)
    try {
      const response = await ingestionApi.updateContact(emailDraft.contactId, {
        email: trimmedEmail
      })
      
      if (response.success && response.data?.contact) {
        // Update the local draft state - this will be reflected when parent component refreshes
        // For now, we'll just show a success message
        alert('Email address updated successfully')
      } else {
        alert('Failed to update email address: ' + (response.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error updating contact email:', error)
      alert('Failed to update email address: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsSavingEmail(false)
    }
  }

  if (!isOpen || !emailDraft) return null

  const unsubscribedAtDisplay =
    emailDraft.unsubscribedAt ? new Date(emailDraft.unsubscribedAt).toLocaleString() : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
      />
      
      {/* Gmail-style Email Window */}
      <div className={`relative bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col transition-all duration-300 ${
        isMinimized 
          ? 'w-96 h-16' 
          : isMaximized 
          ? 'w-[95vw] h-[95vh]' 
          : 'w-[600px] h-[600px]'
      }`}>
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
            {/* Draft Counter */}
            {currentIndex !== undefined && totalCount !== undefined && (
              <span className="text-xs text-gray-300 flex-shrink-0 font-normal">
                {currentIndex + 1} of {totalCount}
              </span>
            )}
            {/* Contact Name */}
            <h3 className="text-sm font-medium truncate flex-1 min-w-0">
              {emailDraft.contactName || emailDraft.contactEmail || 'Unknown Contact'}
            </h3>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Unselect Checkbox */}
            {onToggleSelect && (
              <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-700 rounded px-2 py-1 transition-colors">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => onToggleSelect(emailDraft.id, e.target.checked)}
                  className="w-4 h-4 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="text-xs">Include</span>
              </label>
            )}
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 hover:bg-gray-700 rounded transition-colors"
              title="Minimize"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
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

        {!isMinimized && (
          <>
            {/* Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden bg-white">
              {/* From Field - Clean Gmail Style with Dropdown */}
              <div className="px-6 py-3 border-b border-gray-200">
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 font-normal mr-3 min-w-[60px]">From</span>
                  <div className="flex-1 flex items-center gap-2">
                    {isLoadingEmails ? (
                      <div className="text-sm text-gray-500">Loading emails...</div>
                    ) : availableEmails.length === 0 ? (
                      <div className="text-sm text-gray-500">No emails available. Add emails on the dashboard.</div>
                    ) : (
                      <>
                        <div className="flex-1 relative email-dropdown-container">
                          <button
                            type="button"
                            onClick={() => !isUpdatingFromEmail && emailDraft.status !== 'sent' && setIsEmailDropdownOpen(!isEmailDropdownOpen)}
                            disabled={isUpdatingFromEmail || emailDraft.status === 'sent'}
                            className="flex-1 text-sm text-gray-900 outline-none bg-transparent border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:text-indigo-600 transition-colors focus:text-indigo-600 text-left flex items-center justify-between w-full"
                          >
                            <span className="truncate">
                              {availableEmails.find(e => e.id === selectedFromEmail)?.emailAddress || 'Select email'}
                            </span>
                            <svg
                              className={`w-4 h-4 text-gray-500 ml-2 flex-shrink-0 transition-transform ${isEmailDropdownOpen ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          {isEmailDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                              {availableEmails.map((email) => (
                                <button
                                  key={email.id}
                                  type="button"
                                  onClick={() => handleFromEmailChange(email.id)}
                                  className={`w-full text-left px-4 py-3 text-sm text-gray-900 hover:bg-indigo-50 transition-colors ${
                                    selectedFromEmail === email.id ? 'bg-indigo-50 text-indigo-700 font-medium' : ''
                                  } first:rounded-t-lg last:rounded-b-lg`}
                                >
                                  {email.emailAddress}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {isUpdatingFromEmail && (
                          <span className="text-xs text-gray-500 whitespace-nowrap">Updating...</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* To Field - Clean Gmail Style */}
              <div className="px-6 py-3 border-b border-gray-200">
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 font-normal mr-3 min-w-[60px]">To</span>
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="email"
                      value={editedEmail}
                      onChange={(e) => setEditedEmail(e.target.value)}
                      onBlur={handleSaveEmail}
                      disabled={isSavingEmail}
                      className="flex-1 text-sm text-gray-900 outline-none bg-transparent border-none focus:ring-0 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="Recipients"
                    />
                    {isSavingEmail && (
                      <span className="text-xs text-gray-500 whitespace-nowrap">Saving...</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Subscription Status */}
              {subscriptionDataLoaded && (
                <div
                  className={`px-6 py-3 border-b ${
                    emailDraft.isUnsubscribed
                      ? 'bg-red-50 border-red-100 text-red-700'
                      : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                  }`}
                >
                  <p className="text-sm font-medium">
                    {emailDraft.isUnsubscribed ? 'This contact is unsubscribed from emails.' : 'This contact is currently subscribed to emails.'}
                  </p>
                  {emailDraft.isUnsubscribed && (
                    <div className="mt-1 space-y-1 text-xs text-current">
                      {unsubscribedAtDisplay && <p>Unsubscribed on {unsubscribedAtDisplay}</p>}
                      {emailDraft.unsubscribeReason && <p>Reason: {emailDraft.unsubscribeReason}</p>}
                      {onResubscribe && (
                        <button
                          type="button"
                          onClick={() => onResubscribe(emailDraft.id)}
                          disabled={isResubscribing}
                          className="mt-2 inline-flex items-center justify-center rounded border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isResubscribing ? 'Resubscribing…' : 'Resubscribe Contact'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Subject Field - Clean Style */}
              <div className="px-6 py-3 border-b border-gray-200">
                {isEditMode ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900 flex-shrink-0">Subject:</span>
                    <input
                      type="text"
                      value={editedSubject}
                      onChange={(e) => setEditedSubject(e.target.value)}
                      className="flex-1 text-sm text-gray-900 outline-none border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 p-2"
                      placeholder="Subject"
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900 flex-shrink-0">Subject:</span>
                    <input
                      type="text"
                      value={emailDraft.subject || ''}
                      readOnly
                      className="flex-1 text-sm text-gray-900 outline-none bg-transparent border-none"
                      placeholder="Subject"
                    />
                  </div>
                )}
              </div>

              {/* Email Body - Large Clean Area */}
              <div className="flex-1 overflow-hidden flex flex-col">
                {isEditMode ? (
                  <div className="flex-1 px-6 py-5 overflow-y-auto">
                    <textarea
                      value={editedBody}
                      onChange={(e) => setEditedBody(e.target.value)}
                      className="w-full min-h-[300px] text-sm text-gray-900 outline-none resize-none border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 p-3 leading-relaxed"
                      placeholder="Enter your email message..."
                      autoFocus={false}
                      rows={12}
                    />
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto px-6 py-5">
                    <div className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed min-h-full">
                      {emailDraft.body || ''}
                    </div>
                  </div>
                )}
              </div>

              {/* Simplified Bottom Toolbar */}
              <div className="border-t border-gray-200 bg-white px-6 py-3">
                <div className="grid grid-cols-3 items-center">
                  {/* Left: Action Buttons */}
                  <div className="flex items-center gap-2 justify-start">
                    {isEditMode ? (
                      <>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleSave}
                          disabled={isSaving || !editedSubject.trim() || !editedBody.trim()}
                          isLoading={isSaving}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                        >
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancel}
                          disabled={isSaving}
                          className="text-gray-700 border-gray-300 hover:bg-gray-50"
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => onSend && onSend(emailDraft.id)}
                          disabled={emailDraft.status !== 'draft'}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                        >
                          Send
                        </Button>
                        {emailDraft.status === 'draft' && onEdit && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditMode(true)}
                            className="text-gray-700 border-gray-300 hover:bg-gray-50"
                          >
                            Edit
                          </Button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Center: Navigation - Always Centered */}
                  <div className="flex items-center justify-center gap-2">
                    {!isEditMode && (
                      <>
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
                      </>
                    )}
                  </div>

                  {/* Right: Send All (if on last item) */}
                  <div className="flex items-center gap-2 justify-end">
                    {!isEditMode && onSendAll && !hasNext && currentIndex !== undefined && totalCount !== undefined && totalCount > 0 && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={onSendAll}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2"
                      >
                        Send All ({selectedCount !== undefined ? selectedCount : totalCount})
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Error Dialog */}
      <ConfirmDialog
        isOpen={errorDialog.isOpen}
        title="Error"
        message={errorDialog.message}
        confirmText="OK"
        cancelText=""
        variant="danger"
        onConfirm={() => setErrorDialog({ isOpen: false, message: '' })}
        onCancel={() => setErrorDialog({ isOpen: false, message: '' })}
      />
    </div>
  )
}

