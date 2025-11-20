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
  selectedDraftIds?: number[] // Array of selected draft IDs for bulk operations
  isSelected?: boolean
  onToggleSelect?: (draftId: number, selected: boolean) => void
  onSendAll?: () => void
  onScheduleAll?: (draftIds: number[], scheduledAt: string, clientEmailIds?: number[]) => Promise<void>
  subscriptionDataLoaded?: boolean
  onResubscribe?: (draftId: number) => void
  isResubscribing?: boolean
  onContactEmailChange?: (contactId: number, email: string) => void
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
  selectedDraftIds,
  isSelected = false,
  onToggleSelect,
  onSendAll,
  onScheduleAll,
  subscriptionDataLoaded = false,
  onResubscribe,
  isResubscribing = false,
  onContactEmailChange,
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
  const [subjectLines, setSubjectLines] = useState<string[]>([])
  const [selectedSubjectIndex, setSelectedSubjectIndex] = useState(0)
  const [isLoadingDraft, setIsLoadingDraft] = useState(false)
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false)
  const [errorDialog, setErrorDialog] = useState<{ isOpen: boolean; message: string }>({
    isOpen: false,
    message: '',
  })
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [isScheduling, setIsScheduling] = useState(false)
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduledDate, setScheduledDate] = useState<string | null>(null)
  const [isRemovingFromQueue, setIsRemovingFromQueue] = useState(false)
  const [emailUpdateDialog, setEmailUpdateDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    variant: 'info' | 'warning' | 'danger'
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info',
  })
  const [scheduleDialog, setScheduleDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    variant: 'info' | 'warning' | 'danger'
    onConfirm?: () => void
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info',
  })
  const [sendConfirmDialog, setSendConfirmDialog] = useState<{
    isOpen: boolean
    count: number
    isBulk: boolean
  }>({
    isOpen: false,
    count: 0,
    isBulk: false,
  })
  const [availableMailboxes, setAvailableMailboxes] = useState<ClientEmail[]>([])
  const [selectedMailboxIds, setSelectedMailboxIds] = useState<number[]>([])
  const [isLoadingMailboxes, setIsLoadingMailboxes] = useState(false)

  // Load available client emails and full draft data
  useEffect(() => {
    if (isOpen) {
      loadAvailableEmails()
      if (emailDraft) {
        loadFullDraft()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, emailDraft?.id])

  // Load mailboxes when schedule modal opens and reset selections
  useEffect(() => {
    if (isScheduleModalOpen) {
      loadMailboxes()
      // Reset mailbox selections when modal opens - user must manually select
      setSelectedMailboxIds([])
    }
  }, [isScheduleModalOpen])

  // Load full draft to get subjectLines array
  const loadFullDraft = async () => {
    if (!emailDraft) return
    setIsLoadingDraft(true)
    try {
      const response = await emailGenerationApi.getEmailDraft(emailDraft.id)
      if (response.success && response.data) {
        const draft = response.data
        // Set subject lines array, fallback to single subject if array not available
        if (draft.subjectLines && draft.subjectLines.length > 0) {
          setSubjectLines(draft.subjectLines)
          setSelectedSubjectIndex(0) // Default to first subject line
          setEditedSubject(draft.subjectLines[0])
        } else if (draft.subjectLine) {
          // Fallback for backward compatibility
          setSubjectLines([draft.subjectLine])
          setSelectedSubjectIndex(0)
          setEditedSubject(draft.subjectLine)
        } else {
          setSubjectLines([emailDraft.subject || ''])
          setSelectedSubjectIndex(0)
          setEditedSubject(emailDraft.subject || '')
        }
      }
    } catch (error) {
      console.error('Error loading full draft:', error)
      // Fallback to component draft data
      if (emailDraft) {
        setSubjectLines([emailDraft.subject || ''])
        setSelectedSubjectIndex(0)
        setEditedSubject(emailDraft.subject || '')
      }
    } finally {
      setIsLoadingDraft(false)
    }
  }

  // Initialize edited content when draft changes or edit mode is enabled
  useEffect(() => {
    if (emailDraft) {
      // Only set if we haven't loaded full draft yet
      if (subjectLines.length === 0) {
        setEditedSubject(emailDraft.subject || '')
      }
      setEditedBody(emailDraft.body || '')
      setEditedEmail(emailDraft.contactEmail || '')
      // Find the selected email ID based on fromEmail
      if (emailDraft.fromEmail && availableEmails.length > 0) {
        const matchingEmail = availableEmails.find(e => e.emailAddress === emailDraft.fromEmail)
        setSelectedFromEmail(matchingEmail?.id || null)
      }
    }
  }, [emailDraft, availableEmails, subjectLines.length])

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

  const loadMailboxes = async () => {
    setIsLoadingMailboxes(true)
    try {
      const response = await clientAccountsApi.getClientEmails()
      if (response.success && response.data) {
        // Filter to active mailboxes only
        const activeMailboxes = response.data.filter(m => m.status === 'active')
        setAvailableMailboxes(activeMailboxes)
      }
    } catch (error) {
      console.error('Error loading mailboxes:', error)
      setAvailableMailboxes([])
    } finally {
      setIsLoadingMailboxes(false)
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
    if (!isEmailDropdownOpen && !isSubjectDropdownOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.email-dropdown-container') && !target.closest('.subject-dropdown-container')) {
        setIsEmailDropdownOpen(false)
        setIsSubjectDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isEmailDropdownOpen, isSubjectDropdownOpen])

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
    if (!emailDraft) return
    
    setIsSaving(true)
    try {
      // Update the subjectLines array at the selected index with the edited subject
      const updatedSubjectLines = [...subjectLines]
      if (updatedSubjectLines.length > selectedSubjectIndex) {
        updatedSubjectLines[selectedSubjectIndex] = editedSubject
      } else {
        // If index is out of bounds, add the subject
        updatedSubjectLines.push(editedSubject)
      }
      
      // Update via API with subjectLines array
      const response = await emailGenerationApi.updateEmailDraft(emailDraft.id, {
        subjectLines: updatedSubjectLines,
        bodyText: editedBody,
      })
      
      if (response.success && response.data) {
        // Update local state
        setSubjectLines(updatedSubjectLines)
        if (onEdit) {
          // Also call onEdit for backward compatibility
          await onEdit(emailDraft.id, editedSubject, editedBody)
        }
        setIsEditMode(false)
      } else {
        throw new Error(response.error || 'Failed to update email draft')
      }
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
      setEmailUpdateDialog({
        isOpen: true,
        title: 'Invalid Email',
        message: 'Please enter a valid email address',
        variant: 'warning',
      })
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      setEmailUpdateDialog({
        isOpen: true,
        title: 'Invalid Email Format',
        message: 'Please enter a valid email address',
        variant: 'warning',
      })
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
        const updatedEmail = response.data.contact.email ?? trimmedEmail
        setEditedEmail(updatedEmail)
        onContactEmailChange?.(emailDraft.contactId, updatedEmail)
        setEmailUpdateDialog({
          isOpen: true,
          title: 'Success',
          message: 'Email address updated successfully',
          variant: 'info',
        })
      } else {
        setEmailUpdateDialog({
          isOpen: true,
          title: 'Update Failed',
          message: 'Failed to update email address: ' + (response.error || 'Unknown error'),
          variant: 'warning',
        })
      }
    } catch (error) {
      console.error('Error updating contact email:', error)
      setEmailUpdateDialog({
        isOpen: true,
        title: 'Update Failed',
        message: 'Failed to update email address: ' + (error instanceof Error ? error.message : 'Unknown error'),
        variant: 'warning',
      })
    } finally {
      setIsSavingEmail(false)
    }
  }

  // Check if email is scheduled
  const checkScheduledStatus = async () => {
    if (!emailDraft) return
    try {
      // We'll check queue status to see if this draft is scheduled
      // For now, we'll use a simple approach - check if draft has a scheduled status
      // In a real implementation, you might want to fetch queue entries for this draft
      const queueStatus = await emailGenerationApi.getQueueStatus()
      if (queueStatus.success) {
        // Note: This is a simplified check. In production, you'd want to check
        // if this specific draftId is in the queue
        setIsScheduled(false) // Will be updated when we have a proper API
      }
    } catch (error) {
      console.error('Error checking scheduled status:', error)
    }
  }

  // Handle mailbox selection toggle
  const handleMailboxToggle = (mailboxId: number) => {
    // Determine if this is bulk or single scheduling
    const isBulkMode = selectedCount !== undefined && selectedCount > 1 && selectedDraftIds && selectedDraftIds.length > 1
    const emailCount = isBulkMode ? selectedDraftIds.length : 1
    
    setSelectedMailboxIds(prev => {
      const isCurrentlySelected = prev.includes(mailboxId)
      
      // If unselecting, always allow
      if (isCurrentlySelected) {
        return prev.filter(id => id !== mailboxId)
      }
      
      // If selecting, check if we've reached the limit
      if (prev.length >= emailCount) {
        setScheduleDialog({
          isOpen: true,
          title: 'Maximum Mailboxes Reached',
          message: `You can only select up to ${emailCount} mailbox(es) for ${emailCount} email(s). ` +
                   `Number of emails must be greater than or equal to the number of selected mailboxes.`,
          variant: 'warning',
          onConfirm: () => setScheduleDialog(prev => ({ ...prev, isOpen: false })),
        })
        return prev
      }
      
      // Allow selection
      return [...prev, mailboxId]
    })
  }


  // Handle schedule email
  const handleScheduleEmail = async () => {
    if (!emailDraft) return
    
    if (!scheduledAt || !scheduledTime) {
      setScheduleDialog({
        isOpen: true,
        title: 'Missing Information',
        message: 'Please select both date and time',
        variant: 'warning',
        onConfirm: () => setScheduleDialog(prev => ({ ...prev, isOpen: false })),
      })
      return
    }

    // Validate mailbox selection - at least one mailbox must be selected
    if (selectedMailboxIds.length === 0) {
      setScheduleDialog({
        isOpen: true,
        title: 'No Mailboxes Selected',
        message: 'Please select at least one mailbox.',
        variant: 'warning',
        onConfirm: () => setScheduleDialog(prev => ({ ...prev, isOpen: false })),
      })
      return
    }

    // Determine if this is bulk or single scheduling
    const isBulkMode = selectedCount !== undefined && selectedCount > 1 && selectedDraftIds && selectedDraftIds.length > 1
    const emailCount = isBulkMode ? selectedDraftIds.length : 1
    const draftIds = isBulkMode ? selectedDraftIds : [emailDraft.id]

    // Validate number of emails >= number of selected mailboxes
    const mailboxCount = selectedMailboxIds.length
    
    if (emailCount < mailboxCount) {
      setScheduleDialog({
        isOpen: true,
        title: 'Invalid Selection',
        message: `You selected ${mailboxCount} mailbox(es) but only ${emailCount} email(s). ` +
                 `Number of emails must be greater than or equal to the number of selected mailboxes.`,
        variant: 'warning',
        onConfirm: () => setScheduleDialog(prev => ({ ...prev, isOpen: false })),
      })
      return
    }

    // Combine date and time into ISO string
    const scheduledDateTime = new Date(`${scheduledAt}T${scheduledTime}`).toISOString()
    
    // Validate that scheduled time is in the future
    if (new Date(scheduledDateTime) <= new Date()) {
      setScheduleDialog({
        isOpen: true,
        title: 'Invalid Date',
        message: 'Please select a future date and time',
        variant: 'warning',
        onConfirm: () => setScheduleDialog(prev => ({ ...prev, isOpen: false })),
      })
      return
    }

    setIsScheduling(true)
    try {
      const clientEmailIdsToUse = selectedMailboxIds
      
      // Use onScheduleAll callback if available and in bulk mode, otherwise use API directly
      if (isBulkMode && onScheduleAll) {
        await onScheduleAll(draftIds, scheduledDateTime, clientEmailIdsToUse)
        setScheduleDialog({
          isOpen: true,
          title: 'Success',
          message: `Successfully scheduled ${emailCount} email(s)!`,
          variant: 'info',
          onConfirm: () => setScheduleDialog(prev => ({ ...prev, isOpen: false })),
        })
      } else {
        // Single email or fallback to API
        const response = await emailGenerationApi.scheduleBatch(
          draftIds,
          scheduledDateTime,
          clientEmailIdsToUse
        )
        
        if (response.success && response.data) {
          setIsScheduled(true)
          setScheduledDate(scheduledDateTime)
          setScheduleDialog({
            isOpen: true,
            title: 'Success',
            message: isBulkMode 
              ? `Successfully scheduled ${response.data?.count || draftIds.length} email(s)!`
              : 'Email scheduled successfully!',
            variant: 'info',
            onConfirm: () => setScheduleDialog(prev => ({ ...prev, isOpen: false })),
          })
        } else {
          setScheduleDialog({
            isOpen: true,
            title: 'Schedule Failed',
            message: 'Failed to schedule email: ' + (response.error || 'Unknown error'),
            variant: 'warning',
            onConfirm: () => setScheduleDialog(prev => ({ ...prev, isOpen: false })),
          })
        }
      }
      
      // Close modal and reset state
      setIsScheduleModalOpen(false)
      setScheduledAt('')
      setScheduledTime('')
      setSelectedMailboxIds([])
    } catch (error) {
      console.error('Error scheduling email:', error)
      setScheduleDialog({
        isOpen: true,
        title: 'Schedule Error',
        message: 'Failed to schedule email: ' + (error instanceof Error ? error.message : 'Unknown error'),
        variant: 'warning',
        onConfirm: () => setScheduleDialog(prev => ({ ...prev, isOpen: false })),
      })
    } finally {
      setIsScheduling(false)
    }
  }

  // Handle remove from queue
  const handleRemoveFromQueue = () => {
    if (!emailDraft) return
    
    setScheduleDialog({
      isOpen: true,
      title: 'Cancel Scheduled Email',
      message: 'Are you sure you want to cancel this scheduled email?',
      variant: 'warning',
      onConfirm: async () => {
        setScheduleDialog(prev => ({ ...prev, isOpen: false }))
        setIsRemovingFromQueue(true)
        try {
          const response = await emailGenerationApi.removeFromQueue(emailDraft.id)
          if (response.success) {
            setIsScheduled(false)
            setScheduledDate(null)
            setScheduleDialog({
              isOpen: true,
              title: 'Success',
              message: 'Scheduled email cancelled successfully',
              variant: 'info',
              onConfirm: () => setScheduleDialog(prev => ({ ...prev, isOpen: false })),
            })
          } else {
            setScheduleDialog({
              isOpen: true,
              title: 'Cancel Failed',
              message: 'Failed to cancel scheduled email: ' + (response.error || 'Unknown error'),
              variant: 'warning',
              onConfirm: () => setScheduleDialog(prev => ({ ...prev, isOpen: false })),
            })
          }
        } catch (error) {
          console.error('Error removing from queue:', error)
          setScheduleDialog({
            isOpen: true,
            title: 'Cancel Error',
            message: 'Failed to cancel scheduled email: ' + (error instanceof Error ? error.message : 'Unknown error'),
            variant: 'warning',
            onConfirm: () => setScheduleDialog(prev => ({ ...prev, isOpen: false })),
          })
        } finally {
          setIsRemovingFromQueue(false)
        }
      },
    })
  }

  // Check scheduled status when overlay opens
  useEffect(() => {
    if (isOpen && emailDraft) {
      checkScheduledStatus()
    }
  }, [isOpen, emailDraft?.id])

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
            {/* Scheduled Badge */}
            {isScheduled && scheduledDate && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium flex-shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Scheduled</span>
              </div>
            )}
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

              {/* Subscription Status - Only show when unsubscribed */}
              {subscriptionDataLoaded && emailDraft.isUnsubscribed && (
                <div className="px-6 py-3 border-b bg-red-50 border-red-100 text-red-700">
                  <p className="text-sm font-medium">
                    This contact is unsubscribed from emails.
                  </p>
                  <div className="mt-1 space-y-1 text-xs text-current">
                    {unsubscribedAtDisplay && <p>Unsubscribed on {unsubscribedAtDisplay}</p>}
                    {emailDraft.unsubscribeReason && <p>Reason: {emailDraft.unsubscribeReason}</p>}
                  </div>
                </div>
              )}

              {/* Subject Field - Clean Gmail Style with Dropdown */}
              <div className="px-6 py-3 border-b border-gray-200">
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 font-normal mr-3 min-w-[60px]">Subject</span>
                  <div className="flex-1 flex items-center gap-2">
                    {isEditMode ? (
                      <>
                        {subjectLines.length > 1 ? (
                          <div className="flex-1 relative subject-dropdown-container">
                            <button
                              type="button"
                              onClick={() => setIsSubjectDropdownOpen(!isSubjectDropdownOpen)}
                              className="flex-1 text-sm text-gray-900 outline-none bg-transparent border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-left flex items-center justify-between w-full p-2"
                            >
                              <span className="truncate">
                                {subjectLines[selectedSubjectIndex] || 'Select subject'}
                              </span>
                              <svg
                                className={`w-4 h-4 text-gray-500 ml-2 flex-shrink-0 transition-transform ${isSubjectDropdownOpen ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            {isSubjectDropdownOpen && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                                {subjectLines.map((subject, index) => (
                                  <button
                                    key={index}
                                    type="button"
                                    onClick={() => {
                                      setSelectedSubjectIndex(index)
                                      setEditedSubject(subjectLines[index])
                                      setIsSubjectDropdownOpen(false)
                                    }}
                                    className={`w-full text-left px-4 py-3 text-sm text-gray-900 hover:bg-indigo-50 transition-colors ${
                                      selectedSubjectIndex === index ? 'bg-indigo-50 text-indigo-700 font-medium' : ''
                                    } first:rounded-t-lg last:rounded-b-lg`}
                                  >
                                    {subject}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={editedSubject}
                            onChange={(e) => setEditedSubject(e.target.value)}
                            className="flex-1 text-sm text-gray-900 outline-none border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 p-2"
                            placeholder="Subject"
                            autoFocus
                          />
                        )}
                      </>
                    ) : (
                      <>
                        {subjectLines.length > 1 ? (
                          <div className="flex-1 relative subject-dropdown-container">
                            <button
                              type="button"
                              onClick={() => setIsSubjectDropdownOpen(!isSubjectDropdownOpen)}
                              className="flex-1 text-sm text-gray-900 outline-none bg-transparent border-none cursor-pointer hover:text-indigo-600 transition-colors focus:text-indigo-600 text-left flex items-center justify-between w-full"
                            >
                              <span className="truncate">
                                {subjectLines[selectedSubjectIndex] || emailDraft.subject || 'No Subject'}
                              </span>
                              <svg
                                className={`w-4 h-4 text-gray-500 ml-2 flex-shrink-0 transition-transform ${isSubjectDropdownOpen ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            {isSubjectDropdownOpen && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                                {subjectLines.map((subject, index) => (
                                  <button
                                    key={index}
                                    type="button"
                                    onClick={() => {
                                      setSelectedSubjectIndex(index)
                                      setIsSubjectDropdownOpen(false)
                                    }}
                                    className={`w-full text-left px-4 py-3 text-sm text-gray-900 hover:bg-indigo-50 transition-colors ${
                                      selectedSubjectIndex === index ? 'bg-indigo-50 text-indigo-700 font-medium' : ''
                                    } first:rounded-t-lg last:rounded-b-lg`}
                                  >
                                    {subject}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={subjectLines[selectedSubjectIndex] || emailDraft.subject || ''}
                            readOnly
                            className="flex-1 text-sm text-gray-900 outline-none bg-transparent border-none"
                            placeholder="Subject"
                          />
                        )}
                      </>
                    )}
                  </div>
                </div>
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
                          onClick={() => {
                            // Show confirmation dialog for both single and bulk sends
                            if (selectedCount !== undefined && selectedCount > 1 && onSendAll) {
                              // Bulk send
                              setSendConfirmDialog({
                                isOpen: true,
                                count: selectedCount,
                                isBulk: true,
                              })
                            } else if (onSend) {
                              // Single email send - show confirmation
                              setSendConfirmDialog({
                                isOpen: true,
                                count: 1,
                                isBulk: false,
                              })
                            }
                          }}
                          disabled={emailDraft.status !== 'draft' || isScheduled}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                          title={isScheduled ? 'Email is scheduled. Cancel scheduling to send now.' : undefined}
                        >
                          {selectedCount !== undefined && selectedCount > 1 ? `Send (${selectedCount})` : 'Send'}
                        </Button>
                        {emailDraft.status === 'draft' && (
                          <>
                            {onEdit && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsEditMode(true)}
                                className="text-gray-700 border-gray-300 hover:bg-gray-50 px-4 py-1.5 text-sm font-normal"
                              >
                                Edit
                              </Button>
                            )}
                          </>
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

                  {/* Right: Queue Email */}
                  <div className="flex items-center gap-2 justify-end">
                    {!isEditMode && emailDraft.status === 'draft' && (
                      <>
                        {isScheduled ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRemoveFromQueue}
                            disabled={isRemovingFromQueue}
                            isLoading={isRemovingFromQueue}
                            className="text-orange-700 border-orange-300 hover:bg-orange-50"
                            title={`Scheduled for ${scheduledDate ? new Date(scheduledDate).toLocaleString() : 'later'}`}
                          >
                            Cancel Schedule
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsScheduleModalOpen(true)}
                            className="text-gray-700 border-gray-300 hover:bg-gray-50 px-10 py-1.5 text-sm font-normal whitespace-nowrap"
                          >
                            {selectedCount !== undefined && selectedCount > 1 ? `Queue (${selectedCount})` : 'Queue Email'}
                          </Button>
                        )}
                      </>
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

      {/* Schedule Email Modal */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsScheduleModalOpen(false)} />
          <div className="relative bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Schedule {selectedCount !== undefined && selectedCount > 1 ? `${selectedCount} Emails` : '1 Email'}
              </h3>
              <button
                onClick={() => {
                  setIsScheduleModalOpen(false)
                  setScheduledAt('')
                  setScheduledTime('')
                  setSelectedMailboxIds([])
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Mailbox Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Mailboxes
                </label>
                
                {/* Mailbox selection */}
                {(() => {
                  // Determine if this is bulk or single scheduling
                  const isBulkMode = selectedCount !== undefined && selectedCount > 1 && selectedDraftIds && selectedDraftIds.length > 1
                  const emailCount = isBulkMode ? selectedDraftIds.length : 1
                  const maxMailboxes = emailCount
                  const isAtLimit = selectedMailboxIds.length >= maxMailboxes
                  
                  return (
                    <>
                      <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                        {isLoadingMailboxes ? (
                          <p className="text-sm text-gray-500">Loading mailboxes...</p>
                        ) : availableMailboxes.length === 0 ? (
                          <p className="text-sm text-gray-500">No active mailboxes available</p>
                        ) : (
                          <div className="space-y-2">
                            {availableMailboxes.map((mailbox) => {
                              const isSelected = selectedMailboxIds.includes(mailbox.id)
                              const isDisabled = !isSelected && isAtLimit
                              
                              return (
                                <label
                                  key={mailbox.id}
                                  className={`flex items-center gap-2 p-2 rounded ${
                                    isDisabled 
                                      ? 'cursor-not-allowed opacity-50' 
                                      : 'cursor-pointer hover:bg-gray-50'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleMailboxToggle(mailbox.id)}
                                    disabled={isDisabled}
                                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:cursor-not-allowed"
                                  />
                                  <span className={`text-sm ${isDisabled ? 'text-gray-400' : 'text-gray-700'}`}>
                                    {mailbox.emailAddress}
                                  </span>
                                </label>
                              )
                            })}
                          </div>
                        )}
                      </div>
                      {selectedMailboxIds.length > 0 && (
                        <p className="text-xs text-gray-500 mt-2">
                          {selectedMailboxIds.length} mailbox{selectedMailboxIds.length !== 1 ? 'es' : ''} selected
                          {isAtLimit && (
                            <span className="text-orange-600 ml-1">
                              (Maximum {maxMailboxes} for {emailCount} email{emailCount !== 1 ? 's' : ''})
                            </span>
                          )}
                        </p>
                      )}
                      {!isAtLimit && selectedMailboxIds.length === 0 && (
                        <p className="text-xs text-gray-500 mt-2">
                          Select up to {maxMailboxes} mailbox{maxMailboxes !== 1 ? 'es' : ''} for {emailCount} email{emailCount !== 1 ? 's' : ''}
                        </p>
                      )}
                    </>
                  )
                })()}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time
                </label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {scheduledAt && scheduledTime && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                  <p className="text-sm text-indigo-700">
                    <span className="font-medium">Scheduled for:</span>{' '}
                    {new Date(`${scheduledAt}T${scheduledTime}`).toLocaleString()}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleScheduleEmail}
                  disabled={!scheduledAt || !scheduledTime || isScheduling || selectedMailboxIds.length === 0}
                  isLoading={isScheduling}
                  className="flex-1"
                >
                  Schedule
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsScheduleModalOpen(false)
                    setScheduledAt('')
                    setScheduledTime('')
                    setSelectedMailboxIds([])
                  }}
                  disabled={isScheduling}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Update Confirmation Dialog */}
      <ConfirmDialog
        isOpen={emailUpdateDialog.isOpen}
        title={emailUpdateDialog.title}
        message={emailUpdateDialog.message}
        variant={emailUpdateDialog.variant}
        confirmText="OK"
        cancelText=""
        onConfirm={() => setEmailUpdateDialog({ ...emailUpdateDialog, isOpen: false })}
        onCancel={() => setEmailUpdateDialog({ ...emailUpdateDialog, isOpen: false })}
      />

      {/* Schedule Confirmation Dialog */}
      <ConfirmDialog
        isOpen={scheduleDialog.isOpen}
        title={scheduleDialog.title}
        message={scheduleDialog.message}
        variant={scheduleDialog.variant}
        confirmText={scheduleDialog.variant === 'warning' && scheduleDialog.message.includes('Are you sure') ? 'Yes, Cancel' : 'OK'}
        cancelText={scheduleDialog.variant === 'warning' && scheduleDialog.message.includes('Are you sure') ? 'No' : ''}
        onConfirm={() => {
          if (scheduleDialog.onConfirm) {
            scheduleDialog.onConfirm()
          } else {
            setScheduleDialog(prev => ({ ...prev, isOpen: false }))
          }
        }}
        onCancel={() => setScheduleDialog(prev => ({ ...prev, isOpen: false }))}
        isLoading={isRemovingFromQueue}
      />

      {/* Send Confirmation Dialog */}
      <ConfirmDialog
        isOpen={sendConfirmDialog.isOpen}
        title={sendConfirmDialog.isBulk ? "Send All Emails" : "Send Email"}
        message={sendConfirmDialog.isBulk 
          ? `Are you sure you want to send ${sendConfirmDialog.count} email(s)?`
          : "Are you sure you want to send this email?"}
        variant="warning"
        confirmText={sendConfirmDialog.isBulk ? "Yes, Send All" : "Yes, Send"}
        cancelText="Cancel"
        onConfirm={() => {
          if (sendConfirmDialog.isBulk && onSendAll) {
            onSendAll()
          } else if (!sendConfirmDialog.isBulk && onSend && emailDraft) {
            onSend(emailDraft.id)
          }
          setSendConfirmDialog({ isOpen: false, count: 0, isBulk: false })
        }}
        onCancel={() => setSendConfirmDialog({ isOpen: false, count: 0, isBulk: false })}
      />
    </div>
  )
}

