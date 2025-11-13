'use client'

import { useState } from 'react'
import { HistorySidebar, type HistoryViewType } from '@/components/history/HistorySidebar'
import { HistoryList, type HistoryItem } from '@/components/history/HistoryList'
import { HistoryFilters } from '@/components/history/HistoryFilters'
import { HistoryDetailOverlay } from '@/components/history/HistoryDetailOverlay'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { useAuthContext } from '@/contexts/AuthContext'

export default function HistoryPage() {
  const { client } = useAuthContext()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [activeView, setActiveView] = useState<HistoryViewType>('all')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState('')
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // Mock data - Replace with actual API calls
  const mockHistoryItems: HistoryItem[] = [
    {
      id: 1,
      type: 'sms-sent',
      contactName: 'John Doe',
      contactId: 1,
      message: 'Thank you for your interest in our services!',
      sentAt: new Date().toISOString(),
      status: 'delivered',
    },
    {
      id: 2,
      type: 'email-sent',
      contactName: 'Jane Smith',
      contactId: 2,
      subject: 'Welcome to Our Platform',
      message: '<p>Thank you for joining us!</p>',
      sentAt: new Date(Date.now() - 86400000).toISOString(),
      status: 'sent',
    },
    {
      id: 3,
      type: 'email-unsubscribed',
      contactName: 'Bob Johnson',
      contactId: 3,
      subject: 'Newsletter',
      message: '<p>You have been unsubscribed from our newsletter.</p>',
      sentAt: new Date(Date.now() - 172800000).toISOString(),
    },
  ]

  // Filter history items based on active view
  const filteredItems = mockHistoryItems.filter(item => {
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

  // Counts for sidebar
  const counts = {
    all: mockHistoryItems.length,
    smsSent: mockHistoryItems.filter(item => item.type === 'sms-sent').length,
    emailSent: mockHistoryItems.filter(item => item.type === 'email-sent').length,
    emailUnsubscribed: mockHistoryItems.filter(item => item.type === 'email-unsubscribed').length,
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
      setSelectedIds(new Set(dateFilteredItems.map(item => item.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleView = (id: number) => {
    const item = mockHistoryItems.find(item => item.id === id)
    if (item) {
      setSelectedItem(item)
      setIsDetailOpen(true)
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
          {/* Header with Title and Filters */}
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-xl font-semibold text-gray-900">{getViewTitle()}</h2>
              <HistoryFilters
                search={search}
                onSearchChange={setSearch}
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
              />
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* History List */}
            <HistoryList
              historyItems={dateFilteredItems}
              isLoading={false}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              onSelectAll={handleSelectAll}
              onView={handleView}
              activeView={activeView}
            />

            {/* Footer with count */}
            {dateFilteredItems.length > 0 && (
              <div className="bg-white border-t border-gray-200 px-6 py-3 text-sm text-gray-500 text-center flex-shrink-0">
                Showing {dateFilteredItems.length} {dateFilteredItems.length === 1 ? 'item' : 'items'}
              </div>
            )}
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
      />
    </AuthGuard>
  )
}
