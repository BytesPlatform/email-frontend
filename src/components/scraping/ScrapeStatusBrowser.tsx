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
}

export function ScrapeStatusBrowser({ isOpen, onClose, contacts, initialFilter = 'all', onRetryFailed, onRequestReadyFetch, onAfterScrape }: ScrapeStatusBrowserProps) {
  const [filter, setFilter] = React.useState<StatusFilter>(initialFilter)
  const [selectedIds, setSelectedIds] = React.useState<number[]>([])
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(15)
  const [isScraping, setIsScraping] = React.useState(false)
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

  const showPager = totalPages > 1

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">Scrape Records</h3>
              <button onClick={onClose} className="text-gray-600 hover:text-gray-900 cursor-pointer">×</button>
        </div>
        <div className="px-6 pt-4">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {([
              { k: 'all', label: 'All' },
              { k: 'ready_to_scrape', label: 'Ready' },
              { k: 'scraping', label: 'Scraping' },
              { k: 'scraped', label: 'Scraped' },
              { k: 'scrape_failed', label: 'Failed' },
            ] as Array<{k: StatusFilter; label: string}>).map(t => (
              <button
                key={t.k}
                onClick={() => { setFilter(t.k); setSelectedIds([]); setPage(1) }}
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
        </div>
        <div className="px-6 pb-4 overflow-y-auto max-h-[60vh]">
          {filtered.length === 0 ? (
            <div className="text-center text-gray-500 py-12">No records for this filter.</div>
          ) : (
            <div className="space-y-2">
              {paged.map(c => (
                <label key={c.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(c.id)}
                    onChange={() => toggleSelect(c.id)}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-gray-900 truncate">{c.businessName || c.website || c.email || `Contact #${c.id}`}</div>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getStatusBadgeClass(c.status)}`}>
                        {normalizeStatus(c.status) || 'unknown'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 truncate">{c.website || c.email || '-'}</div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="px-6 py-3 border-t sticky bottom-0 bg-white">
          <div className="flex items-center justify-between gap-4">
            {/* Left: bulk selection */}
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

            {/* Middle: pager (hidden when only 1 page) */}
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
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
                  className="ml-2 px-2 py-1.5 rounded-md border border-gray-300 text-gray-700 bg-white cursor-pointer"
                >
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </select>
              </div>
            )}

            {/* Right: actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleStartScrape}
                disabled={selectedIds.length === 0 || isScraping}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {isScraping ? 'Scraping…' : `Start Scraping ${selectedIds.length} Selected`}
              </button>
              <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm cursor-pointer">Close</button>
              {onRetryFailed && filter === 'scrape_failed' && (
                <button
                  onClick={() => onRetryFailed(selectedIds)}
                  disabled={selectedIds.length === 0}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  Retry Failed
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ScrapeStatusBrowser


