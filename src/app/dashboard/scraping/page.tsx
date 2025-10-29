'use client'

import { useState, useEffect } from 'react'
import { AuthGuard } from '@/components/auth/AuthGuard'
 
import Link from 'next/link'
import { ScrapeStatusBrowser } from '@/components/scraping/ScrapeStatusBrowser'
import { scrapingApi } from '@/api/scraping'
import { ingestionApi } from '@/api/ingestion'
import { useAuthContext } from '@/contexts/AuthContext'
import type { ReadyContact, StatsResponse, ScrapeSingleResponseData } from '@/types/scraping'

 

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
  const [availableUploads, setAvailableUploads] = useState<Array<{ id: number; totalRecords: number; successfulRecords: number }>>([])
  const [selectedContactIds, setSelectedContactIds] = useState<number[]>([])
  const [scrapingStatus, setScrapingStatus] = useState<Record<number, 'scraping' | 'scraped' | 'failed' | null>>({})
  const [scrapedContactDetails, setScrapedContactDetails] = useState<Record<number, ScrapeSingleResponseData>>({})
  // Pagination for ready contacts (client-side)
  const [readyPage, setReadyPage] = useState(1)
  const [readyPageSize, setReadyPageSize] = useState(20)
  // Status modal
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'ready_to_scrape' | 'scraping' | 'scraped' | 'scrape_failed'>('all')

  // Tentatively read last uploadId (will be validated against the logged-in client's uploads)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const lastUploadId = localStorage.getItem('lastUploadId')
      if (lastUploadId) {
        setCurrentUploadId(Number(lastUploadId))
        console.log('[SCRAPING] Tentative uploadId from localStorage:', lastUploadId)
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
        setAvailableUploads(uploads.map(u => ({ id: u.id, totalRecords: u.totalRecords, successfulRecords: u.successfulRecords })))
        const allowedIds = new Set(uploads.map(u => u.id))
        // If current uploadId is not owned by this client, clear it
        if (currentUploadId && !allowedIds.has(currentUploadId)) {
          console.warn('[SCRAPING] Clearing uploadId from another account:', currentUploadId)
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
          console.log('[SCRAPING] Auto-selected latest uploadId from DB:', latest.id)
        }
      } else if (!res.success) {
        console.log('[SCRAPING] Failed to load uploads:', res.error)
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
      console.log('[SCRAPING] Stats fetched:', res.data.stats)
    } else {
      setApiError(res.error || 'Failed to fetch stats')
      console.log('[SCRAPING] Stats fetch failed:', res.error)
    }
    
  }

  const fetchReadyContacts = async (limit?: number) => {
    if (!currentUploadId) return
    setApiError(null)
    const res = await scrapingApi.getReadyContacts(currentUploadId, limit)
    if (res.success && res.data) {
      setReadyContacts(res.data.contacts)
      console.log('[SCRAPING] Ready contacts:', {
        count: res.data.count,
        ids: res.data.contacts.map(c => c.id).slice(0, 10)
      })
    } else {
      setApiError(res.error || 'Failed to fetch ready contacts')
      console.log('[SCRAPING] Ready contacts fetch failed:', res.error)
    }
    
  }

  // Fetch stats and selected upload's contacts together, then reveal records and actions
  const fetchStatsAndShowRecords = async (limit: number = 20) => {
    if (!currentUploadId) return
    setIsLoadingCombined(true)
    setApiError(null)
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
    if (!currentUploadId) return
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
      // If specific contacts are selected, scrape them individually
      if (selectedContactIds.length > 0) {
        console.log('[SCRAPING] Scraping selected contacts individually')
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
        // Use batch API for unselected scraping
        const res = await scrapingApi.scrapeBatch(currentUploadId, limit)
        if (res.success && res.data) {
          console.log('[SCRAPING] Batch summary:', res.data.summary)
          res.data.results.forEach(item => {
            const status = item.success ? 'scraped' : 'failed'
            setScrapingStatus(prev => ({ ...prev, [item.contactId]: status }))
            if (item.success && 'scrapedData' in item && item.scrapedData) {
              setScrapedContactDetails(prev => ({ ...prev, [item.contactId]: item.scrapedData as ScrapeSingleResponseData }))
            }
            console.log(`[SCRAPING] Contact ${item.contactId}: ${status}`)
          })
        } else {
          // Mark all contacts as failed on API error
          contactsToScrape.forEach(id => {
            setScrapingStatus(prev => ({ ...prev, [id]: 'failed' }))
          })
          setApiError(res.error || 'Batch scrape failed')
          console.log('[SCRAPING] Batch scrape failed:', res.error)
        }
      }
      
      // Refresh stats only, keep contacts visible
      await fetchStats()
    } catch (error) {
      console.error('[SCRAPING] Batch scrape exception:', error)
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
        console.log('[SCRAPING] Single contact scraped:', {
          contactId: res.data.contactId,
          success: res.data.success,
          message: res.data.message
        })
        // Refresh stats only, keep contacts visible
        await fetchStats()
      } else {
        setScrapingStatus(prev => ({ ...prev, [contactId]: 'failed' }))
        setApiError(res.error || `Failed to scrape contact ${contactId}`)
        console.log('[SCRAPING] Single contact scrape failed:', res.error)
      }
    } catch (error) {
      console.error('[SCRAPING] Single contact scrape exception:', error)
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
                    <>Active upload: <span className="font-medium">{currentUploadId}</span></>
                  ) : (
                    <span>Select an upload to enable actions</span>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Choose an upload</label>
                  <select
                    value={currentUploadId ?? ''}
                    onChange={async (e) => {
                      const val = Number(e.target.value)
                      if (!Number.isFinite(val)) return
                      setCurrentUploadId(val)
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('lastUploadId', String(val))
                      }
                      // Reset; fetching happens when user clicks the button
                      setStats(null)
                      setReadyContacts([])
                      setHasFetchedReadyAndStats(false)
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
                    disabled={isLoadingUploads || availableUploads.length === 0}
                  >
                    <option value="" disabled>{isLoadingUploads ? 'Loading uploads…' : 'Select an upload'}</option>
                    {availableUploads.map(u => (
                      <option key={u.id} value={u.id}>
                        Upload #{u.id} • {u.totalRecords} records • {u.successfulRecords} successful
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 flex items-center flex-wrap gap-3">
                {!hasFetchedReadyAndStats && (
                  <button
                    onClick={() => fetchStatsAndShowRecords(20)}
                    disabled={!currentUploadId || isLoadingCombined}
                    className="bg-indigo-700 text-white px-3 py-2 rounded-lg hover:bg-indigo-800 disabled:bg-gray-400 text-sm"
                  >
                    {isLoadingCombined ? 'Fetching…' : 'Fetch and show records'}
                  </button>
                )}
                {hasFetchedReadyAndStats && null}
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
                <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <button onClick={() => { setStatusFilter('all'); setIsStatusOpen(true) }} className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-md text-left">
                    <div className="flex items-center justify-between mb-2">
                      <svg className="w-8 h-8 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <div className="text-3xl font-bold">{stats.totalContacts}</div>
                    <div className="text-sm text-blue-100 mt-1">Total Contacts</div>
                  </button>
                  <button onClick={() => { setStatusFilter('scraped'); setIsStatusOpen(true) }} className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white shadow-md text-left">
                    <div className="flex items-center justify-between mb-2">
                      <svg className="w-8 h-8 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="text-3xl font-bold">{stats.scraped}</div>
                    <div className="text-sm text-green-100 mt-1">Successfully Scraped</div>
                  </button>
                  <button onClick={() => { setStatusFilter('ready_to_scrape'); setIsStatusOpen(true) }} className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-5 text-white shadow-md text-left">
                    <div className="flex items-center justify-between mb-2">
                      <svg className="w-8 h-8 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                  </div>
                    <div className="text-3xl font-bold">{stats.readyToScrape}</div>
                    <div className="text-sm text-yellow-100 mt-1">Ready to Scrape</div>
                  </button>
                  <button onClick={() => { setStatusFilter('scrape_failed'); setIsStatusOpen(true) }} className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-5 text-white shadow-md text-left">
                    <div className="flex items-center justify-between mb-2">
                      <svg className="w-8 h-8 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                  </div>
                    <div className="text-3xl font-bold">{stats.scrapeFailed}</div>
                    <div className="text-sm text-red-100 mt-1">Failed</div>
                  </button>
                </div>
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