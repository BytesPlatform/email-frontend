import React, { useMemo } from 'react'
import { scrapingApi } from '@/api/scraping'

type Contact = {
  id: number
  csvUploadId: number
  businessName?: string
  website?: string
  email?: string
  state?: string
  zipCode?: string
  status?: string
  errorMessage?: string | null
}

type StatusFilter = 'all' | 'ready_to_scrape' | 'scraping' | 'scraped' | 'scrape_failed'

interface ScrapeStatusBrowserProps {
  isOpen: boolean
  onClose: () => void
  contacts: Contact[]
  initialFilter?: StatusFilter
  onRetryFailed?: (ids: number[]) => void
  // Optional: request fresh ready-to-scrape from server when user asks
  onRequestReadyFetch?: () => void
  onAfterScrape?: () => Promise<void> | void
  // Optional: callback when filter changes (useful for refreshing data)
  onFilterChange?: (filter: StatusFilter) => void
  // Optional: callback to update a single contact's status optimistically
  onContactStatusUpdate?: (contactId: number, status: string) => void
}

export function ScrapeStatusBrowser({ isOpen, onClose, contacts, initialFilter = 'all', onRetryFailed, onRequestReadyFetch, onAfterScrape, onFilterChange, onContactStatusUpdate }: ScrapeStatusBrowserProps) {
  const [filter, setFilter] = React.useState<StatusFilter>(initialFilter)
  const [selectedIds, setSelectedIds] = React.useState<number[]>([])
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(15)
  const [isScraping, setIsScraping] = React.useState(false)
  const [isRescraping, setIsRescraping] = React.useState<Record<number, boolean>>({})
  const modalRef = React.useRef<HTMLDivElement>(null)

  // Block body scrolling when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  React.useEffect(() => {
    setFilter(initialFilter)
    setSelectedIds([])
    setPage(1)
  }, [initialFilter, isOpen])

  // Handle click outside to close
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const normalizeStatus = (s?: string) => {
    if (!s) return undefined
    const t = s.toLowerCase().replace(/[-\s]/g, '_')
    if (t === 'ready') return 'ready_to_scrape'
    if (t === 'failed') return 'scrape_failed'
    return t
  }

  const getStatusBadgeClass = (status?: string) => {
    const normalized = normalizeStatus(status)
    switch (normalized) {
      case 'ready_to_scrape':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'scraping':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'scraped':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'scrape_failed':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const filtered = useMemo(() => {
    if (filter === 'all') return contacts
    return contacts.filter(c => normalizeStatus(c.status) === filter)
  }, [contacts, filter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paged = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    const end = currentPage * pageSize
    return filtered.slice(start, end)
  }, [filtered, currentPage, pageSize])

  if (!isOpen) return null

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleStartScrape = async () => {
    if (selectedIds.length === 0) return
    setIsScraping(true)
    try {
      // Scrape each selected contact individually; backend controls batching
      await Promise.allSettled(selectedIds.map(async (contactId) => {
        const res = await scrapingApi.scrapeSingle(contactId)
        return res
      }))
      if (onAfterScrape) await onAfterScrape()
    } finally {
      setIsScraping(false)
    }
  }

  const handleRescrape = async (contactId: number) => {
    setIsRescraping(prev => ({ ...prev, [contactId]: true }))
    try {
      const res = await scrapingApi.resetContact(contactId)
      if (res.success && res.data) {
        // Optimistically update the contact status in parent component
        if (onContactStatusUpdate) {
          onContactStatusUpdate(contactId, res.data.status)
        }
        
        // Call the refresh callback to get latest data from server
        if (onAfterScrape) {
          // Add a small delay to ensure backend has processed the change
          await new Promise(resolve => setTimeout(resolve, 300))
          await onAfterScrape()
        }
      } else {
        console.error('Failed to reset contact:', res.error)
        alert('Failed to reset contact. Please try again.')
        if (onAfterScrape) {
          await onAfterScrape()
        }
      }
    } catch (error) {
      console.error('Failed to reset contact:', error)
      alert('Failed to reset contact. Please try again.')
      if (onAfterScrape) {
        await onAfterScrape()
      }
    } finally {
      setIsRescraping(prev => ({ ...prev, [contactId]: false }))
    }
  }

  const showPager = totalPages > 1

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with title and Start Scraping button */}
        <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0">
          <h3 className="text-lg font-semibold">Scrape Records</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleStartScrape}
              disabled={selectedIds.length === 0 || isScraping}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {isScraping ? 'Scraping…' : `Start Scraping ${selectedIds.length} Selected`}
            </button>
            <button onClick={onClose} className="text-gray-600 hover:text-gray-900 cursor-pointer text-2xl leading-none">×</button>
          </div>
        </div>

        {/* Top section with filters, selection controls, and pagination */}
        <div className="px-6 pt-4 pb-3 flex-shrink-0 border-b">
          {/* Filter tabs and item count */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {([
              { k: 'all', label: 'All' },
              { k: 'ready_to_scrape', label: 'Ready' },
              { k: 'scraping', label: 'Scraping' },
              { k: 'scraped', label: 'Scraped' },
              { k: 'scrape_failed', label: 'Failed' },
            ] as Array<{k: StatusFilter; label: string}>).map(t => (
              <button
                key={t.k}
                onClick={() => { 
                  setFilter(t.k); 
                  setSelectedIds([]); 
                  setPage(1);
                  if (onFilterChange) {
                    onFilterChange(t.k);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-sm border cursor-pointer ${filter === t.k ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                {t.label}
              </button>
            ))}
            <span className="ml-auto text-sm text-gray-500">{filtered.length} items</span>
            {filter === 'ready_to_scrape' && onRequestReadyFetch && (
              <button
                onClick={onRequestReadyFetch}
                className="ml-2 px-3 py-1.5 rounded-lg text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Refresh Ready
              </button>
            )}
          </div>

          {/* Retry Failed button if applicable */}
          {onRetryFailed && filter === 'scrape_failed' && (
            <div className="mt-3">
              <button
                onClick={() => onRetryFailed(selectedIds)}
                disabled={selectedIds.length === 0}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                Retry Failed
              </button>
            </div>
          )}
        </div>

        {/* Scrollable records list */}
        <div className="px-6 py-4 overflow-y-auto flex-1 min-h-0">
          {filtered.length === 0 ? (
            <div className="text-center text-gray-500 py-12">No records for this filter.</div>
          ) : (
            <div className="space-y-2 pb-2">
              {paged.map(c => (
                <div key={c.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(c.id)}
                    onChange={() => toggleSelect(c.id)}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded cursor-pointer mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-gray-900 truncate">{c.businessName || c.website || c.email || `Contact #${c.id}`}</div>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${getStatusBadgeClass(c.status)}`}>
                        {normalizeStatus(c.status) || 'unknown'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 truncate">{c.website || c.email || '-'}</div>
                    {/* Show error message and rescrape button for failed scrapes */}
                    {normalizeStatus(c.status) === 'scrape_failed' && (
                      <div className="mt-2 flex items-start gap-2 p-2.5 bg-red-50/80 border-l-4 border-red-400 rounded-r-md">
                        <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-red-800 mb-1">Scraping Failed</div>
                          {c.errorMessage ? (
                            <div className="text-xs text-red-700 leading-relaxed mb-2.5 line-clamp-2">{c.errorMessage}</div>
                          ) : (
                            <div className="text-xs text-red-600 mb-2.5">No error details available</div>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRescrape(c.id)
                            }}
                            disabled={isRescraping[c.id]}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-md hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-sm"
                          >
                            {isRescraping[c.id] ? (
                              <>
                                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Rescraping...
                              </>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Rescrape
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with selection controls and pagination */}
        <div className="px-6 py-3 border-t flex-shrink-0 flex items-center justify-between">
          {/* Left: Selection controls */}
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <button
              onClick={() => setSelectedIds(filtered.map(c => c.id))}
              disabled={filtered.length === 0}
              className="text-indigo-600 hover:text-indigo-800 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              Select All
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={() => setSelectedIds([])}
              disabled={selectedIds.length === 0}
              className="text-indigo-600 hover:text-indigo-800 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              Clear All
            </button>
            <span className="ml-1 text-gray-600">{selectedIds.length} selected</span>
          </div>

          {/* Right: Pagination controls */}
          {showPager && (
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 disabled:opacity-50 bg-white cursor-pointer disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-gray-600">Page {currentPage} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 disabled:opacity-50 bg-white cursor-pointer disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ScrapeStatusBrowser


