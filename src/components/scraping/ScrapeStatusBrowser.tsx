import React, { useMemo, useState } from 'react'
import { scrapingApi } from '@/api/scraping'
import { WebsitePreviewDialog } from './WebsitePreviewDialog'
import { BatchWebsiteConfirmationDialog } from './BatchWebsiteConfirmationDialog'
import type { BatchDiscoveryResult } from '@/types/scraping'

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
  scrapeMethod?: 'direct_url' | 'email_domain' | 'business_search' | null
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
  const [searchQuery, setSearchQuery] = React.useState('')
  const modalRef = React.useRef<HTMLDivElement>(null)
  
  // Website preview dialog state
  const [previewDialog, setPreviewDialog] = useState<{
    isOpen: boolean
    contactId: number
    businessName: string
    discoveredWebsite: string
    confidence: 'high' | 'medium' | 'low'
    searchQuery?: string
  } | null>(null)
  
  // Batch discovery state
  const [batchDiscoveryDialog, setBatchDiscoveryDialog] = useState<{
    isOpen: boolean
    results: BatchDiscoveryResult[]
    uploadId: number
  } | null>(null)
  const [isDiscovering, setIsDiscovering] = useState<Record<number, boolean>>({})

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
    setSearchQuery('') // Reset search when modal opens/closes or filter changes
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
    let result = contacts
    
    // Apply status filter
    if (filter !== 'all') {
      result = result.filter(c => normalizeStatus(c.status) === filter)
    }
    
    // Apply search filter (website, businessName, email)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter(c => {
        const website = (c.website || '').toLowerCase()
        const businessName = (c.businessName || '').toLowerCase()
        const email = (c.email || '').toLowerCase()
        return website.includes(query) || businessName.includes(query) || email.includes(query)
      })
    }
    
    return result
  }, [contacts, filter, searchQuery])

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

  // Check if contact needs website preview (business search)
  const needsPreview = (contact: Contact): boolean => {
    // Need preview if: no website AND (has businessName OR scrapeMethod is business_search)
    return !contact.website && (!!contact.businessName || contact.scrapeMethod === 'business_search')
  }

  // Scrape a single contact with preview if needed
  const scrapeContactWithPreview = async (contactId: number, contact: Contact) => {
    // Check if preview is needed
    if (needsPreview(contact)) {
      // Discover website first
      setIsDiscovering(prev => ({ ...prev, [contactId]: true }))
      try {
        const discovery = await scrapingApi.discoverWebsite(contactId)
        if (discovery.success && discovery.data) {
          // Show preview dialog
          setPreviewDialog({
            isOpen: true,
            contactId,
            businessName: contact.businessName || 'Unknown Business',
            discoveredWebsite: discovery.data.discoveredWebsite,
            confidence: discovery.data.confidence,
            searchQuery: discovery.data.searchQuery
          })
        } else {
          // Discovery failed, proceed with normal scrape
          const res = await scrapingApi.scrapeSingle(contactId)
          return res
        }
      } catch (error) {
        console.error('Website discovery failed:', error)
        // On error, proceed with normal scrape
        const res = await scrapingApi.scrapeSingle(contactId)
        return res
      } finally {
        setIsDiscovering(prev => ({ ...prev, [contactId]: false }))
      }
    } else {
      // No preview needed, scrape directly
      return await scrapingApi.scrapeSingle(contactId)
    }
  }

  // Handle preview confirmation
  const handlePreviewConfirm = async () => {
    if (!previewDialog) return
    
    setIsScraping(true)
    try {
      // Scrape with confirmed website
      const res = await scrapingApi.scrapeSingle(previewDialog.contactId, previewDialog.discoveredWebsite)
      
      // Close preview dialog
      setPreviewDialog(null)
      
      // Refresh data
      if (onAfterScrape) await onAfterScrape()
      
      return res
    } catch (error) {
      console.error('Scraping failed:', error)
      setPreviewDialog(null)
    } finally {
      setIsScraping(false)
    }
  }

  // Handle preview cancel
  const handlePreviewCancel = () => {
    setPreviewDialog(null)
  }

  // Handle visit website
  const handleVisitWebsite = () => {
    if (previewDialog) {
      window.open(previewDialog.discoveredWebsite, '_blank', 'noopener,noreferrer')
    }
  }

  // Handle batch discovery confirmation
  const handleBatchDiscoveryConfirm = async (confirmedWebsites: { [contactId: number]: string }) => {
    if (!batchDiscoveryDialog) return
    
    setIsScraping(true)
    setBatchDiscoveryDialog(null)
    
    try {
      // Get all contact IDs from discovery results
      const contactIds = batchDiscoveryDialog.results.map(r => r.contactId)
      
      // Scrape with confirmed websites using batch API
      const res = await scrapingApi.scrapeBatch(batchDiscoveryDialog.uploadId, contactIds.length, confirmedWebsites)
      if (res.success && res.data) {
        // Results are handled by the parent component
      }
      
      // Refresh after scraping
      if (onAfterScrape) {
        await onAfterScrape()
      }
    } catch (error) {
      console.error('Batch scrape failed:', error)
    } finally {
      setIsScraping(false)
    }
  }

  // Handle batch discovery cancel
  const handleBatchDiscoveryCancel = () => {
    setBatchDiscoveryDialog(null)
    setIsScraping(false)
  }

  const handleStartScrape = async () => {
    if (selectedIds.length === 0) return
    
    // Get contacts that need preview (business_search)
    const contactsNeedingPreview = selectedIds
      .map(id => {
        const contact = contacts.find(c => c.id === id)
        return contact ? { id, contact } : null
      })
      .filter((item): item is { id: number; contact: Contact } => item !== null && needsPreview(item.contact))
    
    // Get contacts that don't need preview
    const contactsDirectScrape = selectedIds.filter(id => {
      const contact = contacts.find(c => c.id === id)
      return !contact || !needsPreview(contact)
    })

    setIsScraping(true)
    try {
      // Scrape contacts that don't need preview directly
      const directResults = await Promise.allSettled(
        contactsDirectScrape.map(async (contactId) => {
          const res = await scrapingApi.scrapeSingle(contactId)
          return { contactId, ...res }
        })
      )

      // Handle contacts that need preview
      // If multiple business_search contacts, use batch discovery
      if (contactsNeedingPreview.length > 1) {
        // Get uploadId from first contact (all should have same uploadId)
        const uploadId = contactsNeedingPreview[0].contact.csvUploadId
        if (uploadId) {
          try {
            // Use batch discovery API - request enough to cover all selected contacts
            // Request a larger limit to ensure we get the selected contacts
            const discoveryRes = await scrapingApi.discoverBatchWebsites(uploadId, 100)
            if (discoveryRes.success && discoveryRes.data) {
              const discoveryResults = discoveryRes.data.results
              // Filter to only include results for selected contacts
              const selectedContactIds = new Set(contactsNeedingPreview.map(c => c.id))
              const filteredResults = discoveryResults.filter(r => 
                selectedContactIds.has(r.contactId)
              )
              
              // Check if we have results for all selected contacts, or at least some
              const hasResults = filteredResults.length > 0 && filteredResults.some(r => r.success && r.data)
              
              if (hasResults) {
                // Show batch confirmation dialog with filtered results
                setBatchDiscoveryDialog({
                  isOpen: true,
                  results: filteredResults,
                  uploadId
                })
                // Don't scrape yet, wait for user confirmation
                setIsScraping(false)
                return
              } else {
                // Batch discovery didn't return results for selected contacts
                // This can happen if selected contacts aren't in the first batch
                // Fall through to individual discovery
                console.log('Batch discovery did not return results for selected contacts, falling back to individual discovery')
              }
            }
          } catch (error) {
            console.error('Batch discovery failed, falling back to individual discovery:', error)
            // Fall through to individual discovery
          }
        }
      }
      
      // If single contact or batch discovery failed, handle one at a time
      for (const { id, contact } of contactsNeedingPreview) {
        await scrapeContactWithPreview(id, contact)
        // Wait for user confirmation before proceeding to next
        // The preview dialog will handle the actual scraping
        if (previewDialog) {
          break // Stop here, let user confirm before proceeding
        }
      }

      // Refresh after all scraping is done
      if (onAfterScrape && contactsNeedingPreview.length === 0) {
        await onAfterScrape()
      }
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
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Loader overlay when scraping - covers entire modal */}
        {isScraping && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-center rounded-xl">
            <div className="flex flex-col items-center gap-4">
              <svg className="w-12 h-12 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-base font-semibold text-gray-800">Scraping contacts...</span>
              <span className="text-sm text-gray-600">Please wait while we process your selected contacts</span>
            </div>
          </div>
        )}
        
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
          {/* Search input */}
          <div className="mb-3">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setPage(1) // Reset to first page when searching
                }}
                placeholder="Search by website, business name, or email..."
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setPage(1)
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          
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
        <div className={`px-6 py-4 flex-1 min-h-0 ${isScraping ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          {filtered.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              {searchQuery ? 'No records found matching your search.' : 'No records for this filter.'}
            </div>
          ) : (
            <div className="space-y-2 pb-2">
              {paged.map(c => (
                <div key={c.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50">
                  {(c.status === 'ready_to_scrape' || c.status === 'scrape_failed') ? (
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(c.id)}
                      onChange={() => toggleSelect(c.id)}
                      className="h-4 w-4 text-indigo-600 border-gray-300 rounded cursor-pointer mt-1"
                    />
                  ) : (
                    <div className="w-4 h-4 mt-1" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {normalizeStatus(c.status) === 'scraping' && (
                          <svg className="w-4 h-4 animate-spin text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        )}
                        <div className="font-medium text-gray-900 truncate">{c.businessName || c.website || c.email || `Contact #${c.id}`}</div>
                      </div>
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

      {/* Website Preview Dialog */}
      {previewDialog && (
        <WebsitePreviewDialog
          isOpen={previewDialog.isOpen}
          businessName={previewDialog.businessName}
          discoveredWebsite={previewDialog.discoveredWebsite}
          confidence={previewDialog.confidence}
          searchQuery={previewDialog.searchQuery}
          onConfirm={handlePreviewConfirm}
          onCancel={handlePreviewCancel}
          onVisitWebsite={handleVisitWebsite}
          isLoading={isScraping}
        />
      )}

      {/* Batch Website Confirmation Dialog */}
      {batchDiscoveryDialog && (
        <BatchWebsiteConfirmationDialog
          isOpen={batchDiscoveryDialog.isOpen}
          results={batchDiscoveryDialog.results}
          onConfirm={handleBatchDiscoveryConfirm}
          onCancel={handleBatchDiscoveryCancel}
          isLoading={isScraping}
        />
      )}
    </div>
  )
}

export default ScrapeStatusBrowser


