'use client'

import { useEffect, useState, useCallback } from 'react'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { useAuthContext } from '@/contexts/AuthContext'
import { historyApi } from '@/api/history'
import { emailGenerationApi } from '@/api/emailGeneration'
import { smsGenerationApi } from '@/api/smsGeneration'
import type { BusinessSummary, ScrapedRecord, BulkStatusEntry } from '@/types/emailGeneration'
import type { SmsBulkStatusEntry, SMSDraft } from '@/types/smsGeneration'
import type { ScrapingHistoryItem } from '@/types/history'
import { EmailGenerationHeader } from '@/components/email-generation/EmailGenerationHeader'
import { RecordsTable } from '@/components/email-generation/RecordsTable'
import { PaginationControls } from '@/components/email-generation/PaginationControls'
import { ErrorMessage } from '@/components/email-generation/ErrorMessage'
import { EmailBodyOverlay } from '@/components/email-generation/EmailBodyOverlay'
import { SummaryModal } from '@/components/email-generation/SummaryModal'
import { useEmailGenerationState } from '@/hooks/useEmailGenerationState'
import { useEmailGenerationAPI } from '@/hooks/useEmailGenerationAPI'
import { copyToClipboard } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

export default function EmailGenerationPage() {
  const { client } = useAuthContext()
  
  // Use custom hooks
  const {
    state,
    setState,
    selectedRecord,
    isDrawerOpen,
    drawerViewMode,
    mode,
    setMode,
    emailBodyOverlay,
    setEmailBodyOverlay,
    openDrawer,
    closeDrawer,
    handlePageChange,
    handlePreviousPage,
    handleNextPage,
  } = useEmailGenerationState()

  const {
    fetchSummaryForContact,
    fetchEmailDraftIdForContact,
    fetchSMSDraftIdForContact,
  } = useEmailGenerationAPI()

  // Optimization suggestions state
  const [isLoadingOptimization, setIsLoadingOptimization] = useState(false)
  
  // Bulk selection state
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<number>>(new Set())
  const [bulkGeneratingType, setBulkGeneratingType] = useState<'summary' | 'email' | 'sms' | null>(null)
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    variant: 'danger' | 'warning' | 'info'
    onConfirm?: () => void
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info'
  })

  // Summary modal state
  const [summaryModal, setSummaryModal] = useState<{
    isOpen: boolean
    summary: BusinessSummary | null
    businessName?: string
  }>({
    isOpen: false,
    summary: null,
    businessName: undefined
  })

  const hydrateSummariesForRecords = useCallback(
    async (
      records: ScrapedRecord[],
      prefetchedSummaries?: Map<number, BusinessSummary>,
      options?: { force?: boolean }
    ) => {
      if (records.length === 0) {
        return new Map<number, BusinessSummary>()
      }

      const targetContactIds = new Set(records.map((record) => record.contactId))
      const summaryMap = new Map<number, BusinessSummary>()

      // Seed map with summaries we already have on the records
      records.forEach((record) => {
        if (record.generatedSummary) {
          summaryMap.set(record.contactId, record.generatedSummary)
        }
      })

      // Include any summaries provided explicitly (e.g., from bulk API response)
      if (prefetchedSummaries) {
        prefetchedSummaries.forEach((summary, contactId) => {
          if (targetContactIds.has(contactId) && summary) {
            summaryMap.set(contactId, summary)
          }
        })
      }

      const recordsNeedingFetch = records.filter(
        (record) =>
          targetContactIds.has(record.contactId) &&
          !summaryMap.has(record.contactId) &&
          (options?.force || record.hasSummary)
      )

      if (recordsNeedingFetch.length > 0) {
        const fetchedSummaries = await Promise.all(
          recordsNeedingFetch.map(async (record) => {
            const summary = await fetchSummaryForContact(record.contactId)
            return { contactId: record.contactId, summary }
          })
        )

        fetchedSummaries.forEach(({ contactId, summary }) => {
          if (summary) {
            summaryMap.set(contactId, summary)
          }
        })
      }

      if (summaryMap.size > 0) {
        setState((prev) => ({
          ...prev,
          scrapedRecords: prev.scrapedRecords.map((record) => {
            if (!targetContactIds.has(record.contactId)) {
              return record
            }

            const summary = summaryMap.get(record.contactId)
            if (summary) {
              return {
                ...record,
                generatedSummary: summary,
                hasSummary: true,
                isGeneratingSummary: false,
              }
            }

            return record
          }),
        }))
      }

      return summaryMap
    },
    [fetchSummaryForContact, setState]
  )

  const applyEmailBulkStatus = useCallback((statuses: BulkStatusEntry[]) => {
    const statusMap = new Map(statuses.map((entry) => [entry.contactId, entry]))
    setState((prev) => ({
      ...prev,
      scrapedRecords: prev.scrapedRecords.map((record) => {
        const status = statusMap.get(record.contactId)
        return {
          ...record,
          hasSummary: status ? status.hasSummary : false,
          hasEmailDraft: status ? status.hasEmailDraft : false,
          emailDraftId: status?.emailDraftId ?? undefined,
        }
      }),
    }))
  }, [setState])

  const applySmsBulkStatus = useCallback((statuses: SmsBulkStatusEntry[]) => {
    const statusMap = new Map(statuses.map((entry) => [entry.contactId, entry]))
    setState((prev) => ({
      ...prev,
      scrapedRecords: prev.scrapedRecords.map((record) => {
        const status = statusMap.get(record.contactId)
        return {
          ...record,
          hasSMSDraft: status ? status.hasSmsDraft : false,
          smsDraftId: status?.smsDraftId ?? undefined,
          smsStatus: status?.smsStatus ?? undefined,
        }
      }),
    }))
  }, [setState])

  const fetchEmailBulkStatus = useCallback(async (contactIds: number[]) => {
    if (contactIds.length === 0) {
      setState((prev) => ({ ...prev, isLoadingBulkStatus: false }))
      return
    }
    setState((prev) => ({ ...prev, isLoadingBulkStatus: true }))
    try {
      const statusRes = await emailGenerationApi.getBulkStatus(contactIds)
      if (statusRes.success && statusRes.data) {
        applyEmailBulkStatus(statusRes.data)
      }
    } catch (error) {
      console.error('Error fetching email bulk status:', error)
    } finally {
      setState((prev) => ({ ...prev, isLoadingBulkStatus: false }))
    }
  }, [applyEmailBulkStatus, setState])

  const fetchSmsBulkStatus = useCallback(async (contactIds: number[]) => {
    if (contactIds.length === 0) {
      setState((prev) => ({ ...prev, isLoadingBulkStatus: false }))
      return
    }
    setState((prev) => ({ ...prev, isLoadingBulkStatus: true }))
    try {
      const statusRes = await smsGenerationApi.getBulkStatus(contactIds)
      if (statusRes.success && statusRes.data) {
        applySmsBulkStatus(statusRes.data)
      }
    } catch (error) {
      console.error('Error fetching SMS bulk status:', error)
    } finally {
      setState((prev) => ({ ...prev, isLoadingBulkStatus: false }))
    }
  }, [applySmsBulkStatus, setState])

  // Load scraped records and bulk status - refetch when page changes
  const loadData = useCallback(async () => {
    if (!client?.id) return
    
    setState(prev => ({ 
      ...prev, 
      isLoadingRecords: true, 
      isLoadingBulkStatus: true,
      error: null 
    }))
    
    try {
      // Step 1: Fetch scraping history first
      const historyRes = await historyApi.getClientScrapingHistory(client.id, {
        status: 'success', // Only get successful scrapes
        limit: state.recordsPerPage, // 8 per page
        page: state.currentPage // Pass current page for server-side pagination
      })
      
      if (historyRes.success && historyRes.data) {
        const recentActivity = historyRes.data.recentActivity || []
        
        // Convert ScrapingHistoryItem to ScrapedRecord format
        const scrapedRecords: ScrapedRecord[] = recentActivity.map((item: ScrapingHistoryItem) => ({
          id: item.id,
          contactId: item.contactId,
          businessName: item.businessName || undefined,
          website: item.website || undefined,
          email: item.email,
          state: undefined,
          zipCode: undefined,
          status: item.success ? 'scraped' : 'scrape_failed',
        }))
        
        // Store totalItems from API for pagination
        const totalItems = historyRes.data.pagination?.totalItems || 0
        
        // IMPORTANT: Set records FIRST so bulk status can update them correctly
        // This ensures applyEmailBulkStatus/applySmsBulkStatus can find the records to update
        setState(prev => ({ 
          ...prev, 
          scrapedRecords,
          totalItems, // Store for pagination
          isLoadingRecords: false,
        }))
        
        // NOW call bulk status APIs - it will update the records we just set in state
        const contactIds = scrapedRecords.map((record) => record.contactId)
        if (contactIds.length > 0) {
          // Always fetch email bulk status first to get hasSummary (needed for ACTIONS column)
          await fetchEmailBulkStatus(contactIds)
          
          // If in SMS mode, also fetch SMS bulk status to get SMS draft info
          if (mode === 'sms') {
            await fetchSmsBulkStatus(contactIds)
          }
        }
      } else {
        setState(prev => ({ 
          ...prev, 
          error: historyRes.error || 'Failed to load scraped records',
          isLoadingRecords: false,
          isLoadingBulkStatus: false
        }))
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to load scraped records',
        isLoadingRecords: false,
        isLoadingBulkStatus: false
      }))
    }
  }, [client?.id, mode, state.currentPage, state.recordsPerPage, fetchEmailBulkStatus, fetchSmsBulkStatus, setState])

  // Load data on mount and when page/mode changes
  useEffect(() => {
    loadData()
  }, [loadData])

  // Cleanup effect to restore body scroll when component unmounts
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  const handleGenerateSummary = async (recordId: number) => {
    const record = state.scrapedRecords.find(r => r.id === recordId)
    if (!record) return

    setState(prev => ({
      ...prev,
      scrapedRecords: prev.scrapedRecords.map(r => 
        r.id === recordId ? { ...r, isGeneratingSummary: true } : r
      ),
      error: null
    }))
    
      try {
        console.log('Generating summary for contactId:', record.contactId)
        const res = await emailGenerationApi.summarizeContact(record.contactId)
        console.log('Summary API response:', res)
        console.log('Response success:', res.success)
        console.log('Response data:', res.data)
        console.log('Response data type:', typeof res.data)
        console.log('Response data keys:', res.data ? Object.keys(res.data) : 'No data')
        console.log('Response data structure:', res.data)
        console.log('Full response structure:', JSON.stringify(res, null, 2))
        if (res.success && res.data) {
          // The API now returns BusinessSummary directly as res.data
          console.log('Found summary data directly in res.data:', res.data)
          
          // Check if the response has the expected BusinessSummary structure
          if (res.data && 'summaryText' in res.data) {
            setState(prev => ({
              ...prev,
              scrapedRecords: prev.scrapedRecords.map(r => 
                r.id === recordId 
                  ? { 
                      ...r, 
                      generatedSummary: res.data as BusinessSummary,
                      hasSummary: true, // Mark that summary exists
                      generatedEmail: undefined, // Reset email when new summary is generated
                      emailDraftId: undefined, // Reset email draft ID when new summary is generated
                      isGeneratingSummary: false 
                    } 
                  : r
              )
            }))
          } else {
            console.log('Response data does not contain expected BusinessSummary structure')
            setState(prev => ({
              ...prev,
              scrapedRecords: prev.scrapedRecords.map(r => 
                r.id === recordId ? { ...r, isGeneratingSummary: false } : r
              ),
              error: 'Invalid summary data structure received from server'
            }))
          }
        } else {
          setState(prev => ({
            ...prev,
            scrapedRecords: prev.scrapedRecords.map(r => 
              r.id === recordId ? { ...r, isGeneratingSummary: false } : r
            ),
            error: res.error || 'Failed to generate summary'
          }))
        }
    } catch (error) {
      console.error('Error generating summary:', error)
      setState(prev => ({
        ...prev,
        scrapedRecords: prev.scrapedRecords.map(r => 
          r.id === recordId ? { ...r, isGeneratingSummary: false } : r
        ),
        error: error instanceof Error ? error.message : 'Failed to generate summary'
      }))
    }
  }

  const handleGenerateEmail = async (recordId: number) => {
    const record = state.scrapedRecords.find(r => r.id === recordId)
    if (!record) return

    // Hydrate summary if it exists in backend but not in state
    let summaryToUse = record.generatedSummary
    if (!summaryToUse && record.hasSummary) {
      const summaryMap = await hydrateSummariesForRecords([record], undefined, { force: true })
      summaryToUse = summaryMap.get(record.contactId)
      if (!summaryToUse) {
        setState(prev => ({
          ...prev,
          scrapedRecords: prev.scrapedRecords.map(r => 
            r.id === recordId ? { ...r, isGeneratingEmail: false } : r
          ),
          error: 'Summary not found. Please generate a summary first.'
        }))
        return
      }
    }

    // Final check - ensure we have a summary
    if (!summaryToUse) {
      setState(prev => ({
        ...prev,
        scrapedRecords: prev.scrapedRecords.map(r => 
          r.id === recordId ? { ...r, isGeneratingEmail: false } : r
        ),
        error: 'Summary is required to generate email. Please generate a summary first.'
      }))
      return
    }

    setState(prev => ({
      ...prev,
      scrapedRecords: prev.scrapedRecords.map(r => 
        r.id === recordId ? { ...r, isGeneratingEmail: true } : r
      ),
      error: null
    }))
    
    try {
      if (!client?.id) throw new Error('Missing client id')
      const res = await emailGenerationApi.generateEmailDraft({
        contactId: record.contactId,
        summaryId: summaryToUse.id,
        clientEmailId: client.id,
        tone: 'pro_friendly'
      })
      
      console.log('Email generation response:', res)
      
      // Backend returns: { contactId, summaryId, emailDraftId, success }
      // The ApiClient wraps it, so we need to check both the response structure
      if (res.success) {
        // Check if response has emailDraftId in data or directly
        const data = res.data as { emailDraftId?: number; id?: number } | undefined
        const emailDraftId = data?.emailDraftId || data?.id
        if (emailDraftId) {
          setState(prev => ({
            ...prev,
            scrapedRecords: prev.scrapedRecords.map(r => 
              r.id === recordId 
                ? { 
                    ...r, 
                    emailDraftId: emailDraftId,
                    hasEmailDraft: true,
                    isGeneratingEmail: false,
                    // isCheckingSpam: true  // Start spam check loading - COMMENTED OUT
                  } 
                : r
            )
          }))

          // Automatically check spam after email generation - COMMENTED OUT
          // try {
          //   console.log('=== AUTOMATIC SPAM CHECK AFTER EMAIL GENERATION ===')
          //   const spamRes = await emailGenerationApi.checkSpam({
          //     draftId: emailDraftId
          //   })

          //   console.log('Spam check response in handleGenerateEmail:', spamRes)
            
          //   // Always reset isCheckingSpam flag, regardless of success/failure
          //   setState(prev => ({
          //     ...prev,
          //     scrapedRecords: prev.scrapedRecords.map(r => 
          //       r.id === recordId 
          //         ? { 
          //             ...r,
          //             isCheckingSpam: false,
          //             // Store spam check result if successful, otherwise keep existing or undefined
          //             ...(spamRes.success && spamRes.data ? { spamCheckResult: spamRes.data } : {})
          //           } 
          //         : r
          //     )
          //   }))

          //   // Log if spam check failed
          //   if (!spamRes.success || !spamRes.data) {
          //     console.warn('Spam check failed or returned no data:', {
          //       success: spamRes.success,
          //       error: spamRes.error,
          //       data: spamRes.data
          //     })
          //   }
          // } catch (spamError) {
          //   // If spam check fails, don't block the email - just log error
          //   console.error('Spam check failed:', spamError)
          //   setState(prev => ({
          //     ...prev,
          //     scrapedRecords: prev.scrapedRecords.map(r => 
          //       r.id === recordId ? { ...r, isCheckingSpam: false } : r
          //     )
          //   }))
          // }
        } else {
          // Response might be in the format returned directly from backend
          // Try accessing properties directly from data
          console.warn('Unexpected response structure:', res.data)
          setState(prev => ({
            ...prev,
            scrapedRecords: prev.scrapedRecords.map(r => 
              r.id === recordId ? { ...r, isGeneratingEmail: false } : r
            ),
            error: 'Email generated but could not retrieve draft ID'
          }))
        }
      } else {
        setState(prev => ({
          ...prev,
          scrapedRecords: prev.scrapedRecords.map(r => 
            r.id === recordId ? { ...r, isGeneratingEmail: false } : r
          ),
          error: res.error || 'Failed to generate email'
        }))
      }
    } catch (error) {
      console.error('Error generating email:', error)
      setState(prev => ({
        ...prev,
        scrapedRecords: prev.scrapedRecords.map(r => 
          r.id === recordId ? { ...r, isGeneratingEmail: false } : r
        ),
        error: error instanceof Error ? error.message : 'Failed to generate email'
      }))
    }
  }

  const handleGenerateSMS = async (recordId: number) => {
    const record = state.scrapedRecords.find(r => r.id === recordId)
    if (!record) return

    // Hydrate summary if it exists in backend but not in state
    let summaryToUse = record.generatedSummary
    if (!summaryToUse && record.hasSummary) {
      const summaryMap = await hydrateSummariesForRecords([record], undefined, { force: true })
      summaryToUse = summaryMap.get(record.contactId)
      if (!summaryToUse) {
        setState(prev => ({
          ...prev,
          scrapedRecords: prev.scrapedRecords.map(r => 
            r.id === recordId ? { ...r, isGeneratingSMS: false } : r
          ),
          error: 'Summary not found. Please generate a summary first.'
        }))
        return
      }
    }

    // Final check - ensure we have a summary
    if (!summaryToUse) {
      setState(prev => ({
        ...prev,
        scrapedRecords: prev.scrapedRecords.map(r => 
          r.id === recordId ? { ...r, isGeneratingSMS: false } : r
        ),
        error: 'Summary is required to generate SMS. Please generate a summary first.'
      }))
      return
    }

    setState(prev => ({
      ...prev,
      scrapedRecords: prev.scrapedRecords.map(r => 
        r.id === recordId ? { ...r, isGeneratingSMS: true } : r
      ),
      error: null
    }))
    
    try {
      if (!client?.id) throw new Error('Missing client id')
      const res = await smsGenerationApi.generateSmsDraft(
        record.contactId, 
        summaryToUse.id,
        client.id  // Use client.id like email does with clientEmailId
      )
      
      console.log('SMS generation response:', res)
      
      // Backend returns: { contactId, summaryId, smsDraftId, success }
      // The ApiClient wraps it, so we need to check both the response structure
      if (res.success) {
        // Check if response has smsDraftId in data or directly
        type SmsGenerationData = { smsDraftId?: number; id?: number; clientSmsId?: number; status?: string } | SMSDraft | undefined
        const data = res.data as SmsGenerationData
        const smsDraftId = (data && typeof data === 'object' && 'smsDraftId' in data ? data.smsDraftId : undefined) || 
                          (data && typeof data === 'object' && 'id' in data ? data.id : undefined) || 
                          (data && 'id' in data ? (data as SMSDraft).id : undefined)
        const extractedClientSmsId = (data && typeof data === 'object' && 'clientSmsId' in data ? data.clientSmsId : undefined) || 
                                     (data && 'clientSms' in data ? (data as SMSDraft).clientSms?.id : undefined)
        
        // Store clientSmsId in localStorage if we have it
        if (extractedClientSmsId) {
          localStorage.setItem('clientSmsId', extractedClientSmsId.toString())
        }
        
        if (smsDraftId) {
          const status = (data && typeof data === 'object' && 'status' in data ? data.status : undefined) || 
                       (data && 'status' in data ? (data as SMSDraft).status : undefined) || 
                       'draft'
          setState(prev => ({
            ...prev,
            scrapedRecords: prev.scrapedRecords.map(r => 
              r.id === recordId 
                ? { 
                    ...r, 
                    smsDraftId: smsDraftId,
                    smsStatus: status,
                    hasSMSDraft: true,
                    isGeneratingSMS: false 
                  } 
                : r
            )
          }))
        } else {
          // Response might be in the format returned directly from backend
          // Try accessing properties directly from data
          console.warn('Unexpected response structure:', res.data)
          setState(prev => ({
            ...prev,
            scrapedRecords: prev.scrapedRecords.map(r => 
              r.id === recordId ? { ...r, isGeneratingSMS: false } : r
            ),
            error: 'SMS generated but could not retrieve draft ID'
          }))
        }
      } else {
        setState(prev => ({
          ...prev,
          scrapedRecords: prev.scrapedRecords.map(r => 
            r.id === recordId ? { ...r, isGeneratingSMS: false } : r
          ),
          error: res.error || 'Failed to generate SMS'
        }))
      }
    } catch (error) {
      console.error('Error generating SMS:', error)
      setState(prev => ({
        ...prev,
        scrapedRecords: prev.scrapedRecords.map(r => 
          r.id === recordId ? { ...r, isGeneratingSMS: false } : r
        ),
        error: error instanceof Error ? error.message : 'Failed to generate SMS'
      }))
    }
  }

  const handleSendEmail = async (recordId: number) => {
    const record = state.scrapedRecords.find(r => r.id === recordId)
    if (!record || !record.emailDraftId) {
      setState(prev => ({ ...prev, error: 'Email draft not found. Please generate an email first.' }))
      return
    }

    setState(prev => ({
      ...prev,
      scrapedRecords: prev.scrapedRecords.map(r => 
        r.id === recordId ? { ...r, isSendingEmail: true } : r
      ),
      error: null
    }))
    
    try {
      const res = await emailGenerationApi.sendEmailDraft(record.emailDraftId)
      if (res.success) {
        setState(prev => ({
          ...prev,
          scrapedRecords: prev.scrapedRecords.map(r => 
            r.id === recordId ? { ...r, isSendingEmail: false } : r
          )
        }))
        // You could add a success notification here
        alert('Email sent successfully!')
      } else {
        setState(prev => ({
          ...prev,
          scrapedRecords: prev.scrapedRecords.map(r => 
            r.id === recordId ? { ...r, isSendingEmail: false } : r
          ),
          error: res.error || 'Failed to send email'
        }))
      }
    } catch (error) {
      console.error('Error sending email:', error)
      setState(prev => ({
        ...prev,
        scrapedRecords: prev.scrapedRecords.map(r => 
          r.id === recordId ? { ...r, isSendingEmail: false } : r
        ),
        error: error instanceof Error ? error.message : 'Failed to send email'
      }))
    }
  }

  const handleSendSMS = async (recordId: number) => {
    const record = state.scrapedRecords.find(r => r.id === recordId)
    if (!record || !record.smsDraftId) {
      setState(prev => ({ ...prev, error: 'SMS draft not found. Please generate an SMS first.' }))
      return
    }

    setState(prev => ({
      ...prev,
      scrapedRecords: prev.scrapedRecords.map(r => 
        r.id === recordId ? { ...r, isSendingSMS: true } : r
      ),
      error: null
    }))
    
    try {
      const res = await smsGenerationApi.sendSmsDraft(record.smsDraftId)
      if (res.success) {
        setState(prev => ({
          ...prev,
          scrapedRecords: prev.scrapedRecords.map(r => 
            r.id === recordId ? { ...r, isSendingSMS: false, smsStatus: 'sent' } : r
          )
        }))
        // You could add a success notification here
        alert('SMS sent successfully!')
      } else {
        setState(prev => ({
          ...prev,
          scrapedRecords: prev.scrapedRecords.map(r => 
            r.id === recordId ? { ...r, isSendingSMS: false, smsStatus: 'failed' } : r
          ),
          error: res.error || 'Failed to send SMS'
        }))
      }
    } catch (error) {
      console.error('Error sending SMS:', error)
      setState(prev => ({
        ...prev,
        scrapedRecords: prev.scrapedRecords.map(r => 
          r.id === recordId ? { ...r, isSendingSMS: false, smsStatus: 'failed' } : r
        ),
        error: error instanceof Error ? error.message : 'Failed to send SMS'
      }))
    }
  }

  // Handler to get optimization suggestions
  const handleGetOptimizationSuggestions = async () => {
    if (!emailBodyOverlay) {
      console.error('No email overlay available for optimization')
      return
    }

    setIsLoadingOptimization(true)
    try {
      console.log('=== CALLING OPTIMIZATION API ===')
      
              // Build the DTO - use draftId if available, otherwise use content and subjectLine
        const dto: { draftId?: number; content?: string; subjectLine?: string } = emailBodyOverlay.emailDraftId
          ? {
              draftId: emailBodyOverlay.emailDraftId,
              ...(emailBodyOverlay.subject && { subjectLine: emailBodyOverlay.subject })
            }
          : {
              content: emailBodyOverlay.body,
              subjectLine: emailBodyOverlay.subject
            }
        
        if (emailBodyOverlay.emailDraftId) {
          console.log('Using Draft ID:', dto.draftId, 'with subjectLine:', dto.subjectLine)
        } else {
          console.log('Using content and subjectLine directly')
        }
      
      const res = await emailGenerationApi.getOptimizationSuggestions(dto)

      if (res.success && res.data) {
        setEmailBodyOverlay({
          ...emailBodyOverlay,
          optimizationSuggestions: res.data
        })
        console.log('Optimization suggestions loaded:', res.data)
      } else {
        alert('Failed to get optimization suggestions: ' + (res.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error getting optimization suggestions:', error)
      alert('Error getting optimization suggestions: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsLoadingOptimization(false)
    }
  }

  // Handler to accept optimized content
  const handleAcceptOptimizedContent = async () => {
    if (!emailBodyOverlay?.emailDraftId || !emailBodyOverlay?.optimizationSuggestions?.optimizedContent) {
      console.error('Missing email draft ID or optimized content')
      return
    }
  }

  // Handler to view email body (fetches email draft ONLY when View Body button is clicked)
  const handleViewEmailBody = async (recordId: number) => {
    const record = state.scrapedRecords.find(r => r.id === recordId)
    if (!record) return

    // If email is already loaded, just show it
    if (record.generatedEmail) {
      setEmailBodyOverlay({
        isOpen: true,
        subject: record.generatedEmail.subject,
        body: record.generatedEmail.body,
        emailDraftId: record.emailDraftId,
        spamCheckResult: record.spamCheckResult
      })
      return
    }

    // Set loading state
    setState(prev => ({
      ...prev,
      scrapedRecords: prev.scrapedRecords.map(r => 
        r.id === recordId ? { ...r, isLoadingEmailDraft: true } : r
      )
    }))

    try {
      let draftId = record.emailDraftId

      // If we don't have emailDraftId, fetch it first
      if (!draftId) {
        const fetchedDraftId = await fetchEmailDraftIdForContact(record.contactId)
        
        if (!fetchedDraftId) {
          setState(prev => ({
            ...prev,
            scrapedRecords: prev.scrapedRecords.map(r => 
              r.id === recordId ? { ...r, isLoadingEmailDraft: false } : r
            ),
            error: 'No email draft found for this contact'
          }))
          return
        }

        draftId = fetchedDraftId

        // Update record with emailDraftId
        setState(prev => ({
          ...prev,
          scrapedRecords: prev.scrapedRecords.map(r => 
            r.id === recordId ? { ...r, emailDraftId: draftId } : r
          )
        }))
      }

      // Now fetch the email draft content
      console.log('=== FETCHING EMAIL DRAFT ===')
      console.log('Draft ID:', draftId)
      const res = await emailGenerationApi.getEmailDraft(draftId)
      console.log('=== EMAIL DRAFT API RESPONSE ===')
      console.log('Full response:', JSON.stringify(res, null, 2))
      console.log('Response success:', res.success)
      console.log('Response data:', res.data)
      console.log('Response error:', res.error)
      
      if (res.success && res.data) {
        const emailDraft = res.data
        
        // Update record with fetched email data
        const updatedRecord = {
          ...record,
          emailDraftId: draftId,
          generatedEmail: {
            subject: emailDraft.subjectLines?.[0] || emailDraft.subjectLine || emailDraft.subject || 'No Subject',
            body: emailDraft.bodyText || emailDraft.body || '',
            personalization: {
              businessName: record.businessName || 'Your Company',
              industry: record.generatedSummary?.industry || 'Your Industry',
              keyFeatures: record.generatedSummary?.keyFeatures || []
            },
            tone: (emailDraft.tone === 'friendly' || emailDraft.tone === 'persuasive') 
              ? emailDraft.tone 
              : 'professional' as 'professional' | 'friendly' | 'persuasive',
            callToAction: 'Review and send',
            generatedAt: emailDraft.createdAt || new Date().toISOString()
          },
          hasEmailDraft: true,
          isLoadingEmailDraft: false
        }
        
        // Update state
        setState(prev => ({
          ...prev,
          scrapedRecords: prev.scrapedRecords.map(r => 
            r.id === recordId ? updatedRecord : r
          )
        }))
        
        // Check if we need to fetch spam check result - COMMENTED OUT
        const spamCheckResult = updatedRecord.spamCheckResult
        
        // If spam check result doesn't exist, fetch it - COMMENTED OUT
        // if (!spamCheckResult && draftId) {
        //   console.log('=== FETCHING SPAM CHECK RESULT IN handleViewEmailBody ===')
        //   console.log('Draft ID for spam check:', draftId)
          
        //   try {
        //     setState(prev => ({
        //       ...prev,
        //       scrapedRecords: prev.scrapedRecords.map(r => 
        //         r.id === recordId ? { ...r, isCheckingSpam: true } : r
        //       )
        //     }))
            
        //     const spamRes = await emailGenerationApi.checkSpam({
        //       draftId: draftId
        //     })
            
        //     console.log('=== SPAM CHECK RESULT IN handleViewEmailBody ===')
        //     console.log('Spam check response:', JSON.stringify(spamRes, null, 2))
            
        //     if (spamRes.success && spamRes.data) {
        //       spamCheckResult = spamRes.data
              
        //       // Update state with spam check result
        //       setState(prev => ({
        //         ...prev,
        //         scrapedRecords: prev.scrapedRecords.map(r => 
        //           r.id === recordId 
        //             ? { ...r, spamCheckResult: spamCheckResult, isCheckingSpam: false } 
        //             : r
        //         )
        //       }))
        //     } else {
        //       console.warn('Spam check failed or returned no data:', spamRes.error)
        //       setState(prev => ({
        //         ...prev,
        //         scrapedRecords: prev.scrapedRecords.map(r => 
        //           r.id === recordId ? { ...r, isCheckingSpam: false } : r
        //         )
        //       }))
        //     }
        //   } catch (spamError) {
        //     console.error('Error fetching spam check result:', spamError)
        //     setState(prev => ({
        //       ...prev,
        //       scrapedRecords: prev.scrapedRecords.map(r => 
        //         r.id === recordId ? { ...r, isCheckingSpam: false } : r
        //       )
        //     }))
        //   }
        // }
        
                  // Show email in overlay with spam check result
          setEmailBodyOverlay({
            isOpen: true,
            subject: updatedRecord.generatedEmail.subject,
            body: updatedRecord.generatedEmail.body,
            emailDraftId: draftId,
            spamCheckResult: spamCheckResult
          })
      } else {
        setState(prev => ({
          ...prev,
          scrapedRecords: prev.scrapedRecords.map(r => 
            r.id === recordId ? { ...r, isLoadingEmailDraft: false } : r
          ),
          error: res.error || 'Failed to fetch email draft'
        }))
      }
    } catch (error) {
      console.error('Error fetching email draft:', error)
      setState(prev => ({
        ...prev,
        scrapedRecords: prev.scrapedRecords.map(r => 
          r.id === recordId ? { ...r, isLoadingEmailDraft: false } : r
        ),
        error: error instanceof Error ? error.message : 'Failed to fetch email draft'
      }))
    }
  }

  // handleViewEmail removed - functionality covered by handleViewEmailBody

  // Handler to view SMS body (fetches SMS draft ONLY when View SMS button is clicked)
  const handleViewSMSBody = async (recordId: number) => {
    const record = state.scrapedRecords.find(r => r.id === recordId)
    if (!record) return

    // If SMS is already loaded, just show it
    if (record.generatedSMS) {
      setEmailBodyOverlay({
        isOpen: true,
        subject: record.generatedSMS.subject,
        body: record.generatedSMS.body,
        smsDraftId: record.smsDraftId,
        isEditMode: false
      })
      return
    }

    // Set loading state
    setState(prev => ({
      ...prev,
      scrapedRecords: prev.scrapedRecords.map(r => 
        r.id === recordId ? { ...r, isLoadingSMSDraft: true } : r
      )
    }))

    try {
      let draftId = record.smsDraftId

      // If we don't have smsDraftId, fetch it first
      if (!draftId) {
        const fetchedDraftId = await fetchSMSDraftIdForContact(record.contactId)
        
        if (!fetchedDraftId) {
          setState(prev => ({
            ...prev,
            scrapedRecords: prev.scrapedRecords.map(r => 
              r.id === recordId ? { ...r, isLoadingSMSDraft: false } : r
            ),
            error: 'No SMS draft found for this contact'
          }))
          return
        }

        draftId = fetchedDraftId

        // Update record with smsDraftId
        setState(prev => ({
          ...prev,
          scrapedRecords: prev.scrapedRecords.map(r => 
            r.id === recordId ? { ...r, smsDraftId: draftId } : r
          )
        }))
      }

      // Now fetch the SMS draft content
      const res = await smsGenerationApi.getSmsDraft(draftId)
      if (res.success && res.data) {
        const smsDraft = res.data
        
        // Store clientSmsId from the draft if available
        if (smsDraft.clientSms?.id) {
          localStorage.setItem('clientSmsId', smsDraft.clientSms.id.toString())
        }
        
        // Don't update smsStatus when just viewing - preserve existing status
        // Status should only be updated when SMS is actually sent (in handleSendSMS)
        // This prevents the UI from incorrectly showing "SMS Sent" when just viewing
        
        // Update record with fetched SMS data
        const updatedRecord = {
          ...record,
          smsDraftId: draftId,
          generatedSMS: {
            subject: 'SMS Message', // SMS doesn't have subject, use generic title
            body: smsDraft.messageText || smsDraft.message || '',
            personalization: {
              businessName: record.businessName || 'Your Company',
              industry: record.generatedSummary?.industry || 'Your Industry',
              keyFeatures: record.generatedSummary?.keyFeatures || []
            },
            tone: 'professional' as 'professional' | 'friendly' | 'persuasive',
            callToAction: 'Review and send',
            generatedAt: smsDraft.createdAt || new Date().toISOString()
          },
          // Preserve existing smsStatus - don't update from draft status when viewing
          // Only handleSendSMS should update this status
          smsStatus: record.smsStatus, // Keep existing status, don't overwrite
          hasSMSDraft: true,
          isLoadingSMSDraft: false
        }
        
        // Update state
        setState(prev => ({
          ...prev,
          scrapedRecords: prev.scrapedRecords.map(r => 
            r.id === recordId ? updatedRecord : r
          )
        }))
        
        // Show SMS in overlay
        setEmailBodyOverlay({
          isOpen: true,
          subject: updatedRecord.generatedSMS.subject,
          body: updatedRecord.generatedSMS.body,
          smsDraftId: draftId,
          isEditMode: false
        })
      } else {
        setState(prev => ({
          ...prev,
          scrapedRecords: prev.scrapedRecords.map(r => 
            r.id === recordId ? { ...r, isLoadingSMSDraft: false } : r
          ),
          error: res.error || 'Failed to fetch SMS draft'
        }))
      }
    } catch (error) {
      console.error('Error fetching SMS draft:', error)
      setState(prev => ({
        ...prev,
        scrapedRecords: prev.scrapedRecords.map(r => 
          r.id === recordId ? { ...r, isLoadingSMSDraft: false } : r
        ),
        error: error instanceof Error ? error.message : 'Failed to fetch SMS draft'
      }))
    }
  }

  // Helper functions (truncateBusinessName, getCurrentPageRecords) are in utils
  // Pagination handlers (handlePageChange, handlePreviousPage, handleNextPage) come from useEmailGenerationState hook
  // Drawer handlers (openDrawer, closeDrawer) come from useEmailGenerationState hook

  // Handler to view summary (fetches summary data ONLY when View button is clicked)
  const handleViewSummary = async (recordId: number) => {
    const record = state.scrapedRecords.find(r => r.id === recordId)
    if (!record) return

    // If summary is already loaded, just open modal
    if (record.generatedSummary) {
      setSummaryModal({
        isOpen: true,
        summary: record.generatedSummary,
        businessName: record.businessName
      })
      return
    }

    // Set loading state
    setState(prev => ({
      ...prev,
      scrapedRecords: prev.scrapedRecords.map(r => 
        r.id === recordId ? { ...r, isLoadingSummary: true } : r
      )
    }))

    try {
      // NOW fetch the summary (this is the ONLY place we call the API)
      const summary = await fetchSummaryForContact(record.contactId)
      if (summary) {
        // Update record with fetched summary
        const updatedRecord = {
          ...record,
          generatedSummary: summary,
          hasSummary: true,
          isLoadingSummary: false
        }
        
        setState(prev => ({
          ...prev,
          scrapedRecords: prev.scrapedRecords.map(r => 
            r.id === recordId ? updatedRecord : r
          )
        }))
        
        // Open modal with fetched summary
        setSummaryModal({
          isOpen: true,
          summary: summary,
          businessName: record.businessName
        })
      } else {
        setState(prev => ({
          ...prev,
          scrapedRecords: prev.scrapedRecords.map(r => 
            r.id === recordId ? { ...r, isLoadingSummary: false, hasSummary: false } : r
          ),
          error: 'Summary not found for this contact'
        }))
      }
    } catch (error) {
      console.error('Error fetching summary:', error)
      setState(prev => ({
        ...prev,
        scrapedRecords: prev.scrapedRecords.map(r => 
          r.id === recordId ? { ...r, isLoadingSummary: false, hasSummary: false } : r
        ),
        error: 'Failed to load summary. Summary may not exist for this contact.'
      }))
    }
  }

  // Drawer handlers are provided by useEmailGenerationState hook

  // Selection handlers
  const handleSelectRecord = (recordId: number, selected: boolean) => {
    // Don't allow selection of records that have drafts
    const record = state.scrapedRecords.find(r => r.id === recordId)
    if (record) {
      const hasDraft = mode === 'email' 
        ? (record.hasEmailDraft || record.emailDraftId)
        : (record.hasSMSDraft || record.smsDraftId)
      if (hasDraft && selected) {
        return // Prevent selection of records with drafts
      }
    }
    
    setSelectedRecordIds(prev => {
      const next = new Set(prev)
      if (selected) {
        next.add(recordId)
      } else {
        next.delete(recordId)
      }
      return next
    })
  }

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      // Server-side pagination: all records in state.scrapedRecords are the current page
      // Only select records that don't have drafts
      const selectableRecords = state.scrapedRecords.filter(r => {
        if (mode === 'email') {
          return !r.hasEmailDraft && !r.emailDraftId
        } else {
          return !r.hasSMSDraft && !r.smsDraftId
        }
      })
      setSelectedRecordIds(new Set(selectableRecords.map(r => r.id)))
    } else {
      setSelectedRecordIds(new Set())
    }
  }

  // Helper function to show confirmation/info dialog
  const showDialog = (title: string, message: string, variant: 'danger' | 'warning' | 'info' = 'info', onConfirm?: () => void) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      variant,
      onConfirm
    })
  }

  const closeDialog = () => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false }))
  }

  // Bulk generation handlers
  const handleBulkGenerateSummary = async () => {
    if (selectedRecordIds.size === 0) {
      showDialog('No Selection', 'Please select at least one contact', 'warning')
      return
    }

    setBulkGeneratingType('summary')
    const selectedRecords = state.scrapedRecords.filter(r => selectedRecordIds.has(r.id))
    // Only include contacts that don't already have summaries
    const contactIdsToProcess = selectedRecords
      .filter(r => !r.hasSummary)
      .map(r => r.contactId)

    if (contactIdsToProcess.length === 0) {
      showDialog('No Action Needed', 'All selected contacts already have summaries', 'info')
      setBulkGeneratingType(null)
      return
    }

    try {
      const res = await emailGenerationApi.bulkSummarizeContacts(contactIdsToProcess)
      
      if (res.success && res.data) {
        const { totalProcessed, successful, failed, totalTimeSeconds, estimatedTimeSeconds, results } = res.data

        const prefetchedSummaries = new Map<number, BusinessSummary>()
        results.forEach(result => {
          if (result.success && result.summary) {
            prefetchedSummaries.set(result.contactId, result.summary)
          }
        })

        const processedRecordSet = new Set(contactIdsToProcess)
        const processedRecords = state.scrapedRecords.filter(record => processedRecordSet.has(record.contactId))

        await hydrateSummariesForRecords(processedRecords, prefetchedSummaries, { force: true })

        const timeInfo = totalTimeSeconds > 0 
          ? `\n\nTime: ${Math.round(totalTimeSeconds)}s (estimated: ${Math.round(estimatedTimeSeconds)}s)`
          : ''
        
        showDialog(
          'Bulk Summary Generation Completed',
          `Bulk summary generation completed: ${successful} succeeded, ${failed} failed out of ${totalProcessed} total${timeInfo}`,
          'info'
        )
        setSelectedRecordIds(new Set())
      } else {
        showDialog('Generation Failed', 'Failed to generate summaries: ' + (res.error || 'Unknown error'), 'danger')
      }
    } catch (error) {
      console.error('Error in bulk summary generation:', error)
      showDialog('Error', 'Error generating summaries: ' + (error instanceof Error ? error.message : 'Unknown error'), 'danger')
    } finally {
      setBulkGeneratingType(null)
    }
  }

  const handleBulkGenerateEmail = async () => {
    if (selectedRecordIds.size === 0) {
      showDialog('No Selection', 'Please select at least one contact', 'warning')
      return
    }

    setBulkGeneratingType('email')
    const selectedRecords = state.scrapedRecords.filter(r => selectedRecordIds.has(r.id))
    
    if (!client?.id) {
      showDialog('Configuration Error', 'Missing client ID', 'danger')
      setBulkGeneratingType(null)
      return
    }

    const summaryMap = await hydrateSummariesForRecords(selectedRecords)

    // Build requests array for contacts that have summaries but no email drafts
    const requests = selectedRecords
      .filter(r => !r.hasEmailDraft && !r.emailDraftId)
      .map(r => {
        const summary = summaryMap.get(r.contactId)
        if (!summary) {
          return null
        }

        return {
          contactId: r.contactId,
          summaryId: summary.id,
          clientEmailId: client.id,
          tone: 'pro_friendly' as const
        }
      })
      .filter((request): request is { contactId: number; summaryId: number; clientEmailId: number; tone: 'pro_friendly' } => request !== null)

    if (requests.length === 0) {
      showDialog('No Action Needed', 'All selected contacts already have email drafts or are missing summaries', 'info')
      setBulkGeneratingType(null)
      return
    }

    try {
      const res = await emailGenerationApi.bulkGenerateEmailDrafts(requests)
      
      if (res.success && res.data) {
        const { totalProcessed, successful, failed, totalTimeSeconds, estimatedTimeSeconds, results } = res.data
        
        // Update records with generated email drafts
        const draftMap = new Map<number, number>()
        results.forEach(result => {
          if (result.success && result.emailDraftId > 0) {
            draftMap.set(result.contactId, result.emailDraftId)
          }
        })

        setState(prev => ({
          ...prev,
          scrapedRecords: prev.scrapedRecords.map(record => {
            const emailDraftId = draftMap.get(record.contactId)
            if (emailDraftId) {
              return {
                ...record,
                emailDraftId: emailDraftId,
                hasEmailDraft: true,
                isGeneratingEmail: false
              }
            }
            return record
          })
        }))

        const timeInfo = totalTimeSeconds > 0 
          ? `\n\nTime: ${Math.round(totalTimeSeconds)}s (estimated: ${Math.round(estimatedTimeSeconds)}s)`
          : ''

        showDialog(
          'Bulk Email Generation Completed',
          `Bulk email generation completed: ${successful} succeeded, ${failed} failed out of ${totalProcessed} total${timeInfo}`,
          'info'
        )
        setSelectedRecordIds(new Set())
      } else {
        showDialog('Generation Failed', 'Failed to generate emails: ' + (res.error || 'Unknown error'), 'danger')
      }
    } catch (error) {
      console.error('Error in bulk email generation:', error)
      showDialog('Error', 'Error generating emails: ' + (error instanceof Error ? error.message : 'Unknown error'), 'danger')
    } finally {
      setBulkGeneratingType(null)
    }
  }

  const handleBulkGenerateSMS = async () => {
    if (selectedRecordIds.size === 0) {
      showDialog('No Selection', 'Please select at least one contact', 'warning')
      return
    }

    setBulkGeneratingType('sms')
    const selectedRecords = state.scrapedRecords.filter(r => selectedRecordIds.has(r.id))
    
    if (!client?.id) {
      showDialog('Configuration Error', 'Missing client ID', 'danger')
      setBulkGeneratingType(null)
      return
    }

    const summaryMap = await hydrateSummariesForRecords(selectedRecords)

    // Build requests array for contacts that have summaries but no SMS drafts
    const requests = selectedRecords
      .filter(r => !r.hasSMSDraft && !r.smsDraftId)
      .map(r => {
        const summary = summaryMap.get(r.contactId)
        if (!summary) {
          return null
        }

        return {
          contactId: r.contactId,
          summaryId: summary.id,
          clientSmsId: client.id
        }
      })
      .filter((request): request is { contactId: number; summaryId: number; clientSmsId: number } => request !== null)

    if (requests.length === 0) {
      showDialog('No Action Needed', 'All selected contacts already have SMS drafts or are missing summaries', 'info')
      setBulkGeneratingType(null)
      return
    }

    try {
      const res = await smsGenerationApi.bulkGenerateSmsDrafts(requests)
      
      if (res.success && res.data) {
        const { totalProcessed, successful, failed, results } = res.data
        
        // Update records with generated SMS drafts
        const draftMap = new Map<number, number>()
        results.forEach(result => {
          if (result.success && result.smsDraftId > 0) {
            draftMap.set(result.contactId, result.smsDraftId)
          }
        })

        setState(prev => ({
          ...prev,
          scrapedRecords: prev.scrapedRecords.map(record => {
            const smsDraftId = draftMap.get(record.contactId)
            if (smsDraftId) {
              return {
                ...record,
                smsDraftId: smsDraftId,
                hasSMSDraft: true,
                isGeneratingSMS: false
              }
            }
            return record
          })
        }))

        showDialog(
          'Bulk SMS Generation Completed',
          `Bulk SMS generation completed: ${successful} succeeded, ${failed} failed out of ${totalProcessed} total`,
          'info'
        )
        setSelectedRecordIds(new Set())
      } else {
        showDialog('Generation Failed', 'Failed to generate SMS drafts: ' + (res.error || 'Unknown error'), 'danger')
      }
    } catch (error) {
      console.error('Error in bulk SMS generation:', error)
      showDialog('Error', 'Error generating SMS drafts: ' + (error instanceof Error ? error.message : 'Unknown error'), 'danger')
    } finally {
      setBulkGeneratingType(null)
    }
  }

  return (
    <AuthGuard>
      <div className="bg-gray-50 min-h-screen">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="space-y-6">
            {/* Page Header */}
            <EmailGenerationHeader mode={mode} onModeChange={setMode} />

            {/* Bulk Actions Bar */}
            {selectedRecordIds.size > 0 && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-indigo-900">
                    {selectedRecordIds.size} {selectedRecordIds.size === 1 ? 'contact' : 'contacts'} selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleBulkGenerateSummary}
                    disabled={bulkGeneratingType !== null}
                    variant="outline"
                    size="sm"
                    className="bg-white hover:bg-gray-50"
                  >
                    {bulkGeneratingType === 'summary' ? 'Generating...' : 'Generate Summaries'}
                  </Button>
                  {mode === 'email' ? (
                    <Button
                      onClick={handleBulkGenerateEmail}
                      disabled={bulkGeneratingType !== null}
                      variant="primary"
                      size="sm"
                    >
                      {bulkGeneratingType === 'email' ? 'Generating...' : 'Generate Emails'}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleBulkGenerateSMS}
                      disabled={bulkGeneratingType !== null}
                      variant="primary"
                      size="sm"
                    >
                      {bulkGeneratingType === 'sms' ? 'Generating...' : 'Generate SMS'}
                    </Button>
                  )}
                  <Button
                    onClick={() => setSelectedRecordIds(new Set())}
                    variant="outline"
                    size="sm"
                    className="bg-white hover:bg-gray-50"
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
            )}

            {/* Scraped Records Table */}
            <RecordsTable
              records={state.scrapedRecords}
              isLoading={state.isLoadingRecords}
              isLoadingBulkStatus={state.isLoadingBulkStatus}
              mode={mode}
              currentPage={state.currentPage}
              recordsPerPage={state.recordsPerPage}
              selectedRecordIds={selectedRecordIds}
              onSelectRecord={handleSelectRecord}
              onSelectAll={handleSelectAll}
              onRecordClick={() => {}} // Disabled - no longer opens drawer
              onViewSummary={handleViewSummary}
              onViewEmailBody={handleViewEmailBody}
              onViewSMSBody={handleViewSMSBody}
              onSetEmailBodyOverlay={setEmailBodyOverlay}
              onGenerateSummary={handleGenerateSummary}
              onGenerateEmail={handleGenerateEmail}
              onGenerateSMS={handleGenerateSMS}
              onSendEmail={handleSendEmail}
              onSendSMS={handleSendSMS}
            />

            {/* Pagination Controls */}
            <PaginationControls
              currentPage={state.currentPage}
              recordsCount={state.totalItems || state.scrapedRecords.length}
              recordsPerPage={state.recordsPerPage}
              onPageChange={handlePageChange}
              onPreviousPage={handlePreviousPage}
              onNextPage={handleNextPage}
            />

            {/* Error Display */}
            <ErrorMessage message={state.error} />
          </div>
        </div>
      </div>

      {/* Detail Drawer - Removed */}

              {/* Email/SMS Body Overlay */}
        {emailBodyOverlay && (
          <EmailBodyOverlay
            overlay={emailBodyOverlay}
            onClose={() => setEmailBodyOverlay(null)}
            onGetOptimizationSuggestions={handleGetOptimizationSuggestions}
            onAcceptOptimizedContent={handleAcceptOptimizedContent}
            isLoadingOptimization={isLoadingOptimization}
          onToggleEdit={() => {
            if (emailBodyOverlay.smsDraftId) {
              setEmailBodyOverlay({
                ...emailBodyOverlay,
                isEditMode: true
              })
            }
          }}
          onCancelEdit={() => {
            if (emailBodyOverlay.smsDraftId) {
              setEmailBodyOverlay({
                ...emailBodyOverlay,
                isEditMode: false
              })
            }
          }}
          onSave={async (newBody: string) => {
            if (emailBodyOverlay.smsDraftId) {
              // Update SMS draft
              try {
                const res = await smsGenerationApi.updateSmsDraft(emailBodyOverlay.smsDraftId, { messageText: newBody })
                if (res.success) {
                  // Fetch the updated SMS draft to show the latest version
                  const updatedRes = await smsGenerationApi.getSmsDraft(emailBodyOverlay.smsDraftId)
                  if (updatedRes.success && updatedRes.data) {
                    const updatedDraft = updatedRes.data
                    // Update overlay with new data and switch back to view mode
                    setEmailBodyOverlay({
                      isOpen: true,
                      subject: 'SMS Message',
                      body: updatedDraft.messageText || updatedDraft.message || '',
                      smsDraftId: emailBodyOverlay.smsDraftId,
                      isEditMode: false
                    })
                    showDialog('Success', 'SMS updated successfully!', 'info')
                  } else {
                    // If fetch fails, just close and show success
                    setEmailBodyOverlay(null)
                    showDialog('Success', 'SMS updated successfully!', 'info')
                  }
                } else {
                  showDialog('Update Failed', 'Failed to update SMS: ' + (res.error || 'Unknown error'), 'danger')
                }
              } catch (error) {
                showDialog('Error', 'Error updating SMS: ' + (error instanceof Error ? error.message : 'Unknown error'), 'danger')
              }
            }
          }}
        />
      )}

      {/* Summary Modal */}
      <SummaryModal
        isOpen={summaryModal.isOpen}
        summary={summaryModal.summary}
        businessName={summaryModal.businessName}
        onClose={() => setSummaryModal({ isOpen: false, summary: null, businessName: undefined })}
      />

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        confirmText="OK"
        cancelText={confirmDialog.variant === 'info' ? undefined : 'Cancel'}
        onConfirm={() => {
          if (confirmDialog.onConfirm) {
            confirmDialog.onConfirm()
          }
          closeDialog()
        }}
        onCancel={closeDialog}
      />
    </AuthGuard>
  )
}