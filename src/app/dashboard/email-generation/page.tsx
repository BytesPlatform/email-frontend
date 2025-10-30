'use client'

import { useState, useEffect, useCallback } from 'react'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { useAuthContext } from '@/contexts/AuthContext'
import { historyApi } from '@/api/history'
import { emailGenerationApi } from '@/api/emailGeneration'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import type { 
  BusinessSummary, 
  ScrapedRecord,
  EmailGenerationState 
} from '@/types/emailGeneration'
import type { ScrapingHistoryItem } from '@/types/history'

export default function EmailGenerationPage() {
  const { client } = useAuthContext()
  const [state, setState] = useState<EmailGenerationState>({
    scrapedRecords: [],
    isLoadingRecords: false,
    error: null,
    currentPage: 1,
    recordsPerPage: 8
  })

  // Detail drawer state
  const [selectedRecord, setSelectedRecord] = useState<ScrapedRecord | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  
  // Mode toggle state (Email or SMS)
  const [mode, setMode] = useState<'email' | 'sms'>('email')
  
  // Email body overlay state
  const [emailBodyOverlay, setEmailBodyOverlay] = useState<{
    isOpen: boolean
    subject: string
    body: string
  } | null>(null)

  // Function to check if summary exists for a contact (lightweight check - only checks existence, doesn't load full data)
  // Note: Since backend doesn't have a lightweight "exists" endpoint, we catch errors to determine existence
  const checkSummaryExists = useCallback(async (contactId: number): Promise<boolean> => {
    try {
      // Make a HEAD or GET request - if it succeeds, summary exists; if 404, it doesn't
      // For now, we'll use a try-catch approach: attempt to fetch, catch 404
      const res = await emailGenerationApi.getContactSummary(contactId)
      // If we get here and res.success is true, summary exists
      // We intentionally don't store the data here - just check existence
      return res.success && res.data !== null && res.data !== undefined
    } catch (error: any) {
      // If we get a 404 or "not found" error, summary doesn't exist
      if (error?.message?.includes('not found') || error?.message?.includes('404') || error?.message?.includes('No summary')) {
        return false
      }
      // For other errors, assume summary might exist but there's a different issue
      // Return false to be safe
      return false
    }
  }, [])

  // Function to fetch full summary for a specific contact (only when View is clicked)
  const fetchSummaryForContact = useCallback(async (contactId: number): Promise<BusinessSummary | null> => {
    try {
      const res = await emailGenerationApi.getContactSummary(contactId)
      if (res.success && res.data && 'summaryText' in res.data) {
        return res.data as BusinessSummary
      }
      return null
    } catch (error) {
      console.log(`No summary found for contact ${contactId}:`, error)
      return null
    }
  }, [])

  // Function to fetch email draft ID for a specific contact (only called when View Body is clicked)
  const fetchEmailDraftIdForContact = useCallback(async (contactId: number): Promise<number | null> => {
    try {
      const res = await emailGenerationApi.getContactEmailDrafts(contactId)
      if (res.success && res.data && Array.isArray(res.data) && res.data.length > 0) {
        // Return the most recent draft ID (first one since backend orders by createdAt desc)
        return res.data[0].id
      }
      return null
    } catch (error) {
      console.log(`No email draft found for contact ${contactId}:`, error)
      return null
    }
  }, [])

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
          
          setState(prev => ({ 
            ...prev, 
            scrapedRecords,
            isLoadingRecords: false,
          currentPage: 1 // Reset to first page when new data is loaded
        }))
        
        // Don't load email drafts on page load - they will be fetched only when View Body is clicked
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
  }, [client?.id])

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
        const emailDraftId = (res.data as any)?.emailDraftId || (res.data as any)?.id
        if (emailDraftId) {
          setState(prev => ({
            ...prev,
            scrapedRecords: prev.scrapedRecords.map(r => 
              r.id === recordId 
                ? { 
                    ...r, 
                    emailDraftId: emailDraftId,
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

  const handleViewEmail = async (recordId: number) => {
    const record = state.scrapedRecords.find(r => r.id === recordId)
    if (!record || !record.emailDraftId) {
      // If no emailDraftId but we have generatedEmail, just open drawer
      if (record && record.generatedEmail) {
        openDrawer(record)
      }
      return
    }
    
    try {
      const res = await emailGenerationApi.getEmailDraft(record.emailDraftId)
      if (res.success && res.data) {
        const emailDraft = res.data
        // Update the record with the fetched email data
        const updatedRecord: ScrapedRecord = {
          ...record,
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
          }
        }
        
        // Update state
        setState(prev => ({
          ...prev,
          scrapedRecords: prev.scrapedRecords.map(r => 
            r.id === recordId ? updatedRecord : r
          )
        }))
        
        // Open drawer with updated record
        openDrawer(updatedRecord)
      } else {
        setState(prev => ({ ...prev, error: res.error || 'Failed to fetch email draft' }))
      }
    } catch (error) {
      console.error('Error fetching email draft:', error)
      setState(prev => ({ ...prev, error: error instanceof Error ? error.message : 'Failed to fetch email draft' }))
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // You could add a toast notification here
  }

  // Pagination helpers
  const getCurrentPageRecords = () => {
    const startIndex = (state.currentPage - 1) * state.recordsPerPage
    const endIndex = startIndex + state.recordsPerPage
    return state.scrapedRecords.slice(startIndex, endIndex)
  }

  const getTotalPages = () => {
    return Math.ceil(state.scrapedRecords.length / state.recordsPerPage)
  }

  const handlePageChange = (page: number) => {
    setState(prev => ({ ...prev, currentPage: page }))
  }

  const handlePreviousPage = () => {
    if (state.currentPage > 1) {
      setState(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))
    }
  }

  const handleNextPage = () => {
    const totalPages = getTotalPages()
    if (state.currentPage < totalPages) {
      setState(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))
    }
  }

  // Handler to view summary (fetches summary data ONLY when View button is clicked)
  const handleViewSummary = async (recordId: number) => {
    const record = state.scrapedRecords.find(r => r.id === recordId)
    if (!record) return

    // If summary is already loaded, just open drawer
    if (record.generatedSummary) {
      openDrawer(record)
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
        
        // Open drawer with updated record
        openDrawer(updatedRecord)
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

  // Drawer handlers
  const openDrawer = (record: ScrapedRecord) => {
    setSelectedRecord(record)
    setIsDrawerOpen(true)
    // Prevent body scrolling when drawer is open
    document.body.style.overflow = 'hidden'
  }

  const closeDrawer = () => {
    setSelectedRecord(null)
    setIsDrawerOpen(false)
    // Restore body scrolling when drawer is closed
    document.body.style.overflow = 'unset'
  }

  return (
    <AuthGuard>
      <div className="bg-gray-50 min-h-screen">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="space-y-6">
            {/* Page Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Link href="/dashboard" className="text-white/80 hover:text-white text-sm mb-2 inline-flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Dashboard
                  </Link>
                  <h1 className="text-3xl font-bold mb-2">{mode === 'email' ? 'Email Generation' : 'SMS Generation'}</h1>
                  <p className="text-indigo-100 text-lg">
                    {mode === 'email' 
                      ? 'Generate business summaries and personalized emails for your scraped contacts.'
                      : 'Generate business summaries and personalized SMS for your scraped contacts.'}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  {/* Mode Toggle */}
                  <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/20">
                    <span className={`text-sm font-medium px-3 py-1 rounded transition-colors ${mode === 'email' ? 'bg-white text-indigo-600' : 'text-white/70'}`}>
                      Email
                    </span>
                    <button
                      onClick={() => setMode(mode === 'email' ? 'sms' : 'email')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-600 ${
                        mode === 'sms' ? 'bg-white' : 'bg-white/30'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-indigo-600 transition-transform ${
                          mode === 'sms' ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className={`text-sm font-medium px-3 py-1 rounded transition-colors ${mode === 'sms' ? 'bg-white text-indigo-600' : 'text-white/70'}`}>
                      SMS
                    </span>
                  </div>
                  <div className="hidden md:block">
                    <div className="h-20 w-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30">
                      {mode === 'email' ? (
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      ) : (
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Scraped Records Table */}
            <Card variant="elevated">
              <CardHeader
                title="Scraped Records"
                subtitle="Generate summaries and emails for your scraped contacts"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
              />
              <CardContent>
                {state.isLoadingRecords ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading scraped records...</p>
                  </div>
                ) : state.scrapedRecords.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                     <h3 className="text-2xl font-bold text-gray-900 mb-2">No Scraped Records</h3>
                     <p className="text-gray-500 mb-6">No successfully scraped records found. You need to scrape some contacts first before generating emails.</p>
                    <Link 
                      href="/dashboard/scraping" 
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 shadow-md font-medium"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Go to Scraping
                    </Link>
                  </div>
                 ) : (
                   <div className="overflow-x-auto relative">
                     {/* Horizontal scroll indicator */}
                     <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent opacity-50 pointer-events-none"></div>
                     <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                            Business
                          </th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                            Contact Info
                          </th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">
                            Location
                          </th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                            Summary
                          </th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                            {mode === 'email' ? 'Email' : 'SMS'}
                          </th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">
                            Actions
                          </th>
                        </tr>
                      </thead>
                       <tbody className="bg-white divide-y divide-gray-200">
                         {getCurrentPageRecords().map((record) => (
                          <tr key={record.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openDrawer(record)}>
                            <td className="px-2 py-2 whitespace-nowrap min-w-[150px]">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8">
                                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                    <span className="text-white font-semibold text-xs">
                                      {record.businessName?.[0]?.toUpperCase() || 'B'}
                                    </span>
                                  </div>
                                </div>
                                <div className="ml-3">
                                  <div className="text-sm font-medium text-gray-900">
                                    {record.businessName || 'Unknown Business'}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    ID: {record.contactId}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap min-w-[120px]">
                              <div className="text-sm text-gray-900 truncate">
                                {record.email || 'No email'}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {record.website || 'No website'}
                              </div>
                            </td>
                             <td className="px-2 py-2 whitespace-nowrap min-w-[80px]">
                               <div className="text-sm text-gray-900">
                                 {record.state || 'N/A'}
                               </div>
                               <div className="text-xs text-gray-500">
                                 {record.zipCode || 'N/A'}
                               </div>
                             </td>
                            <td className="px-2 py-2 whitespace-nowrap min-w-[120px]">
                              <div className="flex items-center space-x-1">
                                {record.generatedSummary ? (
                                  <>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      ✓ Generated
                                    </span>
                                    <Button
                                      onClick={async (e) => {
                                        e.stopPropagation()
                                        await handleViewSummary(record.id)
                                      }}
                                      disabled={record.isLoadingSummary}
                                      variant="outline"
                                      size="xs"
                                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                                    >
                                      {record.isLoadingSummary ? 'Loading...' : 'View'}
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                      {record.isLoadingSummary ? 'Checking...' : '?'}
                                    </span>
                                    <Button
                                      onClick={async (e) => {
                                        e.stopPropagation()
                                        await handleViewSummary(record.id)
                                      }}
                                      disabled={record.isLoadingSummary}
                                      variant="outline"
                                      size="xs"
                                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                                    >
                                      {record.isLoadingSummary ? 'Loading...' : 'View'}
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap min-w-[120px]">
                              {mode === 'email' ? (
                                <div className="flex items-center space-x-1">
                                  {record.generatedEmail ? (
                                    <>
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        ✓ Generated
                                      </span>
                                      <Button
                                        onClick={async (e) => {
                                          e.stopPropagation()
                                          setEmailBodyOverlay({
                                            isOpen: true,
                                            subject: record.generatedEmail!.subject,
                                            body: record.generatedEmail!.body
                                          })
                                        }}
                                        variant="outline"
                                        size="xs"
                                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                                      >
                                        View Body
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                        {record.isLoadingEmailDraft ? 'Checking...' : '?'}
                                      </span>
                                      <Button
                                        onClick={async (e) => {
                                          e.stopPropagation()
                                          await handleViewEmailBody(record.id)
                                        }}
                                        disabled={record.isLoadingEmailDraft}
                                        variant="outline"
                                        size="xs"
                                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                                      >
                                        {record.isLoadingEmailDraft ? 'Loading...' : 'View Body'}
                                      </Button>
                                    </>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center space-x-1">
                                  {/* SMS mode - same structure as Email */}
                                  {record.generatedSMS ? (
                                    <>
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        ✓ Generated
                                      </span>
                                      <Button
                                        onClick={async (e) => {
                                          e.stopPropagation()
                                          setEmailBodyOverlay({
                                            isOpen: true,
                                            subject: record.generatedSMS!.subject,
                                            body: record.generatedSMS!.body
                                          })
                                        }}
                                        variant="outline"
                                        size="xs"
                                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                                      >
                                        View SMS
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                        {record.isLoadingSMSDraft ? 'Checking...' : '?'}
                                      </span>
                                      <Button
                                        onClick={async (e) => {
                                          e.stopPropagation()
                                          // TODO: Implement handleViewSMSBody when SMS APIs are ready
                                          console.log('View SMS - API to be implemented')
                                        }}
                                        disabled={record.isLoadingSMSDraft}
                                        variant="outline"
                                        size="xs"
                                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                                      >
                                        {record.isLoadingSMSDraft ? 'Loading...' : 'View SMS'}
                                      </Button>
                                    </>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap text-sm font-medium min-w-[140px]">
                              <div className="flex space-x-1" onClick={(e) => e.stopPropagation()}>
                                {(!record.hasSummary && !record.generatedSummary) ? (
                                  <Button
                                    onClick={() => handleGenerateSummary(record.id)}
                                    disabled={record.isGeneratingSummary}
                                    isLoading={record.isGeneratingSummary}
                                    size="sm"
                                  >
                                    {record.isGeneratingSummary ? 'AI Processing...' : 'Generate Summary'}
                                  </Button>
                                ) : mode === 'email' ? (
                                  !record.generatedEmail && !record.emailDraftId ? (
                                    <Button
                                      onClick={() => handleGenerateEmail(record.id)}
                                      disabled={record.isGeneratingEmail}
                                      isLoading={record.isGeneratingEmail}
                                      size="sm"
                                      variant="success"
                                    >
                                      {record.isGeneratingEmail ? 'Generating...' : 'Generate Email'}
                                    </Button>
                                  ) : (
                                    <Button
                                      onClick={() => handleSendEmail(record.id)}
                                      disabled={record.isSendingEmail}
                                      isLoading={record.isSendingEmail}
                                      size="sm"
                                      variant="primary"
                                    >
                                      {record.isSendingEmail ? 'Sending...' : 'Send Email'}
                                    </Button>
                                  )
                                ) : (
                                  // SMS mode - similar structure, will be connected to SMS APIs later
                                  !record.generatedSMS && !record.smsDraftId ? (
                                    <Button
                                      onClick={() => {
                                        // TODO: Implement handleGenerateSMS when SMS APIs are ready
                                        console.log('Generate SMS - API to be implemented')
                                      }}
                                      disabled={false}
                                      size="sm"
                                      variant="success"
                                    >
                                      Generate SMS
                                    </Button>
                                  ) : (
                                    <Button
                                      onClick={() => {
                                        // TODO: Implement handleSendSMS when SMS APIs are ready
                                        console.log('Send SMS - API to be implemented')
                                      }}
                                      disabled={false}
                                      size="sm"
                                      variant="primary"
                                    >
                                      Send SMS
                                    </Button>
                                  )
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                     </table>
                   </div>
                 )}

                 {/* Pagination Controls */}
                 {state.scrapedRecords.length > 0 && (
                   <div className="mt-6 flex items-center justify-between">
                     <div className="flex items-center text-sm text-gray-700">
                       <span>
                         Showing {((state.currentPage - 1) * state.recordsPerPage) + 1} to{' '}
                         {Math.min(state.currentPage * state.recordsPerPage, state.scrapedRecords.length)} of{' '}
                         {state.scrapedRecords.length} results
                       </span>
                     </div>
                     
                     <div className="flex items-center space-x-2">
                       <Button
                         onClick={handlePreviousPage}
                         disabled={state.currentPage === 1}
                         variant="outline"
                         size="sm"
                       >
                         Previous
                       </Button>
                       
                       {/* Page Numbers */}
                       <div className="flex space-x-1">
                         {Array.from({ length: getTotalPages() }, (_, i) => i + 1).map((page) => (
                           <Button
                             key={page}
                             onClick={() => handlePageChange(page)}
                             variant={state.currentPage === page ? "primary" : "outline"}
                             size="sm"
                             className="w-8 h-8 p-0"
                           >
                             {page}
                           </Button>
                         ))}
                       </div>
                       
                       <Button
                         onClick={handleNextPage}
                         disabled={state.currentPage === getTotalPages()}
                         variant="outline"
                         size="sm"
                       >
                         Next
                       </Button>
                     </div>
                   </div>
                 )}
               </CardContent>
             </Card>

            {/* Error Display */}
            {state.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
                <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-red-700">{state.error}</span>
              </div>
            )}
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
                  {/* Basic Information */}
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

                  {/* Generated Email */}
                  {selectedRecord.generatedEmail && (
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

                  {/* Actions */}
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
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Body Overlay */}
      {emailBodyOverlay && emailBodyOverlay.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setEmailBodyOverlay(null)}
          />
          
          {/* Overlay Content */}
          <div className="relative w-full max-w-3xl h-[85vh] bg-white rounded-2xl shadow-2xl border border-gray-200 transform transition-transform overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 rounded-t-2xl flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Email Preview</h2>
                <p className="text-sm text-gray-500 mt-1">Full email body content</p>
              </div>
              <button
                onClick={() => setEmailBodyOverlay(null)}
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
                {/* Subject */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">Subject:</label>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-base font-medium text-gray-900">{emailBodyOverlay.subject}</p>
                  </div>
                </div>

                {/* Body */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-gray-700">Email Body:</label>
                    <Button
                      onClick={() => copyToClipboard(emailBodyOverlay.body)}
                      variant="outline"
                      size="sm"
                    >
                      Copy Body
                    </Button>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <div className="text-base text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {emailBodyOverlay.body}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end p-6 border-t border-gray-200 rounded-b-2xl flex-shrink-0 space-x-3 bg-white">
              <Button
                onClick={() => copyToClipboard(emailBodyOverlay.body)}
                variant="outline"
              >
                Copy Body
              </Button>
              <Button
                onClick={() => setEmailBodyOverlay(null)}
                variant="primary"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </AuthGuard>
  )
}