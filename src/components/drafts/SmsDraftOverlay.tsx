'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import type { SmsDraft } from './SmsDraftsList'
import { clientAccountsApi, ClientSms } from '@/api/clientAccounts'
import { smsGenerationApi } from '@/api/smsGeneration'

interface SmsDraftOverlayProps {
  isOpen: boolean
  smsDraft: SmsDraft | null
  onClose: () => void
  onEdit?: (draftId: number, messageText: string) => Promise<void>
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
}

export function SmsDraftOverlay({
  isOpen,
  smsDraft,
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
}: SmsDraftOverlayProps) {
  const [isMinimized, setIsMinimized] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editedMessage, setEditedMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [availablePhones, setAvailablePhones] = useState<ClientSms[]>([])
  const [selectedFromPhone, setSelectedFromPhone] = useState<number | null>(null)
  const [isLoadingPhones, setIsLoadingPhones] = useState(false)
  const [isUpdatingFromPhone, setIsUpdatingFromPhone] = useState(false)
  const [isPhoneDropdownOpen, setIsPhoneDropdownOpen] = useState(false)
  const [errorDialog, setErrorDialog] = useState<{ isOpen: boolean; message: string }>({
    isOpen: false,
    message: '',
  })

  // Load available client phone numbers
  useEffect(() => {
    if (isOpen) {
      loadAvailablePhones()
    }
  }, [isOpen])

  // Initialize edited message and selected phone when draft changes
  useEffect(() => {
    if (smsDraft) {
      setEditedMessage(smsDraft.message || '')
      // Find the selected phone ID based on fromPhone or clientSms
      if (smsDraft.clientSms?.id && availablePhones.length > 0) {
        const matchingPhone = availablePhones.find(p => p.id === smsDraft.clientSms?.id)
        setSelectedFromPhone(matchingPhone?.id || null)
      } else if (smsDraft.clientSms?.id) {
        setSelectedFromPhone(smsDraft.clientSms.id)
      }
    }
  }, [smsDraft, availablePhones])

  const loadAvailablePhones = async () => {
    setIsLoadingPhones(true)
    try {
      const response = await clientAccountsApi.getClientSms()
      if (response.success && response.data) {
        setAvailablePhones(response.data)
      }
    } catch (error) {
      console.error('Error loading available phone numbers:', error)
    } finally {
      setIsLoadingPhones(false)
    }
  }

  const handleFromPhoneChange = async (clientSmsId: number) => {
    if (!smsDraft || selectedFromPhone === clientSmsId) {
      setIsPhoneDropdownOpen(false)
      return
    }

    setIsUpdatingFromPhone(true)
    setIsPhoneDropdownOpen(false)
    try {
      const response = await smsGenerationApi.updateSmsDraft(smsDraft.id, {
        clientSmsId,
      })
      
      if (response.success && response.data) {
        setSelectedFromPhone(clientSmsId)
      } else {
        setErrorDialog({
          isOpen: true,
          message: response.error || 'Failed to update from phone number',
        })
      }
    } catch (error) {
      console.error('Error updating from phone number:', error)
      let errorMessage = 'Failed to update from phone number'
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
      setIsUpdatingFromPhone(false)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isPhoneDropdownOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.phone-dropdown-container')) {
        setIsPhoneDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isPhoneDropdownOpen])

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
    if (!smsDraft || !onEdit) return
    
    setIsSaving(true)
    try {
      await onEdit(smsDraft.id, editedMessage)
      setIsEditMode(false)
    } catch (error) {
      console.error('Error saving SMS draft:', error)
      alert('Failed to save SMS draft: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (smsDraft) {
      setEditedMessage(smsDraft.message || '')
    }
    setIsEditMode(false)
  }

  const CHARACTER_LIMIT = 320
  const editedCharacterCount = editedMessage.length
  const viewCharacterCount = smsDraft?.message?.length ?? smsDraft?.characterCount ?? 0
  const displayCharacterCount = isEditMode ? editedCharacterCount : viewCharacterCount
  const isOverCharacterLimit = displayCharacterCount > CHARACTER_LIMIT

  if (!isOpen || !smsDraft) return null

  return (
    <>
      {/* Backdrop - only show when not minimized */}
      {!isMinimized && (
        <div 
          className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm cursor-pointer"
          onClick={onClose}
        />
      )}
      
      {/* Gmail-style SMS Window */}
      <div className={`z-50 bg-white shadow-2xl border border-gray-200 flex flex-col transition-all duration-300 ${
        isMinimized 
          ? 'fixed bottom-4 right-4 w-80 h-14 pointer-events-auto rounded-lg' 
          : isMaximized 
          ? 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] h-[95vh] rounded-lg' 
          : 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-lg'
      }`}>
        {/* Title Bar - Dark Grey like Gmail */}
        <div className={`flex items-center justify-between bg-gray-800 text-white rounded-t-lg flex-shrink-0 ${isMinimized ? 'px-3 py-1.5' : 'px-4 py-2.5'}`}>
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {/* Navigation Controls - hide when minimized */}
            {!isMinimized && (hasPrevious || hasNext) && (
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
            {/* Draft Counter - show when minimized */}
            {isMinimized && currentIndex !== undefined && totalCount !== undefined && (
              <span className="text-xs text-gray-300 flex-shrink-0 font-normal">
                {currentIndex + 1} of {totalCount}
              </span>
            )}
            {/* Contact Name */}
            <h3 className={`font-medium truncate flex-1 min-w-0 ${isMinimized ? 'text-xs' : 'text-sm'}`}>
              {smsDraft.contactName || smsDraft.contactPhone || 'SMS Message'}
            </h3>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Unselect Checkbox - hide when minimized */}
            {!isMinimized && onToggleSelect && (
              <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-700 rounded px-2 py-1 transition-colors">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => onToggleSelect(smsDraft.id, e.target.checked)}
                  className="w-4 h-4 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="text-xs">Include</span>
              </label>
            )}
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 hover:bg-gray-700 rounded transition-colors"
              title={isMinimized ? "Restore" : "Minimize"}
            >
              {isMinimized ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              )}
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
                    {isLoadingPhones ? (
                      <div className="text-sm text-gray-500">Loading phone numbers...</div>
                    ) : availablePhones.length === 0 ? (
                      <div className="text-sm text-gray-500">No phone numbers available. Add phone numbers on the dashboard.</div>
                    ) : (
                      <>
                        <div className="flex-1 relative phone-dropdown-container">
                          <button
                            type="button"
                            onClick={() => !isUpdatingFromPhone && smsDraft.status !== 'sent' && setIsPhoneDropdownOpen(!isPhoneDropdownOpen)}
                            disabled={isUpdatingFromPhone || smsDraft.status === 'sent'}
                            className="flex-1 text-sm text-gray-900 outline-none bg-transparent border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:text-indigo-600 transition-colors focus:text-indigo-600 text-left flex items-center justify-between w-full"
                          >
                            <span className="truncate">
                              {availablePhones.find(p => p.id === selectedFromPhone)?.phoneNumber || 'Select phone number'}
                            </span>
                            <svg
                              className={`w-4 h-4 text-gray-500 ml-2 flex-shrink-0 transition-transform ${isPhoneDropdownOpen ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          {isPhoneDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                              {availablePhones
                                .filter((phone) => phone.id !== null)
                                .map((phone) => (
                                <button
                                  key={phone.id}
                                  type="button"
                                  onClick={() => phone.id !== null && handleFromPhoneChange(phone.id)}
                                  className={`w-full text-left px-4 py-3 text-sm text-gray-900 hover:bg-indigo-50 transition-colors ${
                                    selectedFromPhone === phone.id ? 'bg-indigo-50 text-indigo-700 font-medium' : ''
                                  } first:rounded-t-lg last:rounded-b-lg`}
                                >
                                  {phone.phoneNumber}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {isUpdatingFromPhone && (
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
                  <div className="flex-1">
                    <input
                      type="tel"
                      value={smsDraft.contactPhone || ''}
                      readOnly
                      className="w-full text-sm text-gray-900 outline-none bg-transparent border-none"
                      placeholder="Phone number"
                    />
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <span className="text-xs text-gray-400">
                      {smsDraft.contactName || 'Contact'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="px-6 py-2 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center gap-2">
                  {smsDraft.status === 'sent' && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      Sent
                    </span>
                  )}
                  {smsDraft.status === 'delivered' && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      Delivered
                    </span>
                  )}
                  {smsDraft.status === 'draft' && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      Draft
                    </span>
                  )}
                  <span
                    className={`text-xs ml-auto ${
                      isOverCharacterLimit ? 'text-red-500 font-semibold' : 'text-gray-500'
                    }`}
                  >
                    {displayCharacterCount} / {CHARACTER_LIMIT} characters
                  </span>
                </div>
              </div>

              {/* SMS Body - Large Clean Area */}
              <div className="flex-1 overflow-hidden flex flex-col">
                {isEditMode ? (
                  <div className="flex-1 px-6 py-5 overflow-y-auto">
                    <textarea
                      value={editedMessage}
                      onChange={(e) => setEditedMessage(e.target.value)}
                      className="w-full min-h-[200px] text-sm text-gray-900 outline-none resize-none border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 p-3 leading-relaxed"
                      placeholder={`Enter your SMS message (max ${CHARACTER_LIMIT} characters)...`}
                      maxLength={CHARACTER_LIMIT}
                      autoFocus
                      rows={8}
                    />
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto px-6 py-5">
                    <div className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed min-h-full">
                      {smsDraft.message || ''}
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
                          disabled={isSaving || !editedMessage.trim() || editedCharacterCount > CHARACTER_LIMIT}
                          isLoading={isSaving}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                          onClick={() => onSend && onSend(smsDraft.id)}
                          disabled={smsDraft.status !== 'draft'}
                          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2"
                        >
                          Send
                        </Button>
                        {smsDraft.status === 'draft' && onEdit && (
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
    </>
  )
}

