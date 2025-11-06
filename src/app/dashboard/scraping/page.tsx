'use client'

import { useState, useEffect } from 'react'
import { AuthGuard } from '@/components/auth/AuthGuard'
 
import Link from 'next/link'
import { ScrapeStatusBrowser } from '@/components/scraping/ScrapeStatusBrowser'
import { ScrapingStats } from '@/components/scraping/ScrapingStats'
import { scrapingApi } from '@/api/scraping'
import { ingestionApi } from '@/api/ingestion'
import { useAuthContext } from '@/contexts/AuthContext'
import type { ReadyContact, StatsResponse, ScrapeSingleResponseData } from '@/types/scraping'
import type { ClientContact } from '@/types/ingestion'

 

export default function ScrapingPage() {
  const { client } = useAuthContext()
  

  // Backend scraping controls
  const [currentUploadId, setCurrentUploadId] = useState<number | null>(null)
  const [stats, setStats] = useState<StatsResponse['stats'] | null>(null)
  const [readyContacts, setReadyContacts] = useState<ReadyContact[]>([])
  const [isLoadingCombined, setIsLoadingCombined] = useState(false)
  const [hasFetchedReadyAndStats, setHasFetchedReadyAndStats] = useState(false)
  const [isBatching, setIsBatching] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [isLoadingUploads, setIsLoadingUploads] = useState(false)
  const [availableUploads, setAvailableUploads] = useState<Array<{ id: number; fileName: string; totalRecords: number; successfulRecords: number }>>([])
  const [selectedContactIds, setSelectedContactIds] = useState<number[]>([])
  const [scrapingStatus, setScrapingStatus] = useState<Record<number, 'scraping' | 'scraped' | 'failed' | null>>({})
  const [scrapedContactDetails, setScrapedContactDetails] = useState<Record<number, ScrapeSingleResponseData>>({})
  // Pagination for ready contacts (client-side)
  const [readyPage, setReadyPage] = useState(1)
  const [readyPageSize, setReadyPageSize] = useState(20)
  // Status modal
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'ready_to_scrape' | 'scraping' | 'scraped' | 'scrape_failed'>('all')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isFetchingAllContacts, setIsFetchingAllContacts] = useState(false)
  const [showAllContacts, setShowAllContacts] = useState(false)

  // Tentatively read last uploadId (will be validated against the logged-in client's uploads)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const lastUploadId = localStorage.getItem('lastUploadId')
      if (lastUploadId) {
        setCurrentUploadId(Number(lastUploadId))
      }
    }
  }, [])

  // Also load uploads from DB for the authenticated client and auto-pick the latest
  useEffect(() => {
    const loadUploads = async () => {
      if (!client?.id) return
      setIsLoadingUploads(true)
      const res = await ingestionApi.getClientUploads()
      if (res.success && res.data) {
        const uploads = res.data
        // Store for optional UI selection later
        setAvailableUploads(uploads.map(u => ({ id: u.id, fileName: u.fileName || `upload_${u.id}.csv`, totalRecords: u.totalRecords, successfulRecords: u.successfulRecords })))
        const allowedIds = new Set(uploads.map(u => u.id))
        // If current uploadId is not owned by this client, clear it
        if (currentUploadId && !allowedIds.has(currentUploadId)) {
          setCurrentUploadId(null)
          if (typeof window !== 'undefined') {
            localStorage.removeItem('lastUploadId')
          }
        }
        // If no valid current uploadId, pick the most recent (first item)
        if ((!currentUploadId || !allowedIds.has(currentUploadId)) && uploads.length > 0) {
          const latest = uploads[0]
          setCurrentUploadId(latest.id)
          if (typeof window !== 'undefined') {
            localStorage.setItem('lastUploadId', String(latest.id))
          }
        }
      }
      setIsLoadingUploads(false)
    }
    loadUploads()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client?.id])

  

  const handleContactSelect = (contactId: number) => {
    setSelectedContactIds(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    )
  }

  const handleSelectAllContacts = () => {
    // Select only the contacts visible on the current page
    const start = (readyPage - 1) * readyPageSize
    const end = readyPage * readyPageSize
    const visibleIds = readyContacts.slice(start, end).map(c => c.id)
    setSelectedContactIds(visibleIds)
  }

  const handleClearAllContacts = () => {
    setSelectedContactIds([])
  }

  

  // ===== Backend API integration (batch, stats, ready) =====
  

  const fetchStats = async () => {
    if (!currentUploadId) return
    setApiError(null)
    const res = await scrapingApi.getStats(currentUploadId)
    if (res.success && res.data) {
      setStats(res.data.stats)
    } else {
      setApiError(res.error || 'Failed to fetch stats')
    }
  }

  const fetchReadyContacts = async (limit?: number) => {
    if (!currentUploadId) return
    setApiError(null)
    const res = await scrapingApi.getReadyContacts(currentUploadId, limit)
    if (res.success && res.data) {
      setReadyContacts(res.data.contacts)
    } else {
      setApiError(res.error || 'Failed to fetch ready contacts')
    }
  }

  // Fetch all client contacts (from all CSV uploads)
  const fetchAllClientContacts = async (limit?: number) => {
    setIsFetchingAllContacts(true)
    setApiError(null)
    setShowAllContacts(true)
    try {
      const res = await ingestionApi.getAllClientContacts(limit || 50)
      if (res.success && res.data) {
        // Transform ClientContact[] to ReadyContact[]
        const transformed: ReadyContact[] = res.data.contacts.map((c: ClientContact): ReadyContact => ({
          id: c.id,
          csvUploadId: c.csvUploadId,
          businessName: c.businessName,
          website: c.website,
          email: c.email,
          state: c.state,
          zipCode: c.zipCode,
          status: (c.status || 'ready_to_scrape') as ReadyContact['status'],
          scrapeMethod: undefined,
          scrapePriority: undefined,
        }))
        setReadyContacts(transformed)
        setHasFetchedReadyAndStats(true)
        // Auto-open modal to manage records
        setStatusFilter('all')
        setIsStatusOpen(true)
      } else {
        setApiError(res.error || 'Failed to fetch all client contacts')
      }
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Failed to fetch all client contacts')
    } finally {
      setIsFetchingAllContacts(false)
    }
  }

  // Fetch stats and selected upload's contacts together, then reveal records and actions
  const fetchStatsAndShowRecords = async (limit: number = 20) => {
    if (!currentUploadId) return
    setIsLoadingCombined(true)
    setApiError(null)
    setShowAllContacts(false)
    try {
      await Promise.all([
        (async () => {
          const res = await scrapingApi.getStats(currentUploadId)
          if (res.success && res.data) {
            setStats(res.data.stats)
          } else {
            setApiError(res.error || 'Failed to fetch stats')
          }
        })(),
        (async () => {
          const res = await ingestionApi.getUploadDetails(currentUploadId)
          if (res.success && res.data) {
            type UnknownContact = Record<string, unknown>
            const upload = res.data as { contacts?: UnknownContact[] }
            const mapped = (upload.contacts || []).map((c): ReadyContact => ({
              id: Number(c.id as number),
              csvUploadId: currentUploadId!,
              businessName: (c.businessName as string) || undefined,
              website: (c.website as string) || undefined,
              email: (c.email as string) || undefined,
              state: (c.state as string) || undefined,
              zipCode: (c.zipCode as string) || undefined,
              status: ((c.status as string | undefined) || 'ready_to_scrape') as ReadyContact['status'],
            }))
            setReadyContacts(mapped)
          } else {
            setApiError(res.error || 'Failed to fetch upload contacts')
          }
        })()
      ])
      setHasFetchedReadyAndStats(true)
      // Auto-open modal to manage records inside component
      setStatusFilter('all')
      setIsStatusOpen(true)
    } finally {
      setIsLoadingCombined(false)
    }
  }

  const startBatchScraping = async (limit: number = 20) => {
    setIsBatching(true)
    setApiError(null)
    
    // Determine which contacts to scrape
    const contactsToScrape = selectedContactIds.length > 0 
      ? selectedContactIds 
      : readyContacts.slice(0, limit).map(c => c.id)
    
    // Mark contacts as scraping
    contactsToScrape.forEach(id => {
      setScrapingStatus(prev => ({ ...prev, [id]: 'scraping' }))
    })
    
    try {
      // If specific contacts are selected, scrape them individually (works with or without currentUploadId)
      if (selectedContactIds.length > 0) {
        const results = await Promise.allSettled(
          selectedContactIds.map(async (contactId) => {
            const res = await scrapingApi.scrapeSingle(contactId)
            return { contactId, ...res }
          })
        )
        
        results.forEach((result, index) => {
          const contactId = selectedContactIds[index]
          if (result.status === 'fulfilled' && result.value.success && result.value.data) {
            const status = result.value.data.success ? 'scraped' : 'failed'
            setScrapingStatus(prev => ({ ...prev, [contactId]: status }))
            if (result.value.data.success && result.value.data.data) {
              setScrapedContactDetails(prev => ({ ...prev, [contactId]: result.value.data!.data! }))
            }
          } else {
            setScrapingStatus(prev => ({ ...prev, [contactId]: 'failed' }))
          }
        })
        
        // Clear selection after scraping
        setSelectedContactIds([])
      } else {
        // Use batch API for unselected scraping (requires currentUploadId)
        if (!currentUploadId) {
          setApiError('Please select a CSV file to use batch scraping')
          contactsToScrape.forEach(id => {
            setScrapingStatus(prev => ({ ...prev, [id]: null }))
          })
          return
        }
        
        const res = await scrapingApi.scrapeBatch(currentUploadId, limit)
        if (res.success && res.data) {
          res.data.results.forEach(item => {
            const status = item.success ? 'scraped' : 'failed'
            setScrapingStatus(prev => ({ ...prev, [item.contactId]: status }))
            if (item.success && 'scrapedData' in item && item.scrapedData) {
              setScrapedContactDetails(prev => ({ ...prev, [item.contactId]: item.scrapedData as ScrapeSingleResponseData }))
            }
          })
        } else {
          // Mark all contacts as failed on API error
          contactsToScrape.forEach(id => {
            setScrapingStatus(prev => ({ ...prev, [id]: 'failed' }))
          })
          setApiError(res.error || 'Batch scrape failed')
        }
      }
      
      // Refresh stats only if we have a currentUploadId
      if (currentUploadId && !showAllContacts) {
        await fetchStats()
      }
    } catch (error) {
      contactsToScrape.forEach(id => {
        setScrapingStatus(prev => ({ ...prev, [id]: 'failed' }))
      })
      setApiError(error instanceof Error ? error.message : 'Batch scrape failed')
    } finally {
      setIsBatching(false)
    }
  }

  const scrapeSingleContact = async (contactId: number) => {
    setApiError(null)
    setScrapingStatus(prev => ({ ...prev, [contactId]: 'scraping' }))
    try {
      const res = await scrapingApi.scrapeSingle(contactId)
      if (res.success && res.data) {
        const status = res.data.success ? 'scraped' : 'failed'
        setScrapingStatus(prev => ({ ...prev, [contactId]: status }))
        if (res.data.data) {
          setScrapedContactDetails(prev => ({ ...prev, [contactId]: res.data!.data! }))
        }
        // Refresh stats only, keep contacts visible
        await fetchStats()
      } else {
        setScrapingStatus(prev => ({ ...prev, [contactId]: 'failed' }))
        setApiError(res.error || `Failed to scrape contact ${contactId}`)
      }
    } catch (error) {
      setScrapingStatus(prev => ({ ...prev, [contactId]: 'failed' }))
      setApiError(error instanceof Error ? error.message : `Failed to scrape contact ${contactId}`)
    }
  }

  // Start scraping from modal selection
  const handleStartScrapeSelected = async (ids: number[]) => {
    if (ids.length === 0) return
    setIsStatusOpen(false)
    setSelectedContactIds(ids)
    await startBatchScraping(ids.length)
  }

  return (
    <AuthGuard>
      <div className="bg-gray-50 min-h-screen">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="space-y-6">
            {/* Page Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-lg">
              <div className="flex items-center justify-between">
            <div>
                  <Link href="/dashboard" className="text-white/80 hover:text-white text-sm mb-2 inline-flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Dashboard
              </Link>
                  <h1 className="text-3xl font-bold mb-2">Web Scraping</h1>
                  <p className="text-indigo-100 text-lg">Configure and run web scraping jobs to collect contact information.</p>
                </div>
                <div className="hidden md:block">
                  <div className="h-20 w-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Backend Scraping Controls */}
            <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-100">
              <div className="flex items-center space-x-3 mb-6">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Backend Scraping</h3>
              </div>
              <div className="space-y-3">
                <div className="text-sm text-gray-700">
                  {currentUploadId ? (
                    <>
                      Active file: <span className="font-medium text-gray-900">
                        {availableUploads.find(u => u.id === currentUploadId)?.fileName || `File #${currentUploadId}`}
                      </span>
                    </>
                  ) : (
                    <span>Select a CSV file to enable actions</span>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select CSV File</label>
                  <div className="relative">
                    {isLoadingUploads ? (
                      <div className="space-y-2 border border-gray-300 rounded-lg bg-white p-4">
                        <div className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>
                        <div className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>
                        <div className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>
                      </div>
                    ) : availableUploads.length === 0 ? (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-white">
                        <p className="text-sm text-gray-500">No CSV files uploaded yet</p>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                          className="w-full flex items-center justify-between border border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:border-gray-400 cursor-pointer"
                        >
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            {currentUploadId ? (
                              <>
                                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="truncate">
                                  {availableUploads.find(u => u.id === currentUploadId)?.fileName || 'Select a file'}
                                </span>
                              </>
                            ) : (
                              <span className="text-gray-500">Select a CSV file</span>
                            )}
                          </div>
                          <svg
                            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'transform rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        
                        {isDropdownOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setIsDropdownOpen(false)}
                            ></div>
                            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-hidden">
                              <div className="overflow-y-auto max-h-64">
                                {availableUploads.map(u => {
                                  const isSelected = currentUploadId === u.id
                                  return (
                                    <button
                                      key={u.id}
                                      type="button"
                                      onClick={async () => {
                                        setCurrentUploadId(u.id)
                                        setIsDropdownOpen(false)
                                        if (typeof window !== 'undefined') {
                                          localStorage.setItem('lastUploadId', String(u.id))
                                        }
                                        // Reset; fetching happens when user clicks the button
                                        setStats(null)
                                        setReadyContacts([])
                                        setHasFetchedReadyAndStats(false)
                                      }}
                                      className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors cursor-pointer ${
                                        isSelected
                                          ? 'bg-indigo-50 text-indigo-900'
                                          : 'hover:bg-gray-50 text-gray-900'
                                      } ${u.id !== availableUploads[availableUploads.length - 1].id ? 'border-b border-gray-100' : ''}`}
                                    >
                                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                                        <svg className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-indigo-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <div className="flex-1 min-w-0">
                                          <p className={`text-sm font-medium truncate ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}>
                                            {u.fileName}
                                          </p>
                                          <p className={`text-xs mt-0.5 ${isSelected ? 'text-indigo-700' : 'text-gray-500'}`}>
                                            {u.totalRecords} records
                                          </p>
                                        </div>
                                      </div>
                                      {isSelected && (
                                        <svg className="w-5 h-5 text-indigo-600 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                      )}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center flex-wrap gap-3">
                {!hasFetchedReadyAndStats && (
                  <>
                    {isLoadingCombined || isFetchingAllContacts ? (
                      <div className="w-full">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="bg-gray-200 rounded-xl p-5 animate-pulse">
                              <div className="h-8 w-8 bg-gray-300 rounded-lg mb-2"></div>
                              <div className="h-8 bg-gray-300 rounded mb-2"></div>
                              <div className="h-4 bg-gray-300 rounded w-2/3"></div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-6 space-y-3">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse"></div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => fetchStatsAndShowRecords(20)}
                          disabled={!currentUploadId}
                          className="bg-indigo-700 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-800 disabled:bg-gray-400 text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed"
                        >
                          Fetch and show records
                        </button>
                        <button
                          onClick={() => fetchAllClientContacts(50)}
                          disabled={isFetchingAllContacts}
                          className="bg-purple-700 text-white px-4 py-2.5 rounded-lg hover:bg-purple-800 disabled:bg-gray-400 text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center space-x-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                          </svg>
                          <span>Get All Contacts</span>
                        </button>
                      </>
                    )}
                  </>
                )}
                {hasFetchedReadyAndStats && showAllContacts && (
                  <div className="text-sm text-gray-600 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
                    Showing all contacts from all CSV uploads
                  </div>
                )}
              </div>

              {apiError && (
                <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
                  <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{apiError}</span>
                </div>
              )}

              {/* Stats preview */}
              {stats && (
                <ScrapingStats 
                  stats={stats} 
                  onStatClick={(filter) => {
                    setStatusFilter(filter)
                    setIsStatusOpen(true)
                  }}
                />
              )}

              {/* Ready contacts preview removed - showing full checklist below instead */}
            </div>

            {/* Backend Contacts Checklist replaced by modal-driven flow */}
            {false ? (
              <div className="bg-white rounded-lg shadow-lg border border-gray-100">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 rounded-t-lg text-white">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="h-10 w-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Select Websites to Scrape</h3>
                      <p className="text-indigo-100 text-sm mt-1">Choose which CSV records you want to scrape</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {readyContacts
                      .slice((readyPage - 1) * readyPageSize, readyPage * readyPageSize)
                      .map((contact) => (
                      <div key={contact.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <input
                          type="checkbox"
                          id={`contact-${contact.id}`}
                          checked={selectedContactIds.includes(contact.id)}
                          onChange={() => handleContactSelect(contact.id)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`contact-${contact.id}`} className="flex-1 cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="font-medium text-gray-900">
                                  {contact.businessName || contact.website || contact.email || `Contact #${contact.id}`}
                                </div>
                                {/* Show status from backend or current scraping state */}
                                {(scrapingStatus[contact.id] === 'scraping' || contact.status === 'scraping') && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    <span className="-ml-1 mr-1 h-3 w-3 rounded bg-slate-200 animate-pulse inline-block"></span>
                                    Scraping...
                                  </span>
                                )}
                                {(scrapingStatus[contact.id] === 'scraped' || contact.status === 'scraped') && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    ✓ Scraped
                                  </span>
                                )}
                                {(scrapingStatus[contact.id] === 'failed' || contact.status === 'scrape_failed') && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    ✗ Failed
                                  </span>
                                )}
                              </div>
                              {/* Show scraped details if available */}
                              {scrapingStatus[contact.id] === 'scraped' && scrapedContactDetails[contact.id] && (
                                <div className="text-xs text-green-700 mb-1">
                                  ✓ {scrapedContactDetails[contact.id].pageTitle || 'Scraped successfully'}
                                  {scrapedContactDetails[contact.id].extractedEmails && scrapedContactDetails[contact.id].extractedEmails!.length > 0 && (
                                    <span className="ml-2">• {scrapedContactDetails[contact.id].extractedEmails!.length} emails found</span>
                                  )}
                                </div>
                              )}
                              <div className="text-sm text-gray-600 mb-1">
                                {(() => {
                                  // Priority 1: Direct website URL
                                  if (contact.website) {
                                    return (
                                      <div className="flex items-center space-x-1">
                                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                        <span className="text-green-700 font-medium">Website: {contact.website}</span>
                                      </div>
                                    )
                                  }
                                  
                                  // Priority 2: Use scrape method badge
                                  return (
                                    <div className="flex items-center space-x-1">
                                      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                      </svg>
                                      <span className="text-indigo-700 font-medium">Method: {contact.scrapeMethod || 'auto'}</span>
                                    </div>
                                  )
                                })()}
                              </div>
                            </div>
                            <div className="text-xs text-gray-400 ml-4">
                              #{contact.id}
                            </div>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <button 
                        onClick={handleSelectAllContacts}
                        className="text-sm text-indigo-600 hover:text-indigo-800"
                      >
                        Select All
                      </button>
                      <button 
                        onClick={handleClearAllContacts}
                        className="text-sm text-indigo-600 hover:text-indigo-800"
                      >
                        Clear All
                      </button>
                      <span className="text-sm text-gray-500">
                        {selectedContactIds.length} selected • Page {readyPage} of {Math.max(1, Math.ceil(readyContacts.length / readyPageSize))}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setReadyPage(p => Math.max(1, p - 1))}
                        disabled={readyPage === 1}
                        className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setReadyPage(p => Math.min(Math.ceil(readyContacts.length / readyPageSize), p + 1))}
                        disabled={readyPage >= Math.ceil(readyContacts.length / readyPageSize)}
                        className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 disabled:opacity-50"
                      >
                        Next
                      </button>
                      <select
                        value={readyPageSize}
                        onChange={(e) => { setReadyPageSize(Number(e.target.value)); setReadyPage(1) }}
                        className="ml-2 px-2 py-2 text-sm rounded-lg border border-gray-300 text-gray-700"
                      >
                        <option value={10}>10 / page</option>
                        <option value={20}>20 / page</option>
                        <option value={50}>50 / page</option>
                      </select>
                    </div>
                    <button 
                      onClick={() => startBatchScraping(selectedContactIds.length)}
                      disabled={selectedContactIds.length === 0 || isBatching}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isBatching ? 'Scraping...' : `Start Scraping ${selectedContactIds.length} Selected`}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-lg border border-gray-100 p-12 text-center">
                <div className="text-gray-400 mb-6">
                  <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No CSV Data Available</h3>
                <p className="text-gray-500 mb-6 text-lg">Upload a CSV file first to see records for scraping</p>
                <a 
                  href="/dashboard/csv-ingestion" 
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 shadow-md font-medium"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Go to CSV Upload
                </a>
              </div>
            )}

            {/* Demo loader/results removed in favor of modal-driven flow */}
          </div>
        </div>
      </div>
      {/* Status Browser Modal */}
      <ScrapeStatusBrowser
        isOpen={isStatusOpen}
        onClose={() => setIsStatusOpen(false)}
        contacts={readyContacts}
        initialFilter={statusFilter}
        onRequestReadyFetch={() => fetchReadyContacts(readyPageSize)}
        onAfterScrape={async () => { await fetchStats(); await fetchReadyContacts(readyPageSize) }}
      />
    </AuthGuard>
  )
}