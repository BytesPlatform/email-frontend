'use client'

import { useState, useEffect, useCallback } from 'react'
import { HistorySidebar, type HistoryViewType } from '@/components/history/HistorySidebar'
import { HistoryList, type HistoryItem } from '@/components/history/HistoryList'
import { HistoryFilters } from '@/components/history/HistoryFilters'
import { HistoryDetailOverlay } from '@/components/history/HistoryDetailOverlay'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { useAuthContext } from '@/contexts/AuthContext'
import { historyApi } from '@/api/history'
import { emailGenerationApi } from '@/api/emailGeneration'
import { unsubscribeApi } from '@/api/unsubscribe'
import type { SmsLog, EmailLog } from '@/types/history'
import type { UnsubscribeListItem } from '@/types/unsubscribe'

export default function HistoryPage() {
  const { client } = useAuthContext()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [activeView, setActiveView] = useState<HistoryViewType>('all')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState('')
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 6
  const [resubscribingContactId, setResubscribingContactId] = useState<number | null>(null)

  // Transform SMS log to HistoryItem
  const transformSmsLogToHistoryItem = (log: SmsLog): HistoryItem => {
    return {
      id: log.id,
      type: 'sms-sent',
      contactName: log.contact?.businessName || 'Unknown Contact',
      contactId: log.contactId,
      message: log.smsDraft?.messageText || '',
      sentAt: typeof log.sentAt === 'string' ? log.sentAt : log.sentAt.toISOString(),
      status: log.status,
    }
  }

  // Transform Email log to HistoryItem
  const transformEmailLogToHistoryItem = (log: EmailLog): HistoryItem => {
    // Calculate opens and clicks from engagements
    const opens = log.emailEngagements?.filter(e => e.engagementType === 'open').length || 0
    const clicks = log.emailEngagements?.filter(e => e.engagementType === 'click').length || 0
    
    return {
      id: log.id,
      type: 'email-sent',
      contactName: log.contact?.businessName || 'Unknown Contact',
      contactId: log.contactId,
      subject: log.emailDraft?.subjectLine || '',
      message: log.emailDraft?.bodyText || '',
      sentAt: typeof log.sentAt === 'string' ? log.sentAt : log.sentAt.toISOString(),
      status: log.status,
    }
  }

  // Transform Unsubscribe item to HistoryItem
  const transformUnsubscribeToHistoryItem = (item: UnsubscribeListItem): HistoryItem => {
    return {
      id: item.contactId, // Use contactId as id for uniqueness
      type: 'email-unsubscribed',
      contactName: item.businessName || 'Unknown Contact',
      contactId: item.contactId,
      subject: 'Unsubscribed',
      message: item.reason ? `Unsubscribed: ${item.reason}` : 'Unsubscribed from emails',
      sentAt: item.unsubscribedAt || new Date().toISOString(),
    }
  }

  // Fetch all history data (SMS logs, Email logs, and Unsubscribes)
  // Always fetch ALL data regardless of activeView to maintain accurate counts
  const fetchHistoryData = useCallback(async () => {
    if (!client?.id) {
      console.warn('No client ID available')
      setHistoryItems([])
      return
    }

    setIsLoading(true)
    try {
      const allItems: HistoryItem[] = []

      // Always fetch SMS logs (for counts)
      try {
        const smsRes = await historyApi.getSmsLogsByClientSmsId(client.id)
        if (smsRes.success && smsRes.data) {
          const smsItems = smsRes.data.map(transformSmsLogToHistoryItem)
          allItems.push(...smsItems)
        }
      } catch (err) {
        console.error('Error fetching SMS logs:', err)
      }

      // Always fetch Email logs (for counts)
      try {
        // Use client.id as clientEmailId (same pattern as drafts page)
        const emailRes = await emailGenerationApi.getEmailLogsByClientEmailId(client.id)
        if (emailRes.success && emailRes.data) {
          const emailItems = emailRes.data.map(transformEmailLogToHistoryItem)
          allItems.push(...emailItems)
        }
      } catch (err) {
        console.error('Error fetching email logs:', err)
      }

      // Always fetch Unsubscribes (for counts)
      try {
        const unsubscribeRes = await unsubscribeApi.getAllUnsubscribes()
        if (unsubscribeRes.success && unsubscribeRes.data) {
          const unsubscribeItems = unsubscribeRes.data.map(transformUnsubscribeToHistoryItem)
          allItems.push(...unsubscribeItems)
        }
      } catch (err) {
        console.error('Error fetching unsubscribes:', err)
      }

      // Sort by sentAt (newest first)
      allItems.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
      
      setHistoryItems(allItems)
    } catch (err) {
      console.error('Error fetching history data:', err)
      setHistoryItems([])
    } finally {
      setIsLoading(false)
    }
  }, [client?.id])

  // Fetch logs when component mounts or client/view changes
  useEffect(() => {
    fetchHistoryData()
  }, [fetchHistoryData])

  // Filter history items based on active view
  const filteredItems = historyItems.filter(item => {
    if (activeView === 'all') return true
    if (activeView === 'sms-sent') return item.type === 'sms-sent'
    if (activeView === 'email-sent') return item.type === 'email-sent'
    if (activeView === 'email-unsubscribed') return item.type === 'email-unsubscribed'
    return true
  })

  // Filter by search
  const searchFilteredItems = filteredItems.filter(item => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      item.contactName.toLowerCase().includes(searchLower) ||
      item.subject?.toLowerCase().includes(searchLower) ||
      item.message?.toLowerCase().includes(searchLower)
    )
  })

  // Filter by date range
  const dateFilteredItems = searchFilteredItems.filter(item => {
    if (dateRange === 'all') return true
    const itemDate = new Date(item.sentAt)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

    if (dateRange === 'today') return itemDate >= today
    if (dateRange === 'week') return itemDate >= weekAgo
    if (dateRange === 'month') return itemDate >= monthAgo
    return true
  })

  // Pagination
  const totalPages = Math.ceil(dateFilteredItems.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedItems = dateFilteredItems.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [activeView, search, dateRange])

  // Counts for sidebar
  const counts = {
    all: historyItems.length,
    smsSent: historyItems.filter(item => item.type === 'sms-sent').length,
    emailSent: historyItems.filter(item => item.type === 'email-sent').length,
    emailUnsubscribed: historyItems.filter(item => item.type === 'email-unsubscribed').length,
  }

  const handleSelect = (id: number, selected: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (selected) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedIds(new Set(paginatedItems.map(item => item.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleView = (id: number) => {
    const item = historyItems.find(item => item.id === id)
    if (item) {
      setSelectedItem(item)
      setIsDetailOpen(true)
    }
  }

  const handleResubscribe = async (contactId: number) => {
    if (!contactId) {
      alert('Contact ID is required')
      return
    }

    setResubscribingContactId(contactId)
    try {
      const res = await unsubscribeApi.resubscribeByContact(contactId)
      if (res.success) {
        alert(res.data?.message || 'Contact resubscribed successfully!')
        // Refresh history data to update counts
        await fetchHistoryData()
        // Close overlay
        setIsDetailOpen(false)
        setSelectedItem(null)
      } else {
        alert('Failed to resubscribe: ' + (res.error || 'Unknown error'))
      }
    } catch (err) {
      console.error('Error resubscribing contact:', err)
      alert('Error resubscribing contact: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setResubscribingContactId(null)
    }
  }

  const getViewTitle = () => {
    switch (activeView) {
      case 'all':
        return 'All History'
      case 'sms-sent':
        return 'SMS Sent'
      case 'email-sent':
        return 'Email Sent'
      case 'email-unsubscribed':
        return 'Email Unsubscribed'
      default:
        return 'All History'
    }
  }

  return (
    <AuthGuard>
      <div className="flex h-[calc(100vh-64px)] bg-white">
        {/* Sidebar */}
        <div className="flex-shrink-0 h-full border-r border-gray-200 bg-white">
          <HistorySidebar
            isCollapsed={isSidebarCollapsed}
            activeView={activeView}
            onViewChange={setActiveView}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            allCount={counts.all}
            smsSentCount={counts.smsSent}
            emailSentCount={counts.emailSent}
            emailUnsubscribedCount={counts.emailUnsubscribed}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 px-8 py-3 min-h-[60px]">
              {/* Logo/Title */}
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-gray-900">{getViewTitle()}</h1>
              </div>
              
              {/* Search Bar */}
              <div className="flex-1 flex items-center gap-3 ml-4">
                <HistoryFilters
                  search={search}
                  onSearchChange={setSearch}
                  dateRange={dateRange}
                  onDateRangeChange={setDateRange}
                />
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto bg-white">
            <div className="px-4 py-4">
              <HistoryList
                historyItems={paginatedItems}
                isLoading={isLoading}
                selectedIds={selectedIds}
                onSelect={handleSelect}
                onSelectAll={handleSelectAll}
                onView={handleView}
                activeView={activeView}
              />

              {/* Pagination - Always show when there are items */}
              {dateFilteredItems.length > 0 && (
                <div className="flex items-center justify-between mt-4 px-4 py-3 bg-white rounded-lg border border-gray-200 mb-16">
                  <div className="text-sm text-gray-600">
                    {totalPages > 1 ? (
                      <>
                        Showing {startIndex + 1} to {Math.min(endIndex, dateFilteredItems.length)} of {dateFilteredItems.length} {dateFilteredItems.length === 1 ? 'item' : 'items'}
                      </>
                    ) : (
                      <>
                        Showing {dateFilteredItems.length} {dateFilteredItems.length === 1 ? 'item' : 'items'}
                      </>
                    )}
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
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
                              onClick={() => setCurrentPage(page)}
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
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detail Overlay */}
      <HistoryDetailOverlay
        item={selectedItem}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false)
          setSelectedItem(null)
        }}
        onResubscribe={selectedItem?.type === 'email-unsubscribed' ? handleResubscribe : undefined}
        isResubscribing={
          selectedItem?.type === 'email-unsubscribed' &&
          selectedItem?.contactId !== undefined &&
          resubscribingContactId === selectedItem.contactId
        }
      />
    </AuthGuard>
  )
}
