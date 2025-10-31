'use client'

import { useEffect } from 'react'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { useAuthContext } from '@/contexts/AuthContext'
import { historyApi } from '@/api/history'
import { emailGenerationApi } from '@/api/emailGeneration'
import { smsGenerationApi } from '@/api/smsGeneration'
import type { BusinessSummary, ScrapedRecord } from '@/types/emailGeneration'
import type { ScrapingHistoryItem } from '@/types/history'
import { EmailGenerationHeader } from '@/components/email-generation/EmailGenerationHeader'
import { RecordsTable } from '@/components/email-generation/RecordsTable'
import { PaginationControls } from '@/components/email-generation/PaginationControls'
import { ErrorMessage } from '@/components/email-generation/ErrorMessage'
import { EmailBodyOverlay } from '@/components/email-generation/EmailBodyOverlay'
import { useEmailGenerationState } from '@/components/email-generation/hooks/useEmailGenerationState'
import { useEmailGenerationAPI } from '@/components/email-generation/hooks/useEmailGenerationAPI'
import { copyToClipboard } from '@/components/email-generation/utils/emailGenerationUtils'
import { Button } from '@/components/ui/Button'

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

  // Load scraped records on component mount
  useEffect(() => {
    const loadScrapedRecords = async () => {
      if (!client?.id) return
      
      setState(prev => ({ ...prev, isLoadingRecords: true, error: null }))
      
      try {
        // Get client scraping history to fetch all scraped records
        const historyRes = await historyApi.getClientScrapingHistory(client.id, {
          status: 'success', // Only get successful scrapes
          limit: 100 // Get up to 100 records
        })
        
        if (historyRes.success && historyRes.data) {
          console.log('History API Response:', historyRes.data)
          console.log('Recent Activity:', historyRes.data.recentActivity)
          
          // Check if recentActivity exists and is an array
          const recentActivity = historyRes.data.recentActivity || []
          console.log('Recent Activity Length:', recentActivity.length)
          
          if (recentActivity.length === 0) {
            console.log('No recent activity found - showing empty state')
            setState(prev => ({ 
              ...prev, 
              scrapedRecords: [],
              isLoadingRecords: false 
            }))
            return
          }
          
          // Convert ScrapingHistoryItem to ScrapedRecord format
          const scrapedRecords: ScrapedRecord[] = recentActivity.map((item: ScrapingHistoryItem) => ({
            id: item.id,
            contactId: item.contactId,
            businessName: item.businessName || undefined,
            website: item.website || undefined,
            email: item.email,
            state: undefined, // Not available in history API
            zipCode: undefined, // Not available in history API
            status: item.success ? 'scraped' : 'scrape_failed',
            scrapedData: {
              id: item.id,
              contactId: item.contactId,
              method: (item.method as string) as 'direct_url' | 'email_domain' | 'business_search',
              url: item.discoveredUrl,
              pageTitle: undefined,
              metaDescription: undefined,
              extractedEmails: [], // Would need to fetch from individual contact history
              extractedPhones: [],
              homepageText: undefined,
              servicesText: undefined,
              productsText: undefined,
              contactText: undefined,
              keywords: [],
              scrapeSuccess: item.success,
              errorMessage: item.errorMessage,
              timestamp: typeof item.scrapedAt === 'string' ? item.scrapedAt : item.scrapedAt.toISOString()
            }
          }))
          
          console.log('Converted Scraped Records:', scrapedRecords)
          
          // Set records first to show them immediately
          setState(prev => ({ 
            ...prev, 
            scrapedRecords,
            isLoadingRecords: false,
          currentPage: 1 // Reset to first page when new data is loaded
        }))
        
          // Don't check summaries, email drafts, or SMS drafts on page load
          // They will be fetched only when user clicks View buttons
      } else {
        console.log('History API Error:', historyRes.error)
          setState(prev => ({ 
            ...prev, 
            error: historyRes.error || 'Failed to load scraped records',
            isLoadingRecords: false 
          }))
        }
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          error: error instanceof Error ? error.message : 'Failed to load scraped records',
          isLoadingRecords: false 
        }))
      }
    }
    
    loadScrapedRecords()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client?.id, setState])

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
    if (!record || !record.generatedSummary) return

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
        summaryId: record.generatedSummary.id,
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
                    isGeneratingEmail: false 
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
    if (!record || !record.generatedSummary) return

    setState(prev => ({
      ...prev,
      scrapedRecords: prev.scrapedRecords.map(r => 
        r.id === recordId ? { ...r, isGeneratingSMS: true } : r
      ),
      error: null
    }))
    
    try {
      const res = await smsGenerationApi.generateSmsDraft(record.contactId, record.generatedSummary.id)
      
      console.log('SMS generation response:', res)
      
      if (res.success && res.data) {
        const smsDraftId = res.data.id
        const smsDraft = res.data
        
        if (smsDraftId) {
          setState(prev => ({
            ...prev,
            scrapedRecords: prev.scrapedRecords.map(r => 
              r.id === recordId 
                ? { 
                    ...r, 
                    smsDraftId: smsDraftId,
                    smsStatus: smsDraft.status || 'draft',
                    hasSMSDraft: true,
                    isGeneratingSMS: false 
                  } 
                : r
            )
          }))
        } else {
          console.warn('SMS generated but no ID returned:', res.data)
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

  // Handler to view email body (fetches email draft ONLY when View Body button is clicked)
  const handleViewEmailBody = async (recordId: number) => {
    const record = state.scrapedRecords.find(r => r.id === recordId)
    if (!record) return

    // If email is already loaded, just show it
    if (record.generatedEmail) {
      setEmailBodyOverlay({
        isOpen: true,
        subject: record.generatedEmail.subject,
        body: record.generatedEmail.body
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
      const res = await emailGenerationApi.getEmailDraft(draftId)
      if (res.success && res.data) {
        const emailDraft = res.data
        
        // Update record with fetched email data
        const updatedRecord = {
          ...record,
          emailDraftId: draftId,
          generatedEmail: {
            subject: emailDraft.subjectLine || emailDraft.subject || 'No Subject',
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
        
        // Show email in overlay
        setEmailBodyOverlay({
          isOpen: true,
          subject: updatedRecord.generatedEmail.subject,
          body: updatedRecord.generatedEmail.body
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
          smsStatus: smsDraft.status || 'draft',
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

    // If summary is already loaded, just open drawer in summary-only mode
    if (record.generatedSummary) {
      openDrawer(record, 'summary-only')
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
        
        // Open drawer with updated record in summary-only mode
        openDrawer(updatedRecord, 'summary-only')
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

  return (
    <AuthGuard>
      <div className="bg-gray-50 min-h-screen">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="space-y-6">
            {/* Page Header */}
            <EmailGenerationHeader mode={mode} onModeChange={setMode} />

            {/* Scraped Records Table */}
            <RecordsTable
              records={state.scrapedRecords}
              isLoading={state.isLoadingRecords}
              mode={mode}
              currentPage={state.currentPage}
              recordsPerPage={state.recordsPerPage}
              onRecordClick={(record) => openDrawer(record)}
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
              recordsCount={state.scrapedRecords.length}
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

      {/* Detail Drawer */}
      {isDrawerOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop - blurred page background */}
          <div 
            className="absolute inset-0 backdrop-blur-md"
            onClick={closeDrawer}
          />
          
          {/* Drawer */}
          <div className="relative w-full max-w-5xl h-[85vh] bg-white rounded-2xl shadow-2xl border border-gray-200 transform transition-transform overflow-hidden">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 rounded-t-2xl flex-shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <span className="text-white font-semibold text-lg">
                      {selectedRecord.businessName?.[0]?.toUpperCase() || 'B'}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedRecord.businessName || 'Unknown Business'}
                    </h2>
                    <p className="text-sm text-gray-500">Contact ID: {selectedRecord.contactId}</p>
                  </div>
                </div>
                <button
                  onClick={closeDrawer}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 relative overflow-hidden">
                {/* Scroll indicator at top */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-b from-gray-200 to-transparent z-10 pointer-events-none"></div>
                
                {/* Scrollable content */}
                <div className="h-full p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  <div className="space-y-6">
                  {/* Basic Information - Only show business name in summary-only mode */}
                  {drawerViewMode === 'full' ? (
                    <>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Basic Information</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <label className="text-sm font-medium text-gray-500">Business Name</label>
                        <p className="text-sm text-gray-900 mt-1">{selectedRecord.businessName || 'N/A'}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <label className="text-sm font-medium text-gray-500">Email</label>
                        <p className="text-sm text-gray-900 mt-1">{selectedRecord.email || 'N/A'}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <label className="text-sm font-medium text-gray-500">Website</label>
                        <p className="text-sm text-gray-900 mt-1">
                          {selectedRecord.website ? (
                            <a href={selectedRecord.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800">
                              {selectedRecord.website}
                            </a>
                          ) : 'N/A'}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <label className="text-sm font-medium text-gray-500">Location</label>
                        <p className="text-sm text-gray-900 mt-1">
                          {selectedRecord.state || 'N/A'} {selectedRecord.zipCode ? `(${selectedRecord.zipCode})` : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Scraping Details */}
                  {selectedRecord.scrapedData && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Scraping Details</h3>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <label className="text-sm font-medium text-gray-500">Method</label>
                          <p className="text-sm text-gray-900 mt-1 capitalize">{selectedRecord.scrapedData.method || 'N/A'}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <label className="text-sm font-medium text-gray-500">Status</label>
                          <p className="text-sm text-gray-900 mt-1">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              selectedRecord.scrapedData.scrapeSuccess 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {selectedRecord.scrapedData.scrapeSuccess ? 'Success' : 'Failed'}
                            </span>
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <label className="text-sm font-medium text-gray-500">Scraped URL</label>
                          <p className="text-sm text-gray-900 mt-1">
                            {selectedRecord.scrapedData.url ? (
                              <a href={selectedRecord.scrapedData.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 break-all">
                                {selectedRecord.scrapedData.url}
                              </a>
                            ) : 'N/A'}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <label className="text-sm font-medium text-gray-500">Scraped At</label>
                          <p className="text-sm text-gray-900 mt-1">
                            {selectedRecord.scrapedData.timestamp ? new Date(selectedRecord.scrapedData.timestamp).toLocaleString() : 'N/A'}
                          </p>
                        </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    // Summary-only mode: Show just business name info
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Business Information</h3>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <label className="text-sm font-medium text-gray-500">Business Name</label>
                        <p className="text-sm text-gray-900 mt-1">{selectedRecord.businessName || 'N/A'}</p>
                      </div>
                    </div>
                  )}

                  {/* Generated Summary */}
                  {selectedRecord.generatedSummary && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Generated Summary</h3>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-lg font-semibold text-green-800">Business Overview</span>
                          <Button
                            onClick={() => copyToClipboard(selectedRecord.generatedSummary!.summaryText || selectedRecord.generatedSummary!.summary || '')}
                            variant="outline"
                            size="sm"
                            className="bg-white hover:bg-gray-50"
                          >
                            Copy Summary
                          </Button>
                        </div>
                        <div className="bg-white rounded-lg p-4 mb-4">
                          <p className="text-sm text-gray-800 leading-relaxed">
                            {selectedRecord.generatedSummary.summaryText || selectedRecord.generatedSummary.summary}
                          </p>
                        </div>
                        {/* Display new BusinessSummary fields if available */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedRecord.generatedSummary.painPoints && selectedRecord.generatedSummary.painPoints.length > 0 && (
                            <div className="bg-white rounded-lg p-4">
                              <h4 className="text-sm font-semibold text-red-800 mb-3 flex items-center">
                                <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                                Pain Points
                              </h4>
                              <ul className="text-sm text-gray-700 space-y-2">
                                {selectedRecord.generatedSummary.painPoints.map((point, index) => (
                                  <li key={index} className="flex items-start">
                                    <span className="text-red-500 mr-2">•</span>
                                    <span>{point}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {selectedRecord.generatedSummary.strengths && selectedRecord.generatedSummary.strengths.length > 0 && (
                            <div className="bg-white rounded-lg p-4">
                              <h4 className="text-sm font-semibold text-green-800 mb-3 flex items-center">
                                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                Strengths
                              </h4>
                              <ul className="text-sm text-gray-700 space-y-2">
                                {selectedRecord.generatedSummary.strengths.map((strength, index) => (
                                  <li key={index} className="flex items-start">
                                    <span className="text-green-500 mr-2">•</span>
                                    <span>{strength}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {selectedRecord.generatedSummary.opportunities && selectedRecord.generatedSummary.opportunities.length > 0 && (
                            <div className="bg-white rounded-lg p-4">
                              <h4 className="text-sm font-semibold text-blue-800 mb-3 flex items-center">
                                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                                Opportunities
                              </h4>
                              <ul className="text-sm text-gray-700 space-y-2">
                                {selectedRecord.generatedSummary.opportunities.map((opportunity, index) => (
                                  <li key={index} className="flex items-start">
                                    <span className="text-blue-500 mr-2">•</span>
                                    <span>{opportunity}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {selectedRecord.generatedSummary.keywords && selectedRecord.generatedSummary.keywords.length > 0 && (
                            <div className="bg-white rounded-lg p-4">
                              <h4 className="text-sm font-semibold text-purple-800 mb-3 flex items-center">
                                <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                                Keywords
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {selectedRecord.generatedSummary.keywords.map((keyword, index) => (
                                  <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    {keyword}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Additional Information */}
                        {(selectedRecord.generatedSummary.industry || selectedRecord.generatedSummary.services || selectedRecord.generatedSummary.businessName) && (
                          <div className="mt-4 bg-white rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-800 mb-3">Additional Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              {selectedRecord.generatedSummary.businessName && (
                                <div>
                                  <span className="font-medium text-gray-600">Business Name:</span>
                                  <p className="text-gray-800 mt-1">{selectedRecord.generatedSummary.businessName}</p>
                                </div>
                              )}
                              {selectedRecord.generatedSummary.industry && (
                                <div>
                                  <span className="font-medium text-gray-600">Industry:</span>
                                  <p className="text-gray-800 mt-1">{selectedRecord.generatedSummary.industry}</p>
                                </div>
                              )}
                              {selectedRecord.generatedSummary.services && selectedRecord.generatedSummary.services.length > 0 && (
                                <div>
                                  <span className="font-medium text-gray-600">Services:</span>
                                  <p className="text-gray-800 mt-1">{selectedRecord.generatedSummary.services.join(', ')}</p>
                                </div>
                              )}
                              {selectedRecord.generatedSummary.targetAudience && (
                                <div>
                                  <span className="font-medium text-gray-600">Target Audience:</span>
                                  <p className="text-gray-800 mt-1">{selectedRecord.generatedSummary.targetAudience}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Generated Email - Only show in full mode */}
                  {drawerViewMode === 'full' && selectedRecord.generatedEmail && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Generated Email</h3>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-blue-800">Email Content</span>
                          <div className="space-x-2">
                            <Button
                              onClick={() => copyToClipboard(selectedRecord.generatedEmail!.subject)}
                              variant="outline"
                              size="sm"
                            >
                              Copy Subject
                            </Button>
                            <Button
                              onClick={() => copyToClipboard(selectedRecord.generatedEmail!.body)}
                              variant="outline"
                              size="sm"
                            >
                              Copy Body
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <label className="text-xs font-medium text-blue-800">Subject:</label>
                            <p className="text-sm text-blue-700 font-medium mt-1">{selectedRecord.generatedEmail.subject}</p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-blue-800">Body:</label>
                            <div className="text-sm text-blue-700 mt-1 whitespace-pre-wrap bg-white p-3 rounded border max-h-24 overflow-hidden">
                              {selectedRecord.generatedEmail.body}
                            </div>
                            <Button
                              onClick={() => {
                                setEmailBodyOverlay({
                                  isOpen: true,
                                  subject: selectedRecord.generatedEmail!.subject,
                                  body: selectedRecord.generatedEmail!.body
                                })
                              }}
                              variant="outline"
                              size="sm"
                              className="mt-2"
                            >
                              View Full Body
                            </Button>
                          </div>
                          <div className="text-xs text-blue-600">
                            <span className="font-medium">Tone:</span> {selectedRecord.generatedEmail.tone} • 
                            <span className="font-medium ml-2">Call to Action:</span> {selectedRecord.generatedEmail.callToAction}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions - Only show in full mode */}
                  {drawerViewMode === 'full' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Actions</h3>
                    <div className="flex space-x-2">
                      {!selectedRecord.generatedSummary ? (
                        <Button
                          onClick={() => {
                            handleGenerateSummary(selectedRecord.id)
                            closeDrawer()
                          }}
                          disabled={selectedRecord.isGeneratingSummary}
                          isLoading={selectedRecord.isGeneratingSummary}
                        >
                          {selectedRecord.isGeneratingSummary ? 'AI Processing...' : 'Generate Summary'}
                        </Button>
                      ) : !selectedRecord.generatedEmail ? (
                        <Button
                          onClick={() => {
                            handleGenerateEmail(selectedRecord.id)
                            closeDrawer()
                          }}
                          disabled={selectedRecord.isGeneratingEmail}
                          isLoading={selectedRecord.isGeneratingEmail}
                          variant="success"
                        >
                          {selectedRecord.isGeneratingEmail ? 'Generating...' : 'Generate Email'}
                        </Button>
                      ) : (
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => {
                              handleGenerateSummary(selectedRecord.id)
                              closeDrawer()
                            }}
                            disabled={selectedRecord.isGeneratingSummary}
                            isLoading={selectedRecord.isGeneratingSummary}
                            variant="outline"
                          >
                            Regenerate Summary
                          </Button>
                          <Button
                            onClick={() => {
                              handleGenerateEmail(selectedRecord.id)
                              closeDrawer()
                            }}
                            disabled={selectedRecord.isGeneratingEmail}
                            isLoading={selectedRecord.isGeneratingEmail}
                            variant="outline"
                          >
                            Regenerate Email
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email/SMS Body Overlay */}
      {emailBodyOverlay && (
        <EmailBodyOverlay
          overlay={emailBodyOverlay}
          onClose={() => setEmailBodyOverlay(null)}
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
                    alert('SMS updated successfully!')
                  } else {
                    // If fetch fails, just close and show success
                    setEmailBodyOverlay(null)
                    alert('SMS updated successfully!')
                  }
                } else {
                  alert('Failed to update SMS: ' + (res.error || 'Unknown error'))
                }
              } catch (error) {
                alert('Error updating SMS: ' + (error instanceof Error ? error.message : 'Unknown error'))
              }
            }
          }}
        />
      )}
    </AuthGuard>
  )
}