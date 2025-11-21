'use client'

import { useState, useEffect, Suspense, useCallback, useRef, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { DraftsSidebar, type DraftViewType } from '@/components/drafts/DraftsSidebar'
import { EmailDraftsList, type EmailDraft } from '@/components/drafts/EmailDraftsList'
import { SmsDraftsList, type SmsDraft } from '@/components/drafts/SmsDraftsList'
import { CombinedDraftsList } from '@/components/drafts/CombinedDraftsList'
import { EmailDraftOverlay } from '@/components/drafts/EmailDraftOverlay'
import { SmsDraftOverlay } from '@/components/drafts/SmsDraftOverlay'
import { GamifiedQueueProgress } from '@/components/drafts/GamifiedQueueProgress'
import { DraftStatusFilter } from '@/components/drafts/DraftStatusFilter'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { emailGenerationApi } from '@/api/emailGeneration'
import { smsGenerationApi } from '@/api/smsGeneration'
import { clientAccountsApi, type ClientEmail } from '@/api/clientAccounts'
import { useAuthContext } from '@/contexts/AuthContext'
import type { EmailDraft as ApiEmailDraft } from '@/types/emailGeneration'
import type { SMSDraft } from '@/types/smsGeneration'

function DraftsPageContent() {
  const searchParams = useSearchParams()
  const { client } = useAuthContext()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [activeView, setActiveView] = useState<DraftViewType>('all')
  const [activeTab, setActiveTab] = useState<'email' | 'sms'>('email')
  const [emailDrafts, setEmailDrafts] = useState<EmailDraft[]>([])
  const [smsDrafts, setSmsDrafts] = useState<SmsDraft[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [selectedEmailDraftIds, setSelectedEmailDraftIds] = useState<Set<number>>(new Set())
  const [selectedSmsDraftIds, setSelectedSmsDraftIds] = useState<Set<number>>(new Set())
  const [starredEmailDraftIds, setStarredEmailDraftIds] = useState<Set<number>>(new Set())
  const [starredSmsDraftIds, setStarredSmsDraftIds] = useState<Set<number>>(new Set())
  const [isBulkSending, setIsBulkSending] = useState(false)
  const [selectedEmailDraft, setSelectedEmailDraft] = useState<EmailDraft | null>(null)
  const [selectedSmsDraft, setSelectedSmsDraft] = useState<SmsDraft | null>(null)
  const [isEmailOverlayOpen, setIsEmailOverlayOpen] = useState(false)
  const [isSmsOverlayOpen, setIsSmsOverlayOpen] = useState(false)
  const [emailSpamCheckResult, setEmailSpamCheckResult] = useState<{
    score: number
    keywords: string[]
    suggestions: string[]
    blocked: boolean
  } | undefined>()
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 6
  const [selectedDraftsNavigationIndex, setSelectedDraftsNavigationIndex] = useState(0)
  const [selectedDraftsForNavigation, setSelectedDraftsForNavigation] = useState<EmailDraft[]>([])
  const [selectedSmsDraftsForNavigation, setSelectedSmsDraftsForNavigation] = useState<SmsDraft[]>([])
  const [selectedSmsDraftsNavigationIndex, setSelectedSmsDraftsNavigationIndex] = useState(0)
  const [queuedEmails, setQueuedEmails] = useState<Array<{
    id: number
    emailDraftId: number
    scheduledAt: string
    status: 'pending' | 'sent' | 'failed'
    emailDraft?: EmailDraft
  }>>([])
  const [isLoadingQueued, setIsLoadingQueued] = useState(false)
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [isScheduling, setIsScheduling] = useState(false)
  const [availableMailboxes, setAvailableMailboxes] = useState<ClientEmail[]>([])
  const [selectedMailboxIds, setSelectedMailboxIds] = useState<number[]>([])
  const [isLoadingMailboxes, setIsLoadingMailboxes] = useState(false)
  const [dequeuingIds, setDequeuingIds] = useState<Set<number>>(new Set())
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    variant: 'danger' | 'warning' | 'info'
    onConfirm: () => void
    onCancel?: () => void
    confirmText?: string
    cancelText?: string
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info',
    onConfirm: () => {},
  })
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Refs to prevent concurrent calls and track real-time updates
  const isFetchingQueuedRef = useRef(false)
  const eventSourceRef = useRef<EventSource | null>(null) // For Server-Sent Events (SSE)
  const prevQueuedEmailsRef = useRef<string>('') // Cache to prevent unnecessary re-renders

  // Transform API EmailDraft to component EmailDraft
  const transformEmailDraft = (apiDraft: ApiEmailDraft): EmailDraft => {
    // Get subject from subjectLines array (first element) or fallback to legacy fields
    const subject = apiDraft.subjectLines?.[0] || apiDraft.subjectLine || apiDraft.subject || 'No Subject'
    return {
      id: apiDraft.id,
      contactId: apiDraft.contactId || 0,
      contactName: apiDraft.contact?.businessName,
      contactEmail: apiDraft.contact?.email,
      fromEmail: apiDraft.clientEmail?.emailAddress || '',
      subject: subject,
      body: apiDraft.bodyText || apiDraft.body || '',
      status: (apiDraft.status as 'draft' | 'sent' | 'delivered') || 'draft',
      createdAt: apiDraft.createdAt || new Date().toISOString(),
      opens: undefined, // Will be populated if engagement data is included
      clicks: undefined, // Will be populated if engagement data is included
    }
  }

  // Transform API SMSDraft to component SmsDraft
  const transformSmsDraft = (apiDraft: SMSDraft): SmsDraft => {
    return {
      id: apiDraft.id,
      contactId: apiDraft.contactId || 0,
      contactName: apiDraft.contact?.businessName,
      contactPhone: apiDraft.contact?.phone,
      message: apiDraft.messageText || apiDraft.message || '',
      status: (apiDraft.status as 'draft' | 'sent' | 'delivered') || 'draft',
      createdAt: apiDraft.createdAt || new Date().toISOString(),
      characterCount: apiDraft.characterCount,
    }
  }

  // Fetch email drafts using existing API endpoint
  const fetchEmailDrafts = async () => {
    setIsLoading(true)
    try {
      const res = await emailGenerationApi.getAllEmailDrafts()
      
      if (res.success && res.data) {
        const drafts = Array.isArray(res.data) ? res.data : []
        setEmailDrafts(drafts.filter(d => (d.status ?? 'draft') === 'draft').map(transformEmailDraft))
      } else {
        setEmailDrafts([])
      }
    } catch (err) {
      console.error('Error fetching email drafts:', err)
      setEmailDrafts([])
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch queued emails (only called on initial load or manual refresh)
  const fetchQueuedEmails = useCallback(async () => {
    // Prevent concurrent calls
    if (isFetchingQueuedRef.current) {
      return
    }
    
    isFetchingQueuedRef.current = true
    setIsLoadingQueued(true)
    try {
      const res = await emailGenerationApi.getQueuedEmails()
      if (res.success && res.data) {
        const queued = Array.isArray(res.data) ? res.data : []
        const mappedQueued = queued.map(q => ({
          id: q.id,
          emailDraftId: q.emailDraftId,
          scheduledAt: q.scheduledAt,
          status: q.status,
          emailDraft: q.emailDraft ? transformEmailDraft(q.emailDraft) : undefined,
        }))
        
        // Only update state if data actually changed (prevent unnecessary re-renders)
        const currentDataStr = JSON.stringify(mappedQueued)
        if (currentDataStr !== prevQueuedEmailsRef.current) {
          prevQueuedEmailsRef.current = currentDataStr
          setQueuedEmails(mappedQueued)
        }
      } else {
        const emptyStr = JSON.stringify([])
        if (emptyStr !== prevQueuedEmailsRef.current) {
          prevQueuedEmailsRef.current = emptyStr
          setQueuedEmails([])
        }
      }
    } catch (err) {
      console.error('Error fetching queued emails:', err)
      const emptyStr = JSON.stringify([])
      if (emptyStr !== prevQueuedEmailsRef.current) {
        prevQueuedEmailsRef.current = emptyStr
        setQueuedEmails([])
      }
    } finally {
      setIsLoadingQueued(false)
      setTimeout(() => {
        isFetchingQueuedRef.current = false
      }, 200)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update queued emails from real-time event (without re-render if unchanged)
  const updateQueuedEmailFromEvent = useCallback((update: {
    type: string
    queueId?: number
    emailDraftId?: number
    status?: string
    data?: {
      queueId?: number
      emailDraftId?: number
      scheduledAt?: string
      status?: string
    }
  }) => {
    setQueuedEmails(prev => {
      if (update.type === 'queue:sent' && update.queueId) {
        // Update status of specific email
        const updated = prev.map(q => 
          q.id === update.queueId ? { ...q, status: 'sent' as const } : q
        )
        // Always update state to trigger re-render (counts need to update)
        prevQueuedEmailsRef.current = JSON.stringify(updated)
        return updated
      } else if (update.type === 'queue:added' && update.data) {
        // Add new email to queue directly from event data (no API call needed)
        // Ensure all required fields are present
        if (!update.data.queueId || !update.data.emailDraftId || !update.data.scheduledAt) {
          return prev // Missing required fields, skip
        }
        const newEmail = {
          id: update.data.queueId,
          emailDraftId: update.data.emailDraftId,
          scheduledAt: update.data.scheduledAt,
          status: 'pending' as const,
          emailDraft: undefined as EmailDraft | undefined, // Will be populated if user views/refreshes
        }
        // Check if email already exists (avoid duplicates)
        const exists = prev.some(q => q.id === newEmail.id || q.emailDraftId === newEmail.emailDraftId)
        if (exists) {
          return prev // Already exists, no change
        }
        const updated = [...prev, newEmail]
        // Always update state to trigger re-render (counts need to update)
        prevQueuedEmailsRef.current = JSON.stringify(updated)
        return updated
      } else if (update.type === 'queue:removed' && (update.queueId || update.emailDraftId)) {
        // Remove email from queue directly (no API call needed)
        const updated = prev.filter(q => 
          q.id !== update.queueId && q.emailDraftId !== update.emailDraftId
        )
        // Always update state to trigger re-render (counts need to update)
        prevQueuedEmailsRef.current = JSON.stringify(updated)
        return updated
      }
      return prev
    })
  }, [])

  // Connect to real-time updates via Server-Sent Events (SSE)
  // Always keep connection active to update counts in real-time regardless of active view
  useEffect(() => {
    // If already connected, don't create another connection
    if (eventSourceRef.current) {
      return
    }

    // Initial fetch to get current queue state
    fetchQueuedEmails()

    // Get API base URL
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null

    // Create EventSource connection for real-time updates
    // EventSource doesn't support custom headers, so we use query param as fallback
    // Cookies are also sent automatically with withCredentials: true
    const url = token 
      ? `${apiUrl}/emails/queue/realtime?token=${encodeURIComponent(token)}`
      : `${apiUrl}/emails/queue/realtime`
    
    const eventSource = new EventSource(url, {
      withCredentials: true, // Send cookies automatically
    })

    eventSourceRef.current = eventSource

    // Handle connection open
    eventSource.onopen = () => {
      console.log('✅ Connected to queue real-time updates')
    }

    // Handle incoming messages
    eventSource.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data)
        
        if (update.type === 'connected') {
          console.log('Queue updates connected:', update.message)
        } else if (update.type === 'queue:sent' || update.type === 'queue:added' || update.type === 'queue:removed') {
          // Update queue from real-time event
          updateQueuedEmailFromEvent(update)
        }
      } catch (err) {
        console.error('Error parsing SSE message:', err)
      }
    }

    // Handle errors
    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error)
      // EventSource will automatically try to reconnect
    }

    // Cleanup function
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, updateQueuedEmailFromEvent])

  // Fetch available mailboxes - load once on mount and cache
  const fetchMailboxes = useCallback(async () => {
    setIsLoadingMailboxes(true)
    try {
      const response = await clientAccountsApi.getClientEmails()
      if (response.success && response.data) {
        // Filter to active mailboxes only
        const activeMailboxes = response.data.filter(m => m.status === 'active')
        setAvailableMailboxes(activeMailboxes)
      }
    } catch (error) {
      console.error('Error fetching mailboxes:', error)
      setAvailableMailboxes([])
    } finally {
      setIsLoadingMailboxes(false)
    }
  }, [])

  // Load mailboxes once on mount instead of every time modal opens
  useEffect(() => {
    fetchMailboxes()
  }, [fetchMailboxes])

  // Reset mailbox selections when schedule modal opens
  useEffect(() => {
    if (isScheduleModalOpen) {
      setSelectedMailboxIds([])
    }
  }, [isScheduleModalOpen])

  // Handle schedule emails (bulk)
  const handleScheduleEmails = async () => {
    if (selectedEmailDraftIds.size === 0) {
      setConfirmDialog({
        isOpen: true,
        title: 'No Emails Selected',
        message: 'Please select at least one email to schedule.',
        variant: 'warning',
        onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })),
        confirmText: 'OK',
        cancelText: '',
      })
      return
    }

    if (!scheduledAt || !scheduledTime) {
      setConfirmDialog({
        isOpen: true,
        title: 'Missing Information',
        message: 'Please select both date and time.',
        variant: 'warning',
        onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })),
        confirmText: 'OK',
        cancelText: '',
      })
      return
    }

    const scheduledDateTime = new Date(`${scheduledAt}T${scheduledTime}`).toISOString()
    if (new Date(scheduledDateTime) <= new Date()) {
      setConfirmDialog({
        isOpen: true,
        title: 'Invalid Date',
        message: 'Please select a future date and time.',
        variant: 'warning',
        onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })),
        confirmText: 'OK',
        cancelText: '',
      })
      return
    }

    // Validate mailbox selection - required
    if (selectedMailboxIds.length === 0) {
      setConfirmDialog({
        isOpen: true,
        title: 'No Mailboxes Selected',
        message: 'Please select at least one mailbox.',
        variant: 'warning',
        onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })),
        confirmText: 'OK',
        cancelText: '',
      })
      return
    }

    // Validate number of emails >= number of selected mailboxes
      const draftCount = selectedEmailDraftIds.size
      const mailboxCount = selectedMailboxIds.length
      
      if (draftCount < mailboxCount) {
        setConfirmDialog({
          isOpen: true,
          title: 'Invalid Selection',
          message: `You selected ${mailboxCount} mailbox(es) but only ${draftCount} email(s). ` +
                   `Number of emails must be greater than or equal to the number of selected mailboxes.`,
          variant: 'warning',
          onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })),
          confirmText: 'OK',
          cancelText: '',
        })
        return
    }

    setIsScheduling(true)
    const draftIds = Array.from(selectedEmailDraftIds)

    try {
      // Use batch API with selected mailboxes
      const response = await emailGenerationApi.scheduleBatch(
        draftIds,
        scheduledDateTime,
        selectedMailboxIds
      )

      if (response.success) {
        setSuccessMessage(`Successfully scheduled ${response.data?.count || draftIds.length} email(s)!`)
        setIsScheduleModalOpen(false)
        setScheduledAt('')
        setScheduledTime('')
        setSelectedEmailDraftIds(new Set())
        setSelectedMailboxIds([])
        // Always fetch queued emails to update count in sidebar
        fetchQueuedEmails()
        setTimeout(() => setSuccessMessage(null), 5000)
      } else {
        setErrorMessage('Failed to schedule emails: ' + (response.error || 'Unknown error'))
        setTimeout(() => setErrorMessage(null), 5000)
      }
    } catch (error) {
      setErrorMessage('Error scheduling emails: ' + (error instanceof Error ? error.message : 'Unknown error'))
      setTimeout(() => setErrorMessage(null), 5000)
    } finally {
      setIsScheduling(false)
    }
  }

  // Handle mailbox selection toggle with validation
  const handleMailboxToggle = (mailboxId: number) => {
    const emailCount = selectedEmailDraftIds.size
    
    setSelectedMailboxIds(prev => {
      const isCurrentlySelected = prev.includes(mailboxId)
      
      // If unselecting, always allow
      if (isCurrentlySelected) {
        return prev.filter(id => id !== mailboxId)
      }
      
      // If selecting, check if we've reached the limit
      if (prev.length >= emailCount) {
        setConfirmDialog({
          isOpen: true,
          title: 'Maximum Mailboxes Reached',
          message: `You can only select up to ${emailCount} mailbox(es) for ${emailCount} email(s). ` +
                   `Number of emails must be greater than or equal to the number of selected mailboxes.`,
          variant: 'warning',
          onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })),
          confirmText: 'OK',
          cancelText: '',
        })
        return prev
      }
      
      return [...prev, mailboxId]
    })
  }

  // Handle dequeue email
  const handleDequeueEmail = (draftId: number) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Remove from Queue',
      message: 'Are you sure you want to remove this email from the queue?',
      variant: 'warning',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }))
        setDequeuingIds(prev => new Set(prev).add(draftId))
        try {
          const response = await emailGenerationApi.removeFromQueue(draftId)
          if (response.success) {
            setQueuedEmails(prev => prev.filter(q => q.emailDraftId !== draftId))
            setSuccessMessage('Email removed from schedule successfully')
            setTimeout(() => setSuccessMessage(null), 5000)
          } else {
            setErrorMessage('Failed to remove from schedule: ' + (response.error || 'Unknown error'))
            setTimeout(() => setErrorMessage(null), 5000)
          }
        } catch (error) {
          setErrorMessage('Error removing from schedule: ' + (error instanceof Error ? error.message : 'Unknown error'))
          setTimeout(() => setErrorMessage(null), 5000)
        } finally {
          setDequeuingIds(prev => {
            const next = new Set(prev)
            next.delete(draftId)
            return next
          })
        }
      },
      onCancel: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })),
      confirmText: 'Remove',
      cancelText: 'Cancel',
    })
  }

  // Fetch SMS drafts using getClientSmsDrafts API (same pattern as email drafts)
  const fetchSmsDrafts = async () => {
    setIsLoading(true)
    try {
      // Use client.id as clientSmsId (same as email uses client.id for clientEmailId)
      if (!client?.id) {
        console.warn('No client ID available')
        setSmsDrafts([])
        setIsLoading(false)
        return
      }
      
      // Using getClientSmsDrafts API method with client.id (same pattern as email)
      const res = await smsGenerationApi.getClientSmsDrafts(client.id)
      
      if (res.success && res.data) {
        const drafts = Array.isArray(res.data) ? res.data : []
        setSmsDrafts(drafts.filter(d => (d.status ?? 'draft') === 'draft').map(transformSmsDraft))
      } else {
        setSmsDrafts([])
      }
    } catch (err) {
      console.error('Error fetching SMS drafts:', err)
      setSmsDrafts([])
    } finally {
      setIsLoading(false)
    }
  }

  // Load starred drafts from localStorage
  useEffect(() => {
    const savedStarredEmails = localStorage.getItem('starredEmailDrafts')
    const savedStarredSms = localStorage.getItem('starredSmsDrafts')
    
    if (savedStarredEmails) {
      try {
        const ids = JSON.parse(savedStarredEmails)
        setStarredEmailDraftIds(new Set(ids))
      } catch (e) {
        console.error('Error loading starred emails:', e)
      }
    }
    
    if (savedStarredSms) {
      try {
        const ids = JSON.parse(savedStarredSms)
        setStarredSmsDraftIds(new Set(ids))
      } catch (e) {
        console.error('Error loading starred SMS:', e)
      }
    }
  }, [])

  // Consolidated effect: Fetch drafts based on view/tab - prevents duplicate calls
  const loadDrafts = useCallback(() => {
    // Determine what to fetch based on activeView
    if (activeView === 'all' || activeView === 'starred') {
      // Fetch both types when view needs both
      fetchEmailDrafts()
      if (client?.id) {
        fetchSmsDrafts()
      }
    } else if (activeView === 'email') {
      fetchEmailDrafts()
    } else if (activeView === 'sms' && client?.id) {
      fetchSmsDrafts()
    } else if (activeView === 'queued') {
      // Queued view handled by SSE - don't fetch drafts
    } else {
      // Fallback: fetch based on activeTab
      if (activeTab === 'email') {
        fetchEmailDrafts()
      } else if (activeTab === 'sms' && client?.id) {
        fetchSmsDrafts()
      }
    }
  }, [activeView, activeTab, client?.id])

  // Single effect to handle all draft loading - prevents duplicate calls on initial load
  useEffect(() => {
    loadDrafts()
  }, [loadDrafts])

  // Handle query parameters to open specific draft
  useEffect(() => {
    const emailDraftId = searchParams.get('emailDraftId')
    const smsDraftId = searchParams.get('smsDraftId')

    if (emailDraftId && emailDrafts.length > 0) {
      const draftId = parseInt(emailDraftId, 10)
      const draft = emailDrafts.find(d => d.id === draftId)
      if (draft) {
        handleViewDraft(draftId, 'email')
        // Clear the query parameter
        window.history.replaceState({}, '', '/dashboard/draft')
      }
    } else if (smsDraftId && smsDrafts.length > 0) {
      const draftId = parseInt(smsDraftId, 10)
      const draft = smsDrafts.find(d => d.id === draftId)
      if (draft) {
        handleViewDraft(draftId, 'sms')
        // Clear the query parameter
        window.history.replaceState({}, '', '/dashboard/draft')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, emailDrafts, smsDrafts])


  const handleViewChange = (view: DraftViewType) => {
    setActiveView(view)
    // Set active tab based on view
    if (view === 'email') {
      setActiveTab('email')
    } else if (view === 'sms') {
      setActiveTab('sms')
    }
    // Reset selection when changing views
    setSelectedEmailDraftIds(new Set())
    setSelectedSmsDraftIds(new Set())
    setCurrentPage(1)
  }

  const handleTabChange = (tab: 'email' | 'sms') => {
    setActiveTab(tab)
    setSearchQuery('')
    setDateRange('all')
    setSelectedEmailDraftIds(new Set())
    setSelectedSmsDraftIds(new Set())
  }

  // Toggle starred state for email drafts
  const handleToggleEmailStar = (draftId: number) => {
    const newStarred = new Set(starredEmailDraftIds)
    if (newStarred.has(draftId)) {
      newStarred.delete(draftId)
    } else {
      newStarred.add(draftId)
    }
    setStarredEmailDraftIds(newStarred)
    // Save to localStorage
    localStorage.setItem('starredEmailDrafts', JSON.stringify(Array.from(newStarred)))
  }

  // Toggle starred state for SMS drafts
  const handleToggleSmsStar = (draftId: number) => {
    const newStarred = new Set(starredSmsDraftIds)
    if (newStarred.has(draftId)) {
      newStarred.delete(draftId)
    } else {
      newStarred.add(draftId)
    }
    setStarredSmsDraftIds(newStarred)
    // Save to localStorage
    localStorage.setItem('starredSmsDrafts', JSON.stringify(Array.from(newStarred)))
  }

  const [currentDraftIndex, setCurrentDraftIndex] = useState<number>(0)

  const handleViewDraft = async (draftId: number, type?: 'email' | 'sms') => {
    // Determine type from draftId if not provided
    let draftType: 'email' | 'sms' = type || activeTab
    if (!type) {
      // Try to find in email drafts first
      const emailDraft = filteredEmailDrafts.find(d => d.id === draftId)
      const smsDraft = filteredSmsDrafts.find(d => d.id === draftId)
      if (emailDraft) draftType = 'email'
      else if (smsDraft) draftType = 'sms'
    }

    if (draftType === 'email') {
      // Check if viewing from selected drafts
      const selectedDrafts = filteredEmailDrafts.filter(d => selectedEmailDraftIds.has(d.id))
      
      if (selectedDrafts.length > 0) {
        // Navigate through selected drafts
        const draftIndex = selectedDrafts.findIndex(d => d.id === draftId)
        if (draftIndex !== -1) {
          setSelectedDraftsForNavigation(selectedDrafts)
          setSelectedDraftsNavigationIndex(draftIndex)
          const draft = selectedDrafts[draftIndex]
          setCurrentDraftIndex(draftIndex)
          setSelectedEmailDraft(draft)
          setIsEmailOverlayOpen(true)
          
          // Fetch spam check result
          // TODO: Commented out spam check API for now
          // try {
          //   const spamRes = await emailGenerationApi.checkSpam({ draftId })
          //   if (spamRes.success && spamRes.data) {
          //     setEmailSpamCheckResult(spamRes.data)
          //   }
          // } catch (err) {
          //   console.error('Error fetching draft details:', err)
          // }
          return
        }
      }
      
      // Fallback to filtered drafts navigation
      const draftIndex = filteredEmailDrafts.findIndex(d => d.id === draftId)
      const draft = filteredEmailDrafts[draftIndex]
      if (draft) {
        setCurrentDraftIndex(draftIndex)
        setSelectedEmailDraft(draft)
        setIsEmailOverlayOpen(true)
        
        // Fetch spam check result
        // TODO: Commented out spam check API for now
        // try {
        //   const spamRes = await emailGenerationApi.checkSpam({ draftId })
        //   if (spamRes.success && spamRes.data) {
        //     setEmailSpamCheckResult(spamRes.data)
        //   }
        // } catch (err) {
        //   console.error('Error fetching draft details:', err)
        // }
      }
    } else {
      // SMS view logic - fetch full draft from API when viewing single draft
      try {
        // Fetch full SMS draft with all related data (contact, summary, clientSms)
        const res = await smsGenerationApi.getSmsDraft(draftId)
        
        if (res.success && res.data) {
          // Transform API draft to component draft
          const fullDraft = transformSmsDraft(res.data)
          
          // Check if viewing from selected drafts
          const selectedDrafts = filteredSmsDrafts.filter(d => selectedSmsDraftIds.has(d.id))
          
          if (selectedDrafts.length > 0) {
            // Navigate through selected drafts
            const draftIndex = selectedDrafts.findIndex(d => d.id === draftId)
            if (draftIndex !== -1) {
              // Update the selected draft with full data
              const updatedSelectedDrafts = selectedDrafts.map(d => 
                d.id === draftId ? fullDraft : d
              )
              setSelectedSmsDraftsForNavigation(updatedSelectedDrafts)
              setSelectedSmsDraftsNavigationIndex(draftIndex)
              setSelectedSmsDraft(fullDraft)
              setIsSmsOverlayOpen(true)
              return
            }
          }
          
          // Fallback: use the fetched full draft
          setSelectedSmsDraft(fullDraft)
          setIsSmsOverlayOpen(true)
        } else {
          // If API fails, fallback to local draft data
          const selectedDrafts = filteredSmsDrafts.filter(d => selectedSmsDraftIds.has(d.id))
          
          if (selectedDrafts.length > 0) {
            const draftIndex = selectedDrafts.findIndex(d => d.id === draftId)
            if (draftIndex !== -1) {
              setSelectedSmsDraftsForNavigation(selectedDrafts)
              setSelectedSmsDraftsNavigationIndex(draftIndex)
              setSelectedSmsDraft(selectedDrafts[draftIndex])
              setIsSmsOverlayOpen(true)
              return
            }
          }
          
          const draft = filteredSmsDrafts.find(d => d.id === draftId)
          if (draft) {
            setSelectedSmsDraft(draft)
            setIsSmsOverlayOpen(true)
          }
        }
      } catch (err) {
        console.error('Error fetching SMS draft:', err)
        // Fallback to local draft data on error
        const selectedDrafts = filteredSmsDrafts.filter(d => selectedSmsDraftIds.has(d.id))
        
        if (selectedDrafts.length > 0) {
          const draftIndex = selectedDrafts.findIndex(d => d.id === draftId)
          if (draftIndex !== -1) {
            setSelectedSmsDraftsForNavigation(selectedDrafts)
            setSelectedSmsDraftsNavigationIndex(draftIndex)
            setSelectedSmsDraft(selectedDrafts[draftIndex])
            setIsSmsOverlayOpen(true)
            return
          }
        }
        
        const draft = filteredSmsDrafts.find(d => d.id === draftId)
        if (draft) {
          setSelectedSmsDraft(draft)
          setIsSmsOverlayOpen(true)
        }
      }
    }
  }

  const handleContactEmailChange = useCallback((contactId: number, email: string) => {
    setEmailDrafts(prev => {
      let changed = false
      const next = prev.map(draft => {
        if (draft.contactId === contactId) {
          changed = true
          return { ...draft, contactEmail: email }
        }
        return draft
      })
      return changed ? next : prev
    })

    setSelectedDraftsForNavigation(prev => {
      if (!prev.length) return prev
      let changed = false
      const next = prev.map(draft => {
        if (draft.contactId === contactId) {
          changed = true
          return { ...draft, contactEmail: email }
        }
        return draft
      })
      return changed ? next : prev
    })

    setSelectedEmailDraft(prev =>
      prev?.contactId === contactId ? { ...prev, contactEmail: email } : prev
    )
  }, [])

  const handleNextEmailDraft = async () => {
    // Navigate through selected drafts if available
    if (selectedDraftsForNavigation.length > 0) {
      const nextIndex = selectedDraftsNavigationIndex + 1
      if (nextIndex < selectedDraftsForNavigation.length) {
        const nextDraft = selectedDraftsForNavigation[nextIndex]
        setSelectedDraftsNavigationIndex(nextIndex)
        setCurrentDraftIndex(nextIndex)
        setSelectedEmailDraft(nextDraft)
        
        // Fetch spam check result
        // TODO: Commented out spam check API for now
        // try {
        //   const spamRes = await emailGenerationApi.checkSpam({ draftId: nextDraft.id })
        //   if (spamRes.success && spamRes.data) {
        //     setEmailSpamCheckResult(spamRes.data)
        //   }
        // } catch (err) {
        //   console.error('Error fetching draft details:', err)
        // }
      }
      return
    }
    
    // Fallback to filtered drafts
    const nextIndex = currentDraftIndex + 1
    if (nextIndex < filteredEmailDrafts.length) {
      const nextDraft = filteredEmailDrafts[nextIndex]
      setCurrentDraftIndex(nextIndex)
      setSelectedEmailDraft(nextDraft)
      
      // Fetch spam check result
      // TODO: Commented out spam check API for now
      // try {
      //   const spamRes = await emailGenerationApi.checkSpam({ draftId: nextDraft.id })
      //   if (spamRes.success && spamRes.data) {
      //     setEmailSpamCheckResult(spamRes.data)
      //   }
      // } catch (err) {
      //   console.error('Error fetching draft details:', err)
      // }
    }
  }

  const handlePreviousEmailDraft = async () => {
    // Navigate through selected drafts if available
    if (selectedDraftsForNavigation.length > 0) {
      const prevIndex = selectedDraftsNavigationIndex - 1
      if (prevIndex >= 0) {
        const prevDraft = selectedDraftsForNavigation[prevIndex]
        setSelectedDraftsNavigationIndex(prevIndex)
        setCurrentDraftIndex(prevIndex)
        setSelectedEmailDraft(prevDraft)
        
        // Fetch spam check result
        // TODO: Commented out spam check API for now
        // try {
        //   const spamRes = await emailGenerationApi.checkSpam({ draftId: prevDraft.id })
        //   if (spamRes.success && spamRes.data) {
        //     setEmailSpamCheckResult(spamRes.data)
        //   }
        // } catch (err) {
        //   console.error('Error fetching draft details:', err)
        // }
      }
      return
    }
    
    // Fallback to filtered drafts
    const prevIndex = currentDraftIndex - 1
    if (prevIndex >= 0) {
      const prevDraft = filteredEmailDrafts[prevIndex]
      setCurrentDraftIndex(prevIndex)
      setSelectedEmailDraft(prevDraft)
      
      // Fetch spam check result
      // TODO: Commented out spam check API for now
      // try {
      //   const spamRes = await emailGenerationApi.checkSpam({ draftId: prevDraft.id })
      //   if (spamRes.success && spamRes.data) {
      //     setEmailSpamCheckResult(spamRes.data)
      //   }
      // } catch (err) {
      //   console.error('Error fetching draft details:', err)
      // }
    }
  }

  // SMS draft navigation handlers
  const handleNextSmsDraft = async () => {
    // Navigate through selected drafts if available
    if (selectedSmsDraftsForNavigation.length > 0) {
      const nextIndex = selectedSmsDraftsNavigationIndex + 1
      if (nextIndex < selectedSmsDraftsForNavigation.length) {
        const nextDraft = selectedSmsDraftsForNavigation[nextIndex]
        setSelectedSmsDraftsNavigationIndex(nextIndex)
        setSelectedSmsDraft(nextDraft)
      }
      return
    }
    
    // Fallback to filtered drafts
    const currentIndex = filteredSmsDrafts.findIndex(d => d.id === selectedSmsDraft?.id)
    const nextIndex = currentIndex + 1
    if (nextIndex < filteredSmsDrafts.length) {
      const nextDraft = filteredSmsDrafts[nextIndex]
      setSelectedSmsDraft(nextDraft)
    }
  }

  const handlePreviousSmsDraft = async () => {
    // Navigate through selected drafts if available
    if (selectedSmsDraftsForNavigation.length > 0) {
      const prevIndex = selectedSmsDraftsNavigationIndex - 1
      if (prevIndex >= 0) {
        const prevDraft = selectedSmsDraftsForNavigation[prevIndex]
        setSelectedSmsDraftsNavigationIndex(prevIndex)
        setSelectedSmsDraft(prevDraft)
      }
      return
    }
    
    // Fallback to filtered drafts
    const currentIndex = filteredSmsDrafts.findIndex(d => d.id === selectedSmsDraft?.id)
    const prevIndex = currentIndex - 1
    if (prevIndex >= 0) {
      const prevDraft = filteredSmsDrafts[prevIndex]
      setSelectedSmsDraft(prevDraft)
    }
  }

  const handleCloseEmailOverlay = () => {
    setIsEmailOverlayOpen(false)
    setSelectedEmailDraft(null)
    setEmailSpamCheckResult(undefined)
    setSelectedDraftsForNavigation([])
    setSelectedDraftsNavigationIndex(0)
  }

  const handleCloseSmsOverlay = () => {
    setIsSmsOverlayOpen(false)
    setSelectedSmsDraft(null)
    setSelectedSmsDraftsForNavigation([])
    setSelectedSmsDraftsNavigationIndex(0)
  }

  const handleEditEmailDraft = async (draftId: number, subject: string, body: string) => {
    try {
      // Find the draft to get its subjectLines array
      const draft = emailDrafts.find(d => d.id === draftId)
      // If we have subjectLines from the overlay, use them; otherwise create array from subject
      // Check if draft has subjectLines property (extended type)
      type DraftWithSubjectLines = EmailDraft & { subjectLines?: string[] }
      const draftWithSubjectLines = draft as DraftWithSubjectLines | undefined
      const subjectLinesArray = draftWithSubjectLines?.subjectLines && Array.isArray(draftWithSubjectLines.subjectLines)
        ? draftWithSubjectLines.subjectLines.map((s: string, i: number) => i === 0 ? subject : s) // Update first one
        : [subject] // Fallback to single subject
      
      const res = await emailGenerationApi.updateEmailDraft(draftId, {
        subjectLines: subjectLinesArray,
        bodyText: body,
      })
      if (res.success && res.data) {
        // Update the email draft in the local state
        setEmailDrafts(prevDrafts => 
          prevDrafts.map(draft => 
            draft.id === draftId 
              ? { ...draft, subject, body }
              : draft
          )
        )
        // Update selected email draft if it's the one being edited
        if (selectedEmailDraft && selectedEmailDraft.id === draftId) {
          setSelectedEmailDraft({
            ...selectedEmailDraft,
            subject,
            body
          })
        }
        // Update navigation drafts if they contain this draft
        if (selectedDraftsForNavigation.length > 0) {
          setSelectedDraftsForNavigation(prevDrafts =>
            prevDrafts.map(draft =>
              draft.id === draftId
                ? { ...draft, subject, body }
                : draft
            )
          )
        }
        setSuccessMessage('Email draft updated successfully!')
        setTimeout(() => setSuccessMessage(null), 5000)
      } else {
        setErrorMessage('Failed to update email draft: ' + (res.error || 'Unknown error'))
        setTimeout(() => setErrorMessage(null), 5000)
        throw new Error(res.error || 'Failed to update email draft')
      }
    } catch (err) {
      console.error('Error updating email draft:', err)
      throw err
    }
  }



  const handleSendEmailDraft = async (draftId: number) => {
    try {
      const res = await emailGenerationApi.sendEmailDraft(draftId)
      if (res.success && res.data) {
        const message = res.data.message || 'Email sent successfully!'
        const spamScore = res.data.spamScore
        const emailLogId = res.data.emailLogId
        
        // Show success message with spam score if available
        if (spamScore !== undefined) {
          setSuccessMessage(`${message}\nSpam Score: ${spamScore}\nEmail Log ID: ${emailLogId || 'N/A'}`)
        } else {
          setSuccessMessage(message)
        }
        setTimeout(() => setSuccessMessage(null), 5000)
        
        // Optimistically update draft state immediately (remove from drafts list)
        setEmailDrafts(prev => prev.filter(d => d.id !== draftId))
        
        handleCloseEmailOverlay()
        // Refresh email drafts to get updated status from server
        fetchEmailDrafts()
      } else {
        setErrorMessage('Failed to send email: ' + (res.error || 'Unknown error'))
        setTimeout(() => setErrorMessage(null), 5000)
      }
    } catch (err) {
      console.error('Error sending email:', err)
      // Handle BadRequestException with spam score details
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      if (errorMessage.includes('spam score') || errorMessage.includes('blocked')) {
        setErrorMessage(`Email blocked: ${errorMessage}\nPlease optimize the content and try again.`)
      } else {
        setErrorMessage('Error sending email: ' + errorMessage)
      }
      setTimeout(() => setErrorMessage(null), 5000)
    }
  }

  const handleEditSmsDraft = async (draftId: number, messageText: string) => {
    try {
      const res = await smsGenerationApi.updateSmsDraft(draftId, { messageText })
      if (res.success && res.data) {
        // Update the SMS draft in the local state
        setSmsDrafts(prevDrafts => 
          prevDrafts.map(draft => 
            draft.id === draftId 
              ? { ...draft, message: messageText, characterCount: messageText.length }
              : draft
          )
        )
        // Update selected SMS draft if it's the one being edited
        if (selectedSmsDraft && selectedSmsDraft.id === draftId) {
          setSelectedSmsDraft({
            ...selectedSmsDraft,
            message: messageText,
            characterCount: messageText.length
          })
        }
        // Update navigation drafts if they contain this draft
        if (selectedSmsDraftsForNavigation.length > 0) {
          setSelectedSmsDraftsForNavigation(prevDrafts =>
            prevDrafts.map(draft =>
              draft.id === draftId
                ? { ...draft, message: messageText, characterCount: messageText.length }
                : draft
            )
          )
        }
        setSuccessMessage('SMS draft updated successfully!')
        setTimeout(() => setSuccessMessage(null), 5000)
      } else {
        setErrorMessage('Failed to update SMS draft: ' + (res.error || 'Unknown error'))
        setTimeout(() => setErrorMessage(null), 5000)
        throw new Error(res.error || 'Failed to update SMS draft')
      }
    } catch (err) {
      console.error('Error updating SMS draft:', err)
      throw err
    }
  }

  const handleEditDraft = (draftId: number) => {
    if (activeTab === 'email') {
      // Email edit is handled directly in the overlay via onEdit prop
      console.log('Edit email draft:', draftId)
    } else {
      // SMS edit is handled directly in the overlay via onEdit prop
      console.log(`Edit ${activeTab} draft:`, draftId)
    }
  }

  const handleSendDraft = (draftId: number) => {
    if (activeTab === 'email') {
      handleSendEmailDraft(draftId)
    } else {
      handleSendSmsDraft(draftId)
    }
  }

  const handleSendSmsDraft = async (draftId: number) => {
    try {
      const res = await smsGenerationApi.sendSmsDraft(draftId)
      if (res.success && res.data) {
        const message = res.data.message || 'SMS sent successfully!'
        const messageSid = res.data.messageSid
        const smsLogId = res.data.smsLogId
        
        // Show success message with details if available
        if (messageSid && smsLogId) {
          setSuccessMessage(`${message}\nMessage SID: ${messageSid}\nSMS Log ID: ${smsLogId}`)
        } else {
          setSuccessMessage(message)
        }
        setTimeout(() => setSuccessMessage(null), 5000)
        
        // Optimistically update draft state immediately (remove from drafts list)
        setSmsDrafts(prev => prev.filter(d => d.id !== draftId))
        
        handleCloseSmsOverlay()
        // Refresh SMS drafts to get updated status from server
        fetchSmsDrafts()
      } else {
        setErrorMessage('Failed to send SMS: ' + (res.error || 'Unknown error'))
        setTimeout(() => setErrorMessage(null), 5000)
      }
    } catch (err) {
      console.error('Error sending SMS:', err)
      setErrorMessage('Error sending SMS: ' + (err instanceof Error ? err.message : 'Unknown error'))
      setTimeout(() => setErrorMessage(null), 5000)
    }
  }

  // Filter drafts based on active view, search, and status
  const getFilteredEmailDrafts = () => {
    let drafts = emailDrafts

    // Filter by active view from sidebar
    if (activeView === 'sms') {
      return [] // Don't show email drafts when SMS view is active
    }

    if (activeView === 'starred') {
      drafts = drafts.filter(d => starredEmailDraftIds.has(d.id))
    } 

    // Filter by date range
    if (dateRange !== 'all') {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
      
      drafts = drafts.filter(d => {
        const draftDate = new Date(d.createdAt)
        if (dateRange === 'today') return draftDate >= today
        if (dateRange === 'week') return draftDate >= weekAgo
        if (dateRange === 'month') return draftDate >= monthAgo
        return true
      })
    }

    // Filter by search query
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase()
      drafts = drafts.filter(draft =>
        draft.contactName?.toLowerCase().includes(searchLower) ||
        draft.contactEmail?.toLowerCase().includes(searchLower) ||
        draft.subject?.toLowerCase().includes(searchLower) ||
        draft.body?.toLowerCase().includes(searchLower)
      )
    }

    return drafts
  }

  const getFilteredSmsDrafts = () => {
    let drafts = smsDrafts

    // Filter by active view from sidebar
    if (activeView === 'email') {
      return [] // Don't show SMS drafts when email view is active
    }

    if (activeView === 'starred') {
      drafts = drafts.filter(d => starredSmsDraftIds.has(d.id))
    }

    // Filter by date range
    if (dateRange !== 'all') {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
      
      drafts = drafts.filter(d => {
        const draftDate = new Date(d.createdAt)
        if (dateRange === 'today') return draftDate >= today
        if (dateRange === 'week') return draftDate >= weekAgo
        if (dateRange === 'month') return draftDate >= monthAgo
        return true
      })
    }

    // Filter by search query
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase()
      drafts = drafts.filter(draft =>
        draft.contactName?.toLowerCase().includes(searchLower) ||
        draft.contactPhone?.toLowerCase().includes(searchLower) ||
        draft.message?.toLowerCase().includes(searchLower)
      )
    }

    return drafts
  }

  const filteredEmailDrafts = getFilteredEmailDrafts()
  const filteredSmsDrafts = getFilteredSmsDrafts()

  // Calculate counts for sidebar - use ALL drafts (not filtered) for accurate sidebar counts
  // These counts should reflect the total available, not what's currently filtered or visible
  // "All Drafts" should show ALL drafts regardless of status (draft, sent, delivered)
  // Use useMemo to ensure counts update when dependencies change
  const allDraftsCount = useMemo(() => 
    emailDrafts.filter(d => d.status === 'draft').length + smsDrafts.filter(d => d.status === 'draft').length,
    [emailDrafts, smsDrafts]
  )
  const emailDraftCount = useMemo(() => 
    emailDrafts.filter(d => d.status === 'draft').length,
    [emailDrafts]
  )
  const smsDraftCount = useMemo(() => 
    smsDrafts.filter(d => d.status === 'draft').length,
    [smsDrafts]
  )
  const starredCount = useMemo(() => 
    starredEmailDraftIds.size + starredSmsDraftIds.size,
    [starredEmailDraftIds, starredSmsDraftIds]
  )
  const queuedCount = useMemo(() => {
    const now = new Date()
    return queuedEmails.filter(q => 
      q.status === 'pending' && new Date(q.scheduledAt) > now
    ).length
  }, [queuedEmails])

  // For "all" view, combine both email and SMS drafts together
  // Group by contactId to show both email and SMS for same person
  type CombinedDraft = {
    type: 'email' | 'sms'
    draft: EmailDraft | SmsDraft
    contactId: number
  }

  let displayDrafts: (EmailDraft | SmsDraft)[]
  let combinedDrafts: CombinedDraft[] = []
  let isEmailView: boolean
  let showCombinedView = false

  if (activeView === 'all') {
    // Combine both email and SMS drafts for "all" view
    showCombinedView = true
    combinedDrafts = [
      ...filteredEmailDrafts.map(d => ({ type: 'email' as const, draft: d, contactId: d.contactId })),
      ...filteredSmsDrafts.map(d => ({ type: 'sms' as const, draft: d, contactId: d.contactId }))
    ]
    // Sort by contactId, then by type (email first), then by date
    combinedDrafts.sort((a, b) => {
      if (a.contactId !== b.contactId) return a.contactId - b.contactId
      if (a.type !== b.type) return a.type === 'email' ? -1 : 1
      const aDate = new Date(a.draft.createdAt).getTime()
      const bDate = new Date(b.draft.createdAt).getTime()
      return bDate - aDate
    })
    displayDrafts = combinedDrafts.map(c => c.draft)
    isEmailView = true // Default to email view for rendering
  } else if (activeView === 'starred') {
    // Combine starred email and SMS drafts
    showCombinedView = true
    combinedDrafts = [
      ...filteredEmailDrafts.map(d => ({ type: 'email' as const, draft: d, contactId: d.contactId })),
      ...filteredSmsDrafts.map(d => ({ type: 'sms' as const, draft: d, contactId: d.contactId }))
    ]
    combinedDrafts.sort((a, b) => {
      if (a.contactId !== b.contactId) return a.contactId - b.contactId
      if (a.type !== b.type) return a.type === 'email' ? -1 : 1
      const aDate = new Date(a.draft.createdAt).getTime()
      const bDate = new Date(b.draft.createdAt).getTime()
      return bDate - aDate
    })
    displayDrafts = combinedDrafts.map(c => c.draft)
    isEmailView = true
    combinedDrafts.sort((a, b) => {
      if (a.contactId !== b.contactId) return a.contactId - b.contactId
      if (a.type !== b.type) return a.type === 'email' ? -1 : 1
      const aDate = new Date(a.draft.createdAt).getTime()
      const bDate = new Date(b.draft.createdAt).getTime()
      return bDate - aDate
    })
    displayDrafts = combinedDrafts.map(c => c.draft)
    isEmailView = true
  } else if (activeView === 'email') {
    displayDrafts = filteredEmailDrafts
    isEmailView = true
  } else if (activeView === 'sms') {
    displayDrafts = filteredSmsDrafts
    isEmailView = false
  } else if (activeView === 'queued') {
    // Queued emails view is handled separately above
    displayDrafts = []
    isEmailView = false
  } else {
    displayDrafts = filteredEmailDrafts
    isEmailView = true
  }

  // Selection handlers for email drafts
  const handleEmailDraftSelect = (draftId: number, selected: boolean) => {
    const newSelected = new Set(selectedEmailDraftIds)
    if (selected) {
      newSelected.add(draftId)
    } else {
      newSelected.delete(draftId)
    }
    setSelectedEmailDraftIds(newSelected)
    
    // If we're in navigation mode, update the navigation array and index
    if (selectedDraftsForNavigation.length > 0) {
      const updatedNavDrafts = selectedDraftsForNavigation.filter(d => newSelected.has(d.id))
      setSelectedDraftsForNavigation(updatedNavDrafts)
      
      // If current draft was unselected, move to next available or previous
      if (!selected && selectedEmailDraft?.id === draftId) {
        const currentIndexInNav = updatedNavDrafts.findIndex(d => d.id === draftId)
        if (currentIndexInNav >= 0 && currentIndexInNav < updatedNavDrafts.length) {
          // Draft still in list, update index
          setSelectedDraftsNavigationIndex(currentIndexInNav)
          setCurrentDraftIndex(currentIndexInNav)
          setSelectedEmailDraft(updatedNavDrafts[currentIndexInNav])
        } else if (updatedNavDrafts.length > 0) {
          // Draft was removed, move to first available or last
          const newIndex = Math.min(selectedDraftsNavigationIndex, updatedNavDrafts.length - 1)
          setSelectedDraftsNavigationIndex(newIndex)
          setCurrentDraftIndex(newIndex)
          setSelectedEmailDraft(updatedNavDrafts[newIndex])
        } else {
          // No more drafts selected, close overlay
          handleCloseEmailOverlay()
        }
      } else {
        // Update index if needed to stay within bounds
        const newIndex = Math.min(selectedDraftsNavigationIndex, updatedNavDrafts.length - 1)
        if (newIndex !== selectedDraftsNavigationIndex) {
          setSelectedDraftsNavigationIndex(newIndex)
          setCurrentDraftIndex(newIndex)
          if (updatedNavDrafts[newIndex]) {
            setSelectedEmailDraft(updatedNavDrafts[newIndex])
          }
        }
      }
    }
  }

  const handleEmailDraftSelectAll = (selected: boolean) => {
    if (selected) {
      const emailDraftsInPage = paginatedDrafts.filter((d): d is EmailDraft => 'subject' in d)
      setSelectedEmailDraftIds(new Set(emailDraftsInPage.map(d => d.id)))
    } else {
      setSelectedEmailDraftIds(new Set())
    }
  }

  // Selection handlers for SMS drafts
  const handleSmsDraftSelect = (draftId: number, selected: boolean) => {
    const newSelected = new Set(selectedSmsDraftIds)
    if (selected) {
      newSelected.add(draftId)
    } else {
      newSelected.delete(draftId)
    }
    setSelectedSmsDraftIds(newSelected)
    
    // If we're in navigation mode, update the navigation array and index
    if (selectedSmsDraftsForNavigation.length > 0) {
      const updatedNavDrafts = selectedSmsDraftsForNavigation.filter(d => newSelected.has(d.id))
      setSelectedSmsDraftsForNavigation(updatedNavDrafts)
      
      // If current draft was unselected, move to next available or previous
      if (!selected && selectedSmsDraft?.id === draftId) {
        const currentIndexInNav = updatedNavDrafts.findIndex(d => d.id === draftId)
        if (currentIndexInNav >= 0 && currentIndexInNav < updatedNavDrafts.length) {
          // Draft still in list, update index
          setSelectedSmsDraftsNavigationIndex(currentIndexInNav)
          setSelectedSmsDraft(updatedNavDrafts[currentIndexInNav])
        } else if (updatedNavDrafts.length > 0) {
          // Draft was removed, move to first available or last
          const newIndex = Math.min(selectedSmsDraftsNavigationIndex, updatedNavDrafts.length - 1)
          setSelectedSmsDraftsNavigationIndex(newIndex)
          setSelectedSmsDraft(updatedNavDrafts[newIndex])
        } else {
          // No more drafts selected, close overlay
          handleCloseSmsOverlay()
        }
      } else {
        // Update index if needed to stay within bounds
        const newIndex = Math.min(selectedSmsDraftsNavigationIndex, updatedNavDrafts.length - 1)
        if (newIndex !== selectedSmsDraftsNavigationIndex) {
          setSelectedSmsDraftsNavigationIndex(newIndex)
          if (updatedNavDrafts[newIndex]) {
            setSelectedSmsDraft(updatedNavDrafts[newIndex])
          }
        }
      }
    }
  }

  const handleSmsDraftSelectAll = (selected: boolean) => {
    if (selected) {
      const smsDraftsInPage = paginatedDrafts.filter((d): d is SmsDraft => 'message' in d)
      setSelectedSmsDraftIds(new Set(smsDraftsInPage.map(d => d.id)))
    } else {
      setSelectedSmsDraftIds(new Set())
    }
  }

  // Open overlay to review selected email drafts before sending
  const handleReviewEmailDraftsBeforeSend = async () => {
    if (selectedEmailDraftIds.size === 0) return

    const selectedDrafts = filteredEmailDrafts.filter(d => selectedEmailDraftIds.has(d.id))
    if (selectedDrafts.length === 0) return

    // Set up navigation through selected drafts
    setSelectedDraftsForNavigation(selectedDrafts)
    setSelectedDraftsNavigationIndex(0)
    const firstDraft = selectedDrafts[0]
    setCurrentDraftIndex(0)
    setSelectedEmailDraft(firstDraft)
    setIsEmailOverlayOpen(true)
    
    // Fetch spam check for first draft
    // TODO: Commented out spam check API for now
    // try {
    //   const spamRes = await emailGenerationApi.checkSpam({ draftId: firstDraft.id })
    //   if (spamRes.success && spamRes.data) {
    //     setEmailSpamCheckResult(spamRes.data)
    //   }
    // } catch (err) {
    //   console.error('Error fetching draft details:', err)
    // }
  }

  // Actual bulk send email drafts (executed from overlay)
  const handleBulkSendEmailDrafts = async () => {
    if (selectedEmailDraftIds.size === 0) return

    setIsBulkSending(true)
    const draftIds = Array.from(selectedEmailDraftIds)
    const results = { success: 0, failed: 0, errors: [] as string[] }

    try {
      // Send emails one by one
      for (const draftId of draftIds) {
        try {
          const res = await emailGenerationApi.sendEmailDraft(draftId)
          if (res.success && res.data) {
            results.success++
          } else {
            results.failed++
            results.errors.push(`Draft ${draftId}: ${res.error || 'Unknown error'}`)
          }
        } catch (err) {
          results.failed++
          const errorMessage = err instanceof Error ? err.message : 'Unknown error'
          // Handle spam score errors specifically
          if (errorMessage.includes('spam score') || errorMessage.includes('blocked')) {
            results.errors.push(`Draft ${draftId}: Blocked - ${errorMessage}`)
          } else {
            results.errors.push(`Draft ${draftId}: ${errorMessage}`)
          }
        }
      }

      // Show results
      if (results.failed === 0) {
        alert(`Successfully sent ${results.success} email(s)!`)
      } else {
        alert(`Sent ${results.success} email(s), ${results.failed} failed.\n\nErrors:\n${results.errors.join('\n')}`)
      }

      // Optimistically update draft state immediately (remove sent drafts)
      setEmailDrafts(prev => prev.filter(d => !selectedEmailDraftIds.has(d.id)))
      
      // Refresh drafts and clear selection
      setSelectedEmailDraftIds(new Set())
      setSelectedDraftsForNavigation([])
      setSelectedDraftsNavigationIndex(0)
      handleCloseEmailOverlay()
      fetchEmailDrafts()
    } catch (err) {
      console.error('Error in bulk send:', err)
      alert('Error sending emails: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setIsBulkSending(false)
    }
  }

  // Open overlay to review selected SMS drafts before sending
  const handleReviewSmsDraftsBeforeSend = async () => {
    if (selectedSmsDraftIds.size === 0) return

    const selectedDrafts = filteredSmsDrafts.filter(d => selectedSmsDraftIds.has(d.id))
    if (selectedDrafts.length === 0) return

    // Set up navigation through selected drafts
    setSelectedSmsDraftsForNavigation(selectedDrafts)
    setSelectedSmsDraftsNavigationIndex(0)
    const firstDraft = selectedDrafts[0]
    setSelectedSmsDraft(firstDraft)
    setIsSmsOverlayOpen(true)
  }

  // Actual bulk send SMS drafts (executed from overlay or directly)
  const handleBulkSendSmsDrafts = async () => {
    if (selectedSmsDraftIds.size === 0) return

    setIsBulkSending(true)
    const draftIds = Array.from(selectedSmsDraftIds)
    const results = { success: 0, failed: 0, errors: [] as string[] }

    try {
      // Send SMS one by one
      for (const draftId of draftIds) {
        try {
          const res = await smsGenerationApi.sendSmsDraft(draftId)
          if (res.success) {
            results.success++
          } else {
            results.failed++
            results.errors.push(`Draft ${draftId}: ${res.error || 'Unknown error'}`)
          }
        } catch (err) {
          results.failed++
          results.errors.push(`Draft ${draftId}: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
      }

      // Show results
      if (results.failed === 0) {
        alert(`Successfully sent ${results.success} SMS(s)!`)
      } else {
        alert(`Sent ${results.success} SMS(s), ${results.failed} failed.\n\nErrors:\n${results.errors.join('\n')}`)
      }

      // Optimistically update draft state immediately (remove sent drafts)
      setSmsDrafts(prev => prev.filter(d => !selectedSmsDraftIds.has(d.id)))
      
      // Refresh drafts and clear selection
      setSelectedSmsDraftIds(new Set())
      fetchSmsDrafts()
    } catch (err) {
      console.error('Error in bulk send SMS:', err)
      alert('Error sending SMS: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setIsBulkSending(false)
    }
  }

  // Open overlay to review selected drafts before sending (for combined email + SMS)
  const handleReviewAllDraftsBeforeSend = async () => {
    const totalSelected = selectedEmailDraftIds.size + selectedSmsDraftIds.size
    if (totalSelected === 0) return

    // Prioritize email drafts for review (since we have email overlay)
    // If there are email drafts, review those first
    if (selectedEmailDraftIds.size > 0) {
      await handleReviewEmailDraftsBeforeSend()
    } else if (selectedSmsDraftIds.size > 0) {
      // Only SMS drafts, open SMS overlay
      await handleReviewSmsDraftsBeforeSend()
    }
  }

  // Actual bulk send both email and SMS to same person (executed from overlay)
  const handleBulkSendToSamePerson = async () => {
    const totalSelected = selectedEmailDraftIds.size + selectedSmsDraftIds.size
    if (totalSelected === 0) return

    setIsBulkSending(true)
    const results = { 
      emailSuccess: 0, 
      emailFailed: 0, 
      smsSuccess: 0, 
      smsFailed: 0,
      errors: [] as string[] 
    }

    try {
      // Send emails
      for (const draftId of Array.from(selectedEmailDraftIds)) {
        try {
          const res = await emailGenerationApi.sendEmailDraft(draftId)
          if (res.success && res.data) {
            results.emailSuccess++
          } else {
            results.emailFailed++
            results.errors.push(`Email ${draftId}: ${res.error || 'Unknown error'}`)
          }
        } catch (err) {
          results.emailFailed++
          const errorMessage = err instanceof Error ? err.message : 'Unknown error'
          // Handle spam score errors specifically
          if (errorMessage.includes('spam score') || errorMessage.includes('blocked')) {
            results.errors.push(`Email ${draftId}: Blocked - ${errorMessage}`)
          } else {
            results.errors.push(`Email ${draftId}: ${errorMessage}`)
          }
        }
      }

      // Send SMS
      for (const draftId of Array.from(selectedSmsDraftIds)) {
        try {
          const res = await smsGenerationApi.sendSmsDraft(draftId)
          if (res.success) {
            results.smsSuccess++
          } else {
            results.smsFailed++
            results.errors.push(`SMS ${draftId}: ${res.error || 'Unknown error'}`)
          }
        } catch (err) {
          results.smsFailed++
          results.errors.push(`SMS ${draftId}: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
      }

      // Show results
      const allSuccess = results.emailFailed === 0 && results.smsFailed === 0
      if (allSuccess) {
        setSuccessMessage(`Successfully sent ${results.emailSuccess} email(s) and ${results.smsSuccess} SMS(s)!`)
        setTimeout(() => setSuccessMessage(null), 5000)
      } else {
        setErrorMessage(
          `Sent ${results.emailSuccess} email(s) (${results.emailFailed} failed) and ${results.smsSuccess} SMS(s) (${results.smsFailed} failed).\n\nErrors:\n${results.errors.join('\n')}`
        )
        setTimeout(() => setErrorMessage(null), 8000)
      }

      // Optimistically update draft state immediately (remove sent drafts)
      setEmailDrafts(prev => prev.filter(d => !selectedEmailDraftIds.has(d.id)))
      setSmsDrafts(prev => prev.filter(d => !selectedSmsDraftIds.has(d.id)))
      
      // Refresh drafts and clear selection
      setSelectedEmailDraftIds(new Set())
      setSelectedSmsDraftIds(new Set())
      setSelectedDraftsForNavigation([])
      setSelectedDraftsNavigationIndex(0)
      handleCloseEmailOverlay()
      fetchEmailDrafts()
      fetchSmsDrafts()
    } catch (err) {
      console.error('Error in bulk send:', err)
      setErrorMessage('Error sending messages: ' + (err instanceof Error ? err.message : 'Unknown error'))
      setTimeout(() => setErrorMessage(null), 5000)
    } finally {
      setIsBulkSending(false)
    }
  }

  // Pagination logic
  const totalDrafts = showCombinedView ? combinedDrafts.length : displayDrafts.length
  const totalPages = Math.ceil(totalDrafts / itemsPerPage)
  
  // Ensure current page is valid after filtering
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages)
    } else if (currentPage > 0 && totalPages === 0) {
      setCurrentPage(1)
    }
  }, [totalPages, currentPage])

  const paginatedDrafts = displayDrafts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // isEmailView is now determined above

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Reset to page 1 when filters change, tab changes, or view changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, dateRange, activeTab, activeView])

  const hasSelection = selectedEmailDraftIds.size > 0 || selectedSmsDraftIds.size > 0
  const hasBothSelected = selectedEmailDraftIds.size > 0 && selectedSmsDraftIds.size > 0
  const totalSelected = selectedEmailDraftIds.size + selectedSmsDraftIds.size

  return (
    <AuthGuard>
      <div className="flex min-h-[calc(100vh-64px)] bg-gray-50">
        {/* Sidebar */}
        <DraftsSidebar
          isCollapsed={isSidebarCollapsed}
          activeView={activeView}
          activeTab={activeTab}
          onViewChange={handleViewChange}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          allDraftsCount={allDraftsCount}
          emailDraftCount={emailDraftCount}
          smsDraftCount={smsDraftCount}
          starredCount={starredCount}
          queuedCount={queuedCount}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 px-8 py-3 min-h-[60px]">
              {/* Logo/Title */}
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-gray-900">
                  {activeView === 'all'
                    ? 'All Drafts'
                    : activeView === 'email'
                      ? 'Email Drafts'
                      : activeView === 'sms'
                        ? 'SMS Drafts'
                        : activeView === 'starred'
                          ? 'Starred Drafts'
                            : activeView === 'queued'
                              ? 'Scheduled Emails'
                            : 'Drafts'}
                </h1>
              </div>
              
              {/* Search Bar */}
              <div className="flex-1 flex items-center gap-3 ml-4">
                <div className="flex-1 relative max-w-2xl">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search drafts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                  <button
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    title="Show search options"
                  >
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                  </button>
                </div>
                
                {/* Date Range Filter Dropdown */}
                {activeView !== 'queued' && (
                  <DraftStatusFilter
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                  />
                )}
              </div>
            </div>

            </div>

          {/* Bulk Action Toolbar */}
          {hasSelection && (
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-700 font-medium">
                  {totalSelected} selected
                  {hasBothSelected && (
                    <span className="ml-2 text-xs text-gray-500">
                      ({selectedEmailDraftIds.size} email, {selectedSmsDraftIds.size} SMS)
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  {showCombinedView && hasBothSelected ? (
                     // Show combined send option when both types are selected
                     <Button
                       variant="primary"
                       size="sm"
                       onClick={handleReviewAllDraftsBeforeSend}
                       isLoading={isBulkSending}
                       disabled={isBulkSending}
                       leftIcon={
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                         </svg>
                       }
                     >
                       Review & Send All ({totalSelected})
                     </Button>
                   ) : (
                     <>
                       {selectedEmailDraftIds.size > 0 && (
                         <>
                         <Button
                           variant="primary"
                           size="sm"
                           onClick={handleReviewEmailDraftsBeforeSend}
                           isLoading={isBulkSending}
                           disabled={isBulkSending}
                           leftIcon={
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                             </svg>
                           }
                         >
                           Review & Send Email ({selectedEmailDraftIds.size})
                         </Button>
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => setIsScheduleModalOpen(true)}
                             className="text-indigo-700 border-indigo-300 hover:bg-indigo-50"
                             leftIcon={
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                               </svg>
                             }
                           >
                             Schedule Email ({selectedEmailDraftIds.size})
                           </Button>
                         </>
                       )}
                       {selectedSmsDraftIds.size > 0 && (
                         <Button
                           variant="primary"
                           size="sm"
                           onClick={handleReviewSmsDraftsBeforeSend}
                           isLoading={isBulkSending}
                           disabled={isBulkSending}
                           leftIcon={
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                             </svg>
                           }
                         >
                           Send SMS ({selectedSmsDraftIds.size})
                         </Button>
                       )}
                     </>
                   )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedEmailDraftIds(new Set())
                      setSelectedSmsDraftIds(new Set())
                    }}
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto bg-white [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="px-4 py-4">
              {activeView === ('queued' as DraftViewType) ? (
                <div className="space-y-4">
                  {isLoadingQueued ? (
                    <div className="relative space-y-0">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="relative flex items-start gap-4 pb-8">
                          {/* Timeline circle skeleton */}
                          <div className="flex flex-col items-center flex-shrink-0">
                            <div className="relative z-10 w-12 h-12 rounded-full bg-gray-200 animate-pulse border-4 border-white"></div>
                            {i < 3 && (
                              <div className="absolute top-12 left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-gray-200"></div>
                            )}
                          </div>
                          {/* Content card skeleton */}
                          <div className="flex-1 min-w-0">
                            <div className="rounded-xl border-2 border-gray-200 bg-white p-5 animate-pulse">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 space-y-3">
                                  <div className="h-5 w-48 bg-gray-200 rounded"></div>
                                  <div className="h-4 w-64 bg-gray-200 rounded"></div>
                                  <div className="h-3 w-32 bg-gray-200 rounded"></div>
                                </div>
                                <div className="flex gap-2">
                                  <div className="h-8 w-20 bg-gray-200 rounded"></div>
                                  <div className="h-8 w-16 bg-gray-200 rounded"></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (() => {
                    // Group emails by batch (emails scheduled within 24 hours of each other)
                    const now = new Date()
                    const allQueuedEmails = queuedEmails.sort((a, b) => 
                      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
                    )
                    
                    // Group emails into batches (within 24 hours of each other)
                    const batches: typeof allQueuedEmails[] = []
                    let currentBatch: typeof allQueuedEmails = []
                    
                    for (let i = 0; i < allQueuedEmails.length; i++) {
                      const email = allQueuedEmails[i]
                      const emailTime = new Date(email.scheduledAt).getTime()
                      
                      if (currentBatch.length === 0) {
                        currentBatch.push(email)
                      } else {
                        const lastEmailTime = new Date(currentBatch[currentBatch.length - 1].scheduledAt).getTime()
                        const timeDiff = emailTime - lastEmailTime
                        const hoursDiff = timeDiff / (1000 * 60 * 60)
                        
                        // If within 24 hours, add to current batch
                        if (hoursDiff <= 24) {
                          currentBatch.push(email)
                        } else {
                          // Start new batch
                          batches.push(currentBatch)
                          currentBatch = [email]
                        }
                      }
                    }
                    if (currentBatch.length > 0) {
                      batches.push(currentBatch)
                    }
                    
                    // Find the active batch (most recent batch with pending emails)
                    let activeBatch: typeof allQueuedEmails = []
                    for (let i = batches.length - 1; i >= 0; i--) {
                      const batch = batches[i]
                      const hasPending = batch.some(q => 
                        q.status === 'pending' && new Date(q.scheduledAt) > now
                      )
                      if (hasPending || (i === batches.length - 1 && batch.length > 0)) {
                        activeBatch = batch
                        break
                      }
                    }
                    
                    // If no active batch found, use the most recent batch
                    if (activeBatch.length === 0 && batches.length > 0) {
                      activeBatch = batches[batches.length - 1]
                    }
                    
                    // Separate sent and pending emails in active batch
                    const sentQueuedEmails = activeBatch.filter(q => q.status === 'sent')
                    const pendingQueuedEmails = activeBatch.filter(q => 
                      q.status === 'pending' && new Date(q.scheduledAt) > now
                    )
                    
                    // For display: show ONLY pending emails (sent emails are in history page)
                    const allDisplayEmails = pendingQueuedEmails.sort((a, b) => 
                      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
                    )
                    
                    // For progress calculation: use all emails in batch (sent + pending)
                    const totalQueued = activeBatch.length
                    const sentCount = sentQueuedEmails.length
                    const pendingCount = pendingQueuedEmails.length
                    
                    // Calculate progress: sent / total (for analytics when complete)
                    const progressPercentage = totalQueued > 0 
                      ? (sentCount / totalQueued) * 100 
                      : 0
                    
                    const totalQueuedPages = Math.ceil(allDisplayEmails.length / itemsPerPage)
                    const paginatedQueuedEmails = allDisplayEmails.slice(
                      (currentPage - 1) * itemsPerPage,
                      currentPage * itemsPerPage
                    )

                    // If no pending emails, show empty state or analytics if batch is complete
                    if (allDisplayEmails.length === 0) {
                      // If batch is complete (all sent), show analytics
                      if (pendingCount === 0 && sentCount > 0 && totalQueued > 0) {
                        const sentEmails = activeBatch.filter(q => q.status === 'sent').sort((a, b) => 
                          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
                        )
                        const firstSent = new Date(sentEmails[0].scheduledAt)
                        const lastSent = new Date(sentEmails[sentEmails.length - 1].scheduledAt)
                        const timeTaken = lastSent.getTime() - firstSent.getTime()
                        const hours = Math.floor(timeTaken / (1000 * 60 * 60))
                        const minutes = Math.floor((timeTaken % (1000 * 60 * 60)) / (1000 * 60))
                        const timeTakenStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
                        
                        return (
                          <>
                            {/* Show analytics for completed batch */}
                            {totalQueued > 0 && (
                              <GamifiedQueueProgress
                                sentCount={sentCount}
                                totalQueued={totalQueued}
                                pendingCount={0}
                                progressPercentage={100}
                                queuedEmails={activeBatch}
                                countdown={0}
                              />
                            )}
                            <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
                              <div className="flex flex-col items-center justify-center space-y-3">
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                                  <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-700 mb-1">
                                    All emails sent
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    View sent emails in the History section.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </>
                        )
                      }
                      
                      // No emails at all
                      return (
                        <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
                          <div className="flex flex-col items-center justify-center space-y-3">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                              <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-700 mb-1">
                                No scheduled emails
                              </p>
                              <p className="text-xs text-gray-500">
                                Emails scheduled for later sending will appear here.
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    }

                    return (
                      <>
                        {/* Schedule Progress - Show if there are any emails in active batch */}
                        {totalQueued > 0 && (() => {
                          // Calculate next email time (first pending email, or null if all sent)
                          const nextEmail = pendingQueuedEmails.length > 0 
                            ? pendingQueuedEmails[0] 
                            : null
                          const nextEmailTime = nextEmail ? new Date(nextEmail.scheduledAt) : null
                          const now = new Date()
                          const timeUntilNext = nextEmailTime ? Math.max(0, nextEmailTime.getTime() - now.getTime()) : 0
                                    
                                    return (
                            <GamifiedQueueProgress
                              sentCount={sentCount}
                              totalQueued={totalQueued}
                              pendingCount={pendingCount}
                              progressPercentage={progressPercentage}
                              queuedEmails={activeBatch} // Show all batch emails for timeline (will be condensed)
                              countdown={timeUntilNext}
                            />
                          )
                        })()}

                        {/* Email Cards - Only pending emails (sent emails are in history) */}
                        <div className="space-y-3">
                          {paginatedQueuedEmails.map((queued) => {
                            const scheduledDate = new Date(queued.scheduledAt)
                            const timeStr = scheduledDate.toLocaleTimeString('en-US', { 
                              hour: 'numeric', 
                              minute: '2-digit',
                              hour12: true 
                            })
                            const dateStr = scheduledDate.toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            })
                            const isSent = queued.status === 'sent'
                            
                            return (
                              <div
                                key={queued.id}
                                className={`rounded-lg border bg-white p-4 hover:shadow-sm transition-all ${
                                  isSent 
                                    ? 'border-green-200 bg-green-50/30' 
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-4 flex-1 min-w-0">
                                    {/* Icon */}
                                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                                      isSent 
                                        ? 'bg-green-100' 
                                        : 'bg-indigo-100'
                                    }`}>
                                      <svg className={`w-5 h-5 ${isSent ? 'text-green-600' : 'text-indigo-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                      </svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-3 mb-1">
                                        <h4 className="text-sm font-semibold text-gray-900 truncate">
                                          {queued.emailDraft?.contactName || queued.emailDraft?.contactEmail || `Draft #${queued.emailDraftId}`}
                                        </h4>
                                        <span className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium ${
                                          isSent
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-indigo-50 text-indigo-700'
                                        }`}>
                                          {queued.status}
                                        </span>
                                      </div>
                                      {queued.emailDraft && (
                                        <p className="text-sm text-gray-600 truncate mb-1">
                                          {queued.emailDraft.subject || 'No Subject'}
                                        </p>
                                      )}
                                      <p className="text-xs text-gray-500">
                                        {timeStr} • {dateStr}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {queued.status === 'pending' && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDequeueEmail(queued.emailDraftId)}
                                        disabled={dequeuingIds.has(queued.emailDraftId)}
                                        isLoading={dequeuingIds.has(queued.emailDraftId)}
                                        className="text-orange-600 border-orange-200 hover:bg-orange-50"
                                      >
                                        Remove
                                      </Button>
                                    )}
                                    {queued.emailDraft && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleViewDraft(queued.emailDraftId, 'email')}
                                      >
                                        View
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        {/* Pagination for Scheduled Emails */}
                        {allDisplayEmails.length > 0 && (
                          <div className="flex items-center justify-between mt-4 px-4 py-3 bg-white rounded-lg border border-gray-200 mb-16">
                            <div className="text-sm text-gray-600">
                              {totalQueuedPages > 1 ? (
                                <>
                                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, allDisplayEmails.length)} of {allDisplayEmails.length} scheduled email{allDisplayEmails.length !== 1 ? 's' : ''}
                                </>
                              ) : (
                                <>
                                  Showing {allDisplayEmails.length} scheduled email{allDisplayEmails.length !== 1 ? 's' : ''}
                                </>
                              )}
                            </div>
                            {totalQueuedPages > 1 && (
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="xs"
                                  onClick={() => handlePageChange(currentPage - 1)}
                                  disabled={currentPage === 1}
                                >
                                  Previous
                                </Button>
                                <div className="flex items-center gap-1">
                                  {Array.from({ length: Math.min(totalQueuedPages, 10) }, (_, i) => {
                                    let page: number
                                    if (totalQueuedPages <= 10) {
                                      page = i + 1
                                    } else if (currentPage <= 5) {
                                      page = i + 1
                                    } else if (currentPage >= totalQueuedPages - 4) {
                                      page = totalQueuedPages - 9 + i
                                    } else {
                                      page = currentPage - 5 + i
                                    }
                                    return (
                                      <button
                                        key={page}
                                        onClick={() => handlePageChange(page)}
                                        className={`px-3 py-1 text-sm rounded transition-colors ${
                                          currentPage === page
                                            ? 'bg-indigo-600 text-white font-medium'
                                            : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                      >
                                        {page}
                                      </button>
                                    )
                                  })}
                                </div>
                                <Button
                                  variant="outline"
                                  size="xs"
                                  onClick={() => handlePageChange(currentPage + 1)}
                                  disabled={currentPage === totalQueuedPages}
                                >
                                  Next
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              ) : showCombinedView ? (
                <CombinedDraftsList
                  combinedDrafts={combinedDrafts.slice(
                    (currentPage - 1) * itemsPerPage,
                    currentPage * itemsPerPage
                  )}
                  isLoading={isLoading}
                  selectedEmailIds={selectedEmailDraftIds}
                  selectedSmsIds={selectedSmsDraftIds}
                  starredEmailIds={starredEmailDraftIds}
                  starredSmsIds={starredSmsDraftIds}
                  onEmailSelect={handleEmailDraftSelect}
                  onSmsSelect={handleSmsDraftSelect}
                  onSelectAll={(selected) => {
                    if (selected) {
                      const paginated = combinedDrafts.slice(
                        (currentPage - 1) * itemsPerPage,
                        currentPage * itemsPerPage
                      )
                      const emailIds = paginated.filter(c => c.type === 'email').map(c => c.draft.id)
                      const smsIds = paginated.filter(c => c.type === 'sms').map(c => c.draft.id)
                      setSelectedEmailDraftIds(new Set(emailIds))
                      setSelectedSmsDraftIds(new Set(smsIds))
                    } else {
                      setSelectedEmailDraftIds(new Set())
                      setSelectedSmsDraftIds(new Set())
                    }
                  }}
                  onToggleEmailStar={handleToggleEmailStar}
                  onToggleSmsStar={handleToggleSmsStar}
                  onView={(draftId, type) => {
                    handleViewDraft(draftId, type)
                  }}
                  onEdit={(draftId, type) => {
                    handleEditDraft(draftId)
                  }}
                  onSend={(draftId, type) => {
                    handleSendDraft(draftId)
                  }}
                />
              ) : isEmailView ? (
              <EmailDraftsList
                  drafts={paginatedDrafts as EmailDraft[]}
                isLoading={isLoading}
                  selectedIds={selectedEmailDraftIds}
                  starredIds={starredEmailDraftIds}
                  onSelect={handleEmailDraftSelect}
                  onSelectAll={(selected) => {
                    if (selected) {
                      setSelectedEmailDraftIds(new Set(paginatedDrafts.map(d => d.id)))
                    } else {
                      setSelectedEmailDraftIds(new Set())
                    }
                  }}
                  onToggleStar={handleToggleEmailStar}
                onView={handleViewDraft}
                onEdit={handleEditDraft}
                onSend={handleSendDraft}
              />
            ) : (
              <SmsDraftsList
                  drafts={paginatedDrafts as SmsDraft[]}
                isLoading={isLoading}
                  selectedIds={selectedSmsDraftIds}
                  starredIds={starredSmsDraftIds}
                  onSelect={handleSmsDraftSelect}
                  onSelectAll={(selected) => {
                    if (selected) {
                      setSelectedSmsDraftIds(new Set(paginatedDrafts.map(d => d.id)))
                    } else {
                      setSelectedSmsDraftIds(new Set())
                    }
                  }}
                  onToggleStar={handleToggleSmsStar}
                onView={handleViewDraft}
                onEdit={handleEditDraft}
                onSend={handleSendDraft}
              />
            )}

            {/* Pagination - Always show when there are drafts */}
              {totalDrafts > 0 && (
                <div className="flex items-center justify-between mt-4 px-4 py-3 bg-white rounded-lg border border-gray-200 mb-16">
                <div className="text-sm text-gray-600">
                  {totalPages > 1 ? (
                    <>
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalDrafts)} of {totalDrafts} drafts
                    </>
                  ) : (
                    <>
                      Showing {totalDrafts} {totalDrafts === 1 ? 'draft' : 'drafts'}
                    </>
                  )}
                </div>
                {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                        let page: number
                        if (totalPages <= 10) {
                          page = i + 1
                        } else if (currentPage <= 5) {
                          page = i + 1
                        } else if (currentPage >= totalPages - 4) {
                          page = totalPages - 9 + i
                        } else {
                          page = currentPage - 5 + i
                        }
                        return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                            className={`px-3 py-1 text-sm rounded transition-colors ${
                          currentPage === page
                                ? 'bg-indigo-600 text-white font-medium'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                        )
                      })}
                  </div>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
                )}
              </div>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Email Draft Overlay */}
      <EmailDraftOverlay
        isOpen={isEmailOverlayOpen}
        emailDraft={selectedEmailDraft}
        spamCheckResult={emailSpamCheckResult}
        onClose={handleCloseEmailOverlay}
        onEdit={handleEditEmailDraft}
        onSend={handleSendEmailDraft}
        onNext={handleNextEmailDraft}
        onPrevious={handlePreviousEmailDraft}
        hasNext={
          selectedDraftsForNavigation.length > 0
            ? selectedDraftsNavigationIndex < selectedDraftsForNavigation.length - 1
            : currentDraftIndex < filteredEmailDrafts.length - 1
        }
        hasPrevious={
          selectedDraftsForNavigation.length > 0
            ? selectedDraftsNavigationIndex > 0
            : currentDraftIndex > 0
        }
        currentIndex={
          selectedDraftsForNavigation.length > 0
            ? selectedDraftsNavigationIndex
            : currentDraftIndex
        }
        totalCount={
          selectedDraftsForNavigation.length > 0
            ? selectedDraftsForNavigation.length // Show count in navigation array for counter
            : filteredEmailDrafts.length
        }
        selectedCount={
          selectedEmailDraftIds.size + selectedSmsDraftIds.size > 0
            ? selectedEmailDraftIds.size + selectedSmsDraftIds.size // Actual selected count for Send All button
            : undefined
        }
        selectedDraftIds={
          selectedEmailDraftIds.size > 0
            ? Array.from(selectedEmailDraftIds)
            : undefined
        }
        isSelected={selectedEmailDraft ? selectedEmailDraftIds.has(selectedEmailDraft.id) : false}
        onToggleSelect={(draftId, selected) => {
          handleEmailDraftSelect(draftId, selected)
        }}
        onSendAll={async () => {
          if (selectedDraftsForNavigation.length > 0) {
            // If we have both email and SMS selected, use combined send
            if (selectedSmsDraftIds.size > 0) {
              await handleBulkSendToSamePerson()
            } else {
              // Only email drafts
              await handleBulkSendEmailDrafts()
            }
          }
        }}
        onScheduleAll={async (draftIds: number[], scheduledAt: string, clientEmailIds?: number[]) => {
          // Use the same logic as handleScheduleEmails but with provided parameters
          setIsScheduling(true)
          try {
            const response = await emailGenerationApi.scheduleBatch(
              draftIds,
              scheduledAt,
              clientEmailIds
            )

            if (response.success) {
              // Success dialog is shown in EmailDraftOverlay component
              if (activeView === 'queued' as DraftViewType) {
                fetchQueuedEmails()
              }
            } else {
              setErrorMessage('Failed to schedule emails: ' + (response.error || 'Unknown error'))
              setTimeout(() => setErrorMessage(null), 5000)
            }
          } catch (error) {
            setErrorMessage('Error scheduling emails: ' + (error instanceof Error ? error.message : 'Unknown error'))
            setTimeout(() => setErrorMessage(null), 5000)
          } finally {
            setIsScheduling(false)
          }
        }}
      onContactEmailChange={handleContactEmailChange}
      />

      {/* Bulk Schedule Email Modal */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsScheduleModalOpen(false)} />
          <div className="relative bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Schedule {selectedEmailDraftIds.size} Email{selectedEmailDraftIds.size !== 1 ? 's' : ''}
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
                  <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                    {isLoadingMailboxes ? (
                      <p className="text-sm text-gray-500">Loading mailboxes...</p>
                    ) : availableMailboxes.length === 0 ? (
                      <p className="text-sm text-gray-500">No active mailboxes available</p>
                    ) : (
                      <div className="space-y-2">
                      {availableMailboxes.map((mailbox) => {
                        const emailCount = selectedEmailDraftIds.size
                        const maxMailboxes = emailCount
                        const isAtLimit = selectedMailboxIds.length >= maxMailboxes
                        const isSelected = selectedMailboxIds.includes(mailbox.id)
                        const isDisabled = !isSelected && isAtLimit
                        
                        return (
                          <label
                            key={mailbox.id}
                            className={`flex items-center gap-2 p-2 rounded ${
                              isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-50'
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
                    {selectedEmailDraftIds.size > 0 && selectedMailboxIds.length >= selectedEmailDraftIds.size && (
                      <span className="text-orange-600 ml-1">
                        (Maximum {selectedEmailDraftIds.size} for {selectedEmailDraftIds.size} email{selectedEmailDraftIds.size !== 1 ? 's' : ''})
                      </span>
                    )}
                  </p>
                )}
                {selectedEmailDraftIds.size > 0 && selectedMailboxIds.length === 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    Select up to {selectedEmailDraftIds.size} mailbox{selectedEmailDraftIds.size !== 1 ? 'es' : ''} for {selectedEmailDraftIds.size} email{selectedEmailDraftIds.size !== 1 ? 's' : ''}
                  </p>
                )}
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
                  onClick={handleScheduleEmails}
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

      {/* SMS Draft Overlay */}
      <SmsDraftOverlay
        isOpen={isSmsOverlayOpen}
        smsDraft={selectedSmsDraft}
        onClose={handleCloseSmsOverlay}
        onEdit={handleEditSmsDraft}
        onSend={handleSendSmsDraft}
        onNext={handleNextSmsDraft}
        onPrevious={handlePreviousSmsDraft}
        hasNext={
          selectedSmsDraftsForNavigation.length > 0
            ? selectedSmsDraftsNavigationIndex < selectedSmsDraftsForNavigation.length - 1
            : selectedSmsDraft ? filteredSmsDrafts.findIndex(d => d.id === selectedSmsDraft.id) < filteredSmsDrafts.length - 1 : false
        }
        hasPrevious={
          selectedSmsDraftsForNavigation.length > 0
            ? selectedSmsDraftsNavigationIndex > 0
            : selectedSmsDraft ? filteredSmsDrafts.findIndex(d => d.id === selectedSmsDraft.id) > 0 : false
        }
        currentIndex={
          selectedSmsDraftsForNavigation.length > 0
            ? selectedSmsDraftsNavigationIndex
            : selectedSmsDraft ? filteredSmsDrafts.findIndex(d => d.id === selectedSmsDraft.id) : 0
        }
        totalCount={
          selectedSmsDraftsForNavigation.length > 0
            ? selectedSmsDraftsForNavigation.length
            : filteredSmsDrafts.length
        }
        selectedCount={
          selectedSmsDraftsForNavigation.length > 0
            ? selectedEmailDraftIds.size + selectedSmsDraftIds.size
            : undefined
        }
        isSelected={selectedSmsDraft ? selectedSmsDraftIds.has(selectedSmsDraft.id) : false}
        onToggleSelect={(draftId, selected) => {
          handleSmsDraftSelect(draftId, selected)
        }}
        onSendAll={async () => {
          if (selectedSmsDraftsForNavigation.length > 0) {
            // If we have both email and SMS selected, use combined send
            if (selectedEmailDraftIds.size > 0) {
              await handleBulkSendToSamePerson()
            } else {
              // Only SMS drafts
              await handleBulkSendSmsDrafts()
            }
          }
        }}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        onConfirm={confirmDialog.onConfirm}
        onCancel={confirmDialog.onCancel || (() => setConfirmDialog(prev => ({ ...prev, isOpen: false })))}
      />

      {/* Success Message Toast */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Message Toast */}
      {errorMessage && (
        <div className="fixed top-4 right-4 z-50 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>{errorMessage}</span>
        </div>
      )}
    </AuthGuard>
  )
}

export default function DraftsPage() {
  return (
    <Suspense fallback={
      <AuthGuard>
        <div className="flex h-[calc(100vh-64px)] bg-gray-50 overflow-hidden items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading drafts...</p>
          </div>
        </div>
      </AuthGuard>
    }>
      <DraftsPageContent />
    </Suspense>
  )
}

