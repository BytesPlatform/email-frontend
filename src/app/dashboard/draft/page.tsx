'use client'

import { useState, useEffect } from 'react'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { DraftsToggle } from '@/components/drafts/DraftsToggle'
import { EmailDraftsList, type EmailDraft } from '@/components/drafts/EmailDraftsList'
import { SmsDraftsList, type SmsDraft } from '@/components/drafts/SmsDraftsList'
import { DraftsFilters } from '@/components/drafts/DraftsFilters'
import { EmailDraftOverlay } from '@/components/drafts/EmailDraftOverlay'
import { Button } from '@/components/ui/Button'
import { emailGenerationApi } from '@/api/emailGeneration'
import { smsGenerationApi } from '@/api/smsGeneration'
import type { EmailDraft as ApiEmailDraft } from '@/types/emailGeneration'
import type { SMSDraft } from '@/types/smsGeneration'

export default function DraftsPage() {
  const [activeTab, setActiveTab] = useState<'email' | 'sms'>('email')
  const [emailDrafts, setEmailDrafts] = useState<EmailDraft[]>([])
  const [smsDrafts, setSmsDrafts] = useState<SmsDraft[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [filters, setFilters] = useState<{ status?: string; search?: string }>({})
  const [selectedEmailDraft, setSelectedEmailDraft] = useState<EmailDraft | null>(null)
  const [isEmailOverlayOpen, setIsEmailOverlayOpen] = useState(false)
  const [emailSpamCheckResult, setEmailSpamCheckResult] = useState<{
    score: number
    keywords: string[]
    suggestions: string[]
    blocked: boolean
  } | undefined>()
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  // Transform API EmailDraft to component EmailDraft
  const transformEmailDraft = (apiDraft: ApiEmailDraft): EmailDraft => {
    return {
      id: apiDraft.id,
      contactId: apiDraft.contactId || 0,
      contactName: apiDraft.contact?.businessName,
      contactEmail: apiDraft.contact?.email,
      subject: apiDraft.subjectLine || apiDraft.subject || 'No Subject',
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
        setEmailDrafts(drafts.map(transformEmailDraft))
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

  // Fetch SMS drafts using existing API endpoint
  const fetchSmsDrafts = async () => {
    setIsLoading(true)
    try {
      // Using getAllSmsDrafts API method
      const res = await smsGenerationApi.getAllSmsDrafts()
      
      if (res.success && res.data) {
        const drafts = Array.isArray(res.data) ? res.data : []
        setSmsDrafts(drafts.map(transformSmsDraft))
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

  // Fetch drafts when tab changes
  useEffect(() => {
    if (activeTab === 'email') {
      fetchEmailDrafts()
    } else {
      fetchSmsDrafts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const handleTabChange = (tab: 'email' | 'sms') => {
    setActiveTab(tab)
    setFilters({}) // Reset filters on tab change
  }

  const [currentDraftIndex, setCurrentDraftIndex] = useState<number>(0)

  const handleViewDraft = async (draftId: number) => {
    if (activeTab === 'email') {
      // Find the draft from the list
      const draftIndex = filteredEmailDrafts.findIndex(d => d.id === draftId)
      const draft = filteredEmailDrafts[draftIndex]
      if (draft) {
        setCurrentDraftIndex(draftIndex)
        setSelectedEmailDraft(draft)
        setIsEmailOverlayOpen(true)
        
        // Optionally fetch full draft details and spam check
        try {
          const fullDraftRes = await emailGenerationApi.getEmailDraft(draftId)
          if (fullDraftRes.success && fullDraftRes.data) {
            // Update draft with full details if needed
          }
          
          // Fetch spam check result
          const spamRes = await emailGenerationApi.checkSpam({ draftId })
          if (spamRes.success && spamRes.data) {
            setEmailSpamCheckResult(spamRes.data)
          }
        } catch (err) {
          console.error('Error fetching draft details:', err)
        }
      }
    } else {
      // SMS view logic (to be implemented)
      console.log(`View SMS draft:`, draftId)
    }
  }

  const handleNextEmailDraft = async () => {
    const nextIndex = currentDraftIndex + 1
    if (nextIndex < filteredEmailDrafts.length) {
      const nextDraft = filteredEmailDrafts[nextIndex]
      setCurrentDraftIndex(nextIndex)
      setSelectedEmailDraft(nextDraft)
      
      // Fetch full draft details and spam check for next draft
      try {
        const fullDraftRes = await emailGenerationApi.getEmailDraft(nextDraft.id)
        if (fullDraftRes.success && fullDraftRes.data) {
          // Update draft with full details if needed
        }
        
        // Fetch spam check result
        const spamRes = await emailGenerationApi.checkSpam({ draftId: nextDraft.id })
        if (spamRes.success && spamRes.data) {
          setEmailSpamCheckResult(spamRes.data)
        }
      } catch (err) {
        console.error('Error fetching draft details:', err)
      }
    }
  }

  const handleCloseEmailOverlay = () => {
    setIsEmailOverlayOpen(false)
    setSelectedEmailDraft(null)
    setEmailSpamCheckResult(undefined)
  }

  const handleEditEmailDraft = (draftId: number) => {
    console.log(`Edit email draft:`, draftId)
    // TODO: Implement edit functionality
    handleCloseEmailOverlay()
  }

  const handleSendEmailDraft = async (draftId: number) => {
    try {
      const res = await emailGenerationApi.sendEmailDraft(draftId)
      if (res.success) {
        alert('Email sent successfully!')
        handleCloseEmailOverlay()
        // Refresh email drafts
        fetchEmailDrafts()
      } else {
        alert('Failed to send email: ' + (res.error || 'Unknown error'))
      }
    } catch (err) {
      console.error('Error sending email:', err)
      alert('Error sending email: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const handleEditDraft = (draftId: number) => {
    if (activeTab === 'email') {
      handleEditEmailDraft(draftId)
    } else {
      console.log(`Edit ${activeTab} draft:`, draftId)
      // TODO: Implement SMS edit
    }
  }

  const handleSendDraft = (draftId: number) => {
    if (activeTab === 'email') {
      handleSendEmailDraft(draftId)
    } else {
      console.log(`Send ${activeTab} draft:`, draftId)
      // TODO: Implement SMS send
    }
  }

  // Filter drafts based on filters
  const filteredEmailDrafts = emailDrafts.filter(draft => {
    if (filters.status && draft.status !== filters.status) {
      return false
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      return (
        draft.contactName?.toLowerCase().includes(searchLower) ||
        draft.contactEmail?.toLowerCase().includes(searchLower) ||
        draft.subject?.toLowerCase().includes(searchLower) ||
        draft.body?.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  const filteredSmsDrafts = smsDrafts.filter(draft => {
    if (filters.status && draft.status !== filters.status) {
      return false
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      return (
        draft.contactName?.toLowerCase().includes(searchLower) ||
        draft.contactPhone?.toLowerCase().includes(searchLower) ||
        draft.message?.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  // Pagination logic
  const totalEmailPages = Math.ceil(filteredEmailDrafts.length / itemsPerPage)
  const totalSmsPages = Math.ceil(filteredSmsDrafts.length / itemsPerPage)
  const currentTotalPages = activeTab === 'email' ? totalEmailPages : totalSmsPages

  const paginatedEmailDrafts = filteredEmailDrafts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const paginatedSmsDrafts = filteredSmsDrafts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Reset to page 1 when filters change or tab changes
  useEffect(() => {
    setCurrentPage(1)
  }, [filters, activeTab])

  return (
    <AuthGuard>
      <div className="bg-gray-50 min-h-screen">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Drafts Management</h1>
                <p className="text-sm text-gray-500 mt-1">
                  View and manage your email and SMS drafts
                </p>
              </div>
              
              <DraftsToggle
                activeTab={activeTab}
                onTabChange={handleTabChange}
                emailCount={emailDrafts.length}
                smsCount={smsDrafts.length}
              />
            </div>

            <DraftsFilters
              type={activeTab}
              filters={filters}
              onFilterChange={setFilters}
            />

            {activeTab === 'email' ? (
              <EmailDraftsList
                drafts={paginatedEmailDrafts}
                isLoading={isLoading}
                onView={handleViewDraft}
                onEdit={handleEditDraft}
                onSend={handleSendDraft}
              />
            ) : (
              <SmsDraftsList
                drafts={paginatedSmsDrafts}
                isLoading={isLoading}
                onView={handleViewDraft}
                onEdit={handleEditDraft}
                onSend={handleSendDraft}
              />
            )}

            {/* Pagination */}
            {currentTotalPages > 1 && (
              <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, activeTab === 'email' ? filteredEmailDrafts.length : filteredSmsDrafts.length)} of {activeTab === 'email' ? filteredEmailDrafts.length : filteredSmsDrafts.length} drafts
                </div>
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
                    {Array.from({ length: currentTotalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-1 text-sm rounded ${
                          currentPage === page
                            ? 'bg-indigo-600 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === currentTotalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
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
        hasNext={currentDraftIndex < filteredEmailDrafts.length - 1}
      />
    </AuthGuard>
  )
}

