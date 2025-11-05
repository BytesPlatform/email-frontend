'use client'

import { useState, useEffect } from 'react'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { DraftsHeader } from '@/components/drafts/DraftsHeader'
import { EmailDraftsList, type EmailDraft } from '@/components/drafts/EmailDraftsList'
import { SmsDraftsList, type SmsDraft } from '@/components/drafts/SmsDraftsList'
import { DraftsFilters } from '@/components/drafts/DraftsFilters'

export default function DraftsPage() {
  const [activeTab, setActiveTab] = useState<'email' | 'sms'>('email')
  const [emailDrafts, setEmailDrafts] = useState<EmailDraft[]>([])
  const [smsDrafts, setSmsDrafts] = useState<SmsDraft[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [filters, setFilters] = useState<{ status?: string; search?: string }>({})

  // TODO: Replace with actual API calls when backend is ready
  useEffect(() => {
    setIsLoading(true)
    // Placeholder - will be replaced with actual API calls
    setTimeout(() => {
      setEmailDrafts([])
      setSmsDrafts([])
      setIsLoading(false)
    }, 500)
  }, [activeTab])

  const handleTabChange = (tab: 'email' | 'sms') => {
    setActiveTab(tab)
    setFilters({}) // Reset filters on tab change
  }

  const handleViewDraft = (draftId: number) => {
    console.log(`View ${activeTab} draft:`, draftId)
    // TODO: Navigate to draft view or open overlay
  }

  const handleEditDraft = (draftId: number) => {
    console.log(`Edit ${activeTab} draft:`, draftId)
    // TODO: Navigate to edit or open editor
  }

  const handleSendDraft = (draftId: number) => {
    console.log(`Send ${activeTab} draft:`, draftId)
    // TODO: Call send API
  }

  const handleDeleteDraft = (draftId: number) => {
    console.log(`Delete ${activeTab} draft:`, draftId)
    // TODO: Call delete API
  }

  return (
    <AuthGuard>
      <div className="bg-gray-50 min-h-screen">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="space-y-4">
            <DraftsHeader
              activeTab={activeTab}
              onTabChange={handleTabChange}
              emailCount={emailDrafts.length}
              smsCount={smsDrafts.length}
            />

            <DraftsFilters
              type={activeTab}
              filters={filters}
              onFilterChange={setFilters}
            />

            {activeTab === 'email' ? (
              <EmailDraftsList
                drafts={emailDrafts}
                isLoading={isLoading}
                onView={handleViewDraft}
                onEdit={handleEditDraft}
                onSend={handleSendDraft}
                onDelete={handleDeleteDraft}
              />
            ) : (
              <SmsDraftsList
                drafts={smsDrafts}
                isLoading={isLoading}
                onView={handleViewDraft}
                onEdit={handleEditDraft}
                onSend={handleSendDraft}
                onDelete={handleDeleteDraft}
              />
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}

