'use client'

import { useState, useEffect, Suspense, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { DraftsSidebar, type DraftViewType } from '@/components/drafts/DraftsSidebar'
import { EmailDraftsList, type EmailDraft } from '@/components/drafts/EmailDraftsList'
import { SmsDraftsList, type SmsDraft } from '@/components/drafts/SmsDraftsList'
import { CombinedDraftsList } from '@/components/drafts/CombinedDraftsList'
import { EmailDraftOverlay } from '@/components/drafts/EmailDraftOverlay'
import { SmsDraftOverlay } from '@/components/drafts/SmsDraftOverlay'
import { Button } from '@/components/ui/Button'
import { emailGenerationApi } from '@/api/emailGeneration'
import { smsGenerationApi } from '@/api/smsGeneration'
import { unsubscribeApi } from '@/api/unsubscribe'
import type { EmailDraft as ApiEmailDraft } from '@/types/emailGeneration'
import type { SMSDraft } from '@/types/smsGeneration'
import type { UnsubscribeListItem } from '@/types/unsubscribe'

function DraftsPageContent() {
  const searchParams = useSearchParams()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [activeView, setActiveView] = useState<DraftViewType>('all')
  const [activeTab, setActiveTab] = useState<'email' | 'sms'>('email')
  const [emailDrafts, setEmailDrafts] = useState<EmailDraft[]>([])
  const [smsDrafts, setSmsDrafts] = useState<SmsDraft[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
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
  const [unsubscribeMap, setUnsubscribeMap] = useState<Map<number, UnsubscribeListItem>>(new Map())
  const [isUnsubscribeLoading, setIsUnsubscribeLoading] = useState(false)
  const [isUnsubscribeLoaded, setIsUnsubscribeLoaded] = useState(false)
  const [resubscribingDraftId, setResubscribingDraftId] = useState<number | null>(null)

  const getUnsubscribeInfo = useCallback(
    (contactId?: number | null) => {
      if (!contactId || Number.isNaN(contactId)) {
        return {
          isUnsubscribed: false,
          unsubscribedAt: null,
          unsubscribeReason: null,
        }
      }
      const record = unsubscribeMap.get(contactId)
      return {
        isUnsubscribed: !!record,
        unsubscribedAt: record?.unsubscribedAt ?? null,
        unsubscribeReason: record?.reason ?? null,
      }
    },
    [unsubscribeMap]
  )

  const fetchUnsubscribeList = useCallback(async (force = false) => {
    if (isUnsubscribeLoading) return
    if (!force && isUnsubscribeLoaded) return
    setIsUnsubscribeLoading(true)
    try {
      const res = await unsubscribeApi.getAllUnsubscribes()
      if (res.success && Array.isArray(res.data)) {
        const map = new Map<number, UnsubscribeListItem>()
        res.data.forEach((item) => {
          if (typeof item.contactId === 'number') {
            map.set(item.contactId, {
              ...item,
              unsubscribedAt: item.unsubscribedAt ? new Date(item.unsubscribedAt).toISOString() : null,
            })
          }
        })
        setUnsubscribeMap(map)
      } else {
        setUnsubscribeMap(new Map())
        if (res.error) {
          console.error('Error fetching unsubscribe list:', res.error)
        }
      }
    } catch (error) {
      console.error('Error fetching unsubscribe list:', error)
      setUnsubscribeMap(new Map())
    } finally {
      setIsUnsubscribeLoading(false)
      setIsUnsubscribeLoaded(true)
    }
  }, [isUnsubscribeLoading, isUnsubscribeLoaded])

  // Transform API EmailDraft to component EmailDraft
  const transformEmailDraft = (apiDraft: ApiEmailDraft): EmailDraft => {
    const unsubscribeInfo = getUnsubscribeInfo(apiDraft.contactId)
    return {
      id: apiDraft.id,
      contactId: apiDraft.contactId || 0,
      contactName: apiDraft.contact?.businessName,
      contactEmail: apiDraft.contact?.email,
      fromEmail: apiDraft.clientEmail?.emailAddress || '',
      subject: apiDraft.subjectLine || apiDraft.subject || 'No Subject',
      body: apiDraft.bodyText || apiDraft.body || '',
      status: (apiDraft.status as 'draft' | 'sent' | 'delivered') || 'draft',
      createdAt: apiDraft.createdAt || new Date().toISOString(),
      opens: undefined, // Will be populated if engagement data is included
      clicks: undefined, // Will be populated if engagement data is included
      ...unsubscribeInfo,
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
      fetchUnsubscribeList(true)
    } catch (err) {
      console.error('Error fetching email drafts:', err)
      setEmailDrafts([])
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch SMS drafts using existing API endpoint
  const fetchSmsDrafts = async () => {
    setIsLoading(true)
    try {
      // Using getAllSmsDrafts API method
      const res = await smsGenerationApi.getAllSmsDrafts()
      
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

  useEffect(() => {
    if (activeTab === 'email') {
      fetchUnsubscribeList()
    }
  }, [activeTab, fetchUnsubscribeList])

  // Fetch drafts when view/tab changes
  useEffect(() => {
     // Fetch both types when view needs both (all, starred)
    if (activeView === 'all' || activeView === 'starred') {
      fetchEmailDrafts()
      fetchSmsDrafts()
    } else if (activeView === 'email') {
      fetchEmailDrafts()
    } else if (activeView === 'sms') {
      fetchSmsDrafts()
    } else {
      // Fallback: fetch based on activeTab
      if (activeTab === 'email') {
        fetchEmailDrafts()
      } else {
        fetchSmsDrafts()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, activeView])

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

  useEffect(() => {
    setEmailDrafts((prevDrafts) => {
      let hasChanges = false
      const nextDrafts = prevDrafts.map((draft) => {
        const info = getUnsubscribeInfo(draft.contactId)
        if (
          draft.isUnsubscribed === info.isUnsubscribed &&
          draft.unsubscribedAt === info.unsubscribedAt &&
          draft.unsubscribeReason === info.unsubscribeReason
        ) {
          return draft
        }
        hasChanges = true
        return { ...draft, ...info }
      })
      return hasChanges ? nextDrafts : prevDrafts
    })

    setSelectedDraftsForNavigation((prevDrafts) => {
      if (prevDrafts.length === 0) return prevDrafts
      let hasChanges = false
      const nextDrafts = prevDrafts.map((draft) => {
        const info = getUnsubscribeInfo(draft.contactId)
        if (
          draft.isUnsubscribed === info.isUnsubscribed &&
          draft.unsubscribedAt === info.unsubscribedAt &&
          draft.unsubscribeReason === info.unsubscribeReason
        ) {
          return draft
        }
        hasChanges = true
        return { ...draft, ...info }
      })
      return hasChanges ? nextDrafts : prevDrafts
    })

    setSelectedEmailDraft((prevDraft) => {
      if (!prevDraft) return prevDraft
      const info = getUnsubscribeInfo(prevDraft.contactId)
      if (
        prevDraft.isUnsubscribed === info.isUnsubscribed &&
        prevDraft.unsubscribedAt === info.unsubscribedAt &&
        prevDraft.unsubscribeReason === info.unsubscribeReason
      ) {
        return prevDraft
      }
      return { ...prevDraft, ...info }
    })
  }, [getUnsubscribeInfo])

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
    setStatusFilter('all')
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
      // SMS view logic
      // Check if viewing from selected drafts
      const selectedDrafts = filteredSmsDrafts.filter(d => selectedSmsDraftIds.has(d.id))
      
      if (selectedDrafts.length > 0) {
        // Navigate through selected drafts
        const draftIndex = selectedDrafts.findIndex(d => d.id === draftId)
        if (draftIndex !== -1) {
          setSelectedSmsDraftsForNavigation(selectedDrafts)
          setSelectedSmsDraftsNavigationIndex(draftIndex)
          const draft = selectedDrafts[draftIndex]
          setSelectedSmsDraft(draft)
          setIsSmsOverlayOpen(true)
          return
        }
      }
      
      // Fallback to filtered drafts navigation
      const draftIndex = filteredSmsDrafts.findIndex(d => d.id === draftId)
      const draft = filteredSmsDrafts[draftIndex]
      if (draft) {
        setSelectedSmsDraft(draft)
        setIsSmsOverlayOpen(true)
      }
    }
  }

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
      const res = await emailGenerationApi.updateEmailDraft(draftId, {
        subjectLine: subject,
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
        // alert('Email draft updated successfully!')
      } else {
        alert('Failed to update email draft: ' + (res.error || 'Unknown error'))
        throw new Error(res.error || 'Failed to update email draft')
      }
    } catch (err) {
      console.error('Error updating email draft:', err)
      throw err
    }
  }

  const handleResubscribeDraft = async (draftId: number) => {
    const draft = emailDrafts.find(d => d.id === draftId)
    if (!draft || !draft.contactId) {
      alert('Draft or contact information not found.')
      return
    }

    if (!window.confirm('Resubscribe this contact to emails?')) {
      return
    }

    setResubscribingDraftId(draftId)
    try {
      const res = await unsubscribeApi.resubscribeByContact(draft.contactId)
      if (res.success && res.data) {
        alert(res.data.message || 'Contact resubscribed successfully.')
        setUnsubscribeMap(prev => {
          const next = new Map(prev)
          next.delete(draft.contactId)
          return next
        })
        const clearUnsubscribeInfo = (d: EmailDraft): EmailDraft => ({
          ...d,
          isUnsubscribed: false,
          unsubscribedAt: null,
          unsubscribeReason: null,
        })

        setEmailDrafts(prevDrafts =>
          prevDrafts.map(d => (d.id === draftId ? clearUnsubscribeInfo(d) : d))
        )
        setSelectedDraftsForNavigation(prev =>
          prev.length > 0 ? prev.map(d => (d.id === draftId ? clearUnsubscribeInfo(d) : d)) : prev
        )
        setSelectedEmailDraft(prev =>
          prev && prev.id === draftId ? clearUnsubscribeInfo(prev) : prev
        )
        fetchUnsubscribeList(true)
      } else {
        alert(res.error || 'Failed to resubscribe contact.')
      }
    } catch (err) {
      console.error('Error resubscribing contact:', err)
      alert(
        err instanceof Error
          ? err.message
          : 'An error occurred while attempting to resubscribe.'
      )
    } finally {
      setResubscribingDraftId(null)
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
          alert(`${message}\nSpam Score: ${spamScore}\nEmail Log ID: ${emailLogId || 'N/A'}`)
        } else {
          alert(message)
        }
        
        handleCloseEmailOverlay()
        // Refresh email drafts to get updated status
        fetchEmailDrafts()
      } else {
        alert('Failed to send email: ' + (res.error || 'Unknown error'))
      }
    } catch (err) {
      console.error('Error sending email:', err)
      // Handle BadRequestException with spam score details
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      if (errorMessage.includes('spam score') || errorMessage.includes('blocked')) {
        alert(`Email blocked: ${errorMessage}\nPlease optimize the content and try again.`)
      } else {
        alert('Error sending email: ' + errorMessage)
      }
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
        // alert('SMS draft updated successfully!')
      } else {
        alert('Failed to update SMS draft: ' + (res.error || 'Unknown error'))
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
      if (res.success) {
        alert('SMS sent successfully!')
        handleCloseSmsOverlay()
        // Refresh SMS drafts
        fetchSmsDrafts()
      } else {
        alert('Failed to send SMS: ' + (res.error || 'Unknown error'))
      }
    } catch (err) {
      console.error('Error sending SMS:', err)
      alert('Error sending SMS: ' + (err instanceof Error ? err.message : 'Unknown error'))
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
    
    } else if (activeView === 'not-delivered') {
      drafts = drafts.filter(d => d.status !== 'sent' && d.status !== 'delivered')
    } 

    // Filter by status filter (from dropdown)
    if (statusFilter !== 'all') {
      drafts = drafts.filter(d => d.status === statusFilter)
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
    } else if (activeView === 'not-delivered') {
      drafts = drafts.filter(d => d.status !== 'sent' && d.status !== 'delivered')
    }

    // Filter by status filter (from dropdown)
    if (statusFilter !== 'all') {
      drafts = drafts.filter(d => d.status === statusFilter)
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
  const allDraftsCount =
    emailDrafts.filter(d => d.status === 'draft').length + smsDrafts.filter(d => d.status === 'draft').length
  const emailDraftCount = emailDrafts.filter(d => d.status === 'draft').length
  const smsDraftCount = smsDrafts.filter(d => d.status === 'draft').length
  const starredCount = starredEmailDraftIds.size + starredSmsDraftIds.size
  const notDeliveredCount =
    emailDrafts.filter(d => d.status !== 'sent' && d.status !== 'delivered').length +
    smsDrafts.filter(d => d.status !== 'sent' && d.status !== 'delivered').length

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
  } else if (activeView === 'not-delivered') {
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
  } else if (activeView === 'email') {
    displayDrafts = filteredEmailDrafts
    isEmailView = true
  } else if (activeView === 'sms') {
    displayDrafts = filteredSmsDrafts
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
        alert(`Successfully sent ${results.emailSuccess} email(s) and ${results.smsSuccess} SMS(s)!`)
      } else {
        alert(
          `Sent ${results.emailSuccess} email(s) (${results.emailFailed} failed) and ${results.smsSuccess} SMS(s) (${results.smsFailed} failed).\n\nErrors:\n${results.errors.join('\n')}`
        )
      }

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
      alert('Error sending messages: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setIsBulkSending(false)
    }
  }

  // Pagination logic
  const totalDrafts = showCombinedView ? combinedDrafts.length : displayDrafts.length
  const totalPages = Math.ceil(totalDrafts / itemsPerPage)
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
  }, [searchQuery, statusFilter, activeTab, activeView])

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
          notDeliveredCount={notDeliveredCount}
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
                          : activeView === 'not-delivered'
                            ? 'Not Delivered'
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
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2.5 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="all">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="delivered">Delivered</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
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
          <div className="flex-1 overflow-y-auto bg-white">
            <div className="px-4 py-4">
              {showCombinedView ? (
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
                  subscriptionDataLoaded={isUnsubscribeLoaded}
                  onEmailResubscribe={handleResubscribeDraft}
                  resubscribingEmailDraftId={resubscribingDraftId}
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
                subscriptionDataLoaded={isUnsubscribeLoaded}
                onResubscribe={handleResubscribeDraft}
                resubscribingDraftId={resubscribingDraftId}
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
          selectedDraftsForNavigation.length > 0
            ? selectedEmailDraftIds.size + selectedSmsDraftIds.size // Actual selected count for Send All button
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
        subscriptionDataLoaded={isUnsubscribeLoaded}
        onResubscribe={handleResubscribeDraft}
        isResubscribing={
          resubscribingDraftId !== null &&
          selectedEmailDraft !== null &&
          resubscribingDraftId === selectedEmailDraft.id
        }
      />

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

