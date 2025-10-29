'use client'

import { useState, useEffect } from 'react'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { useData } from '@/contexts/DataContext'
import { CSVRecord } from '@/types/ingestion'
import Link from 'next/link'
import { ScrapeStatusBrowser } from '@/components/scraping/ScrapeStatusBrowser'
import { scrapingApi } from '@/api/scraping'
import { ingestionApi } from '@/api/ingestion'
import { useAuthContext } from '@/contexts/AuthContext'
import type { ReadyContact, StatsResponse, ScrapeSingleResponseData } from '@/types/scraping'

interface ScrapedRecord {
  business_name?: string
  zipcode?: string
  state?: string
  phone_number?: string
  website?: string
  email?: string
  source: string
  scraped_at: string
  original_record_index?: number
  target_url?: string
  extraction_method?: string
  confidence?: string
  scraped_website?: string
  scraped_contacts?: Array<{ type: string; value: string }>
  scraped_social_media?: Array<{ platform: string; url: string }>
  [key: string]: string | number | Array<{ type: string; value: string }> | Array<{ platform: string; url: string }> | undefined
}

export default function ScrapingPage() {
  const { csvData, scrapedData, combinedData } = useData()
  const { client } = useAuthContext()
  const [selectedRecords, setSelectedRecords] = useState<number[]>([])
  const [isScraping, setIsScraping] = useState(false)

  // Backend scraping controls
  const [uploadIdInput, setUploadIdInput] = useState<string>('')
  const [currentUploadId, setCurrentUploadId] = useState<number | null>(null)
  const [stats, setStats] = useState<StatsResponse['stats'] | null>(null)
  const [readyContacts, setReadyContacts] = useState<ReadyContact[]>([])
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [isLoadingReady, setIsLoadingReady] = useState(false)
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
        setUploadIdInput(lastUploadId)
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
          setUploadIdInput('')
          if (typeof window !== 'undefined') {
            localStorage.removeItem('lastUploadId')
          }
        }
        // If no valid current uploadId, pick the most recent (first item)
        if ((!currentUploadId || !allowedIds.has(currentUploadId)) && uploads.length > 0) {
          const latest = uploads[0]
          setCurrentUploadId(latest.id)
          setUploadIdInput(String(latest.id))
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

  const handleRecordSelect = (index: number) => {
    setSelectedRecords(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    )
  }

  const handleSelectAll = () => {
    setSelectedRecords(csvData.map((_, index) => index))
  }

  const handleClearAll = () => {
    setSelectedRecords([])
  }

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

  const isGeneralEmailDomain = (domain: string) => {
    const generalDomains = [
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
      'icloud.com', 'protonmail.com', 'yandex.com', 'mail.com', 'zoho.com',
      'live.com', 'msn.com', 'comcast.net', 'verizon.net', 'att.net'
    ]
    return generalDomains.includes(domain.toLowerCase())
  }

  const extractUrlFromRecord = (record: CSVRecord) => {
    // Priority 1: Direct website URL
    if (record.website) {
      return {
        url: record.website,
        method: 'direct_website',
        confidence: 'high'
      }
    }
    
    // Priority 2: Email domain (only if it's a custom domain, not general)
    if (record.email && record.email.includes('@')) {
      const domain = record.email.split('@')[1]
      
      // Skip general email domains (gmail, yahoo, etc.) - they're useless for finding business websites
      if (isGeneralEmailDomain(domain)) {
        // Fall through to Google search
      } else {
        return {
          url: `https://www.${domain}`,
          method: 'email_domain',
          confidence: 'medium'
        }
      }
    }
    
    // Priority 3: Google search with business name + location
    const searchTerms = [record.business_name || record.company_name || record.name]
    if (record.state) searchTerms.push(record.state)
    if (record.zip_code || record.zip) searchTerms.push(record.zip_code || record.zip)
    
    return {
      url: `https://www.google.com/search?q=${encodeURIComponent(searchTerms.join(' '))}`,
      method: 'google_search',
      confidence: 'low'
    }
  }

  const [scrapingResults, setScrapingResults] = useState<ScrapedRecord[]>([])
  const [showResults, setShowResults] = useState(false)

  const handleStartScraping = async () => {
    if (selectedRecords.length === 0) {
      return
    }

    setIsScraping(true)
    setShowResults(false)
    
    // Simulate scraping process
    setTimeout(() => {
      const scrapedData = selectedRecords.map(index => {
        const record = csvData[index]
        const urlInfo = extractUrlFromRecord(record)
        
        return {
          ...record,
          source: 'scraped',
          scraped_at: new Date().toISOString(),
          original_record_index: index,
          target_url: urlInfo.url,
          extraction_method: urlInfo.method,
          confidence: urlInfo.confidence,
          // Simulated scraped data
          scraped_website: urlInfo.url,
          scraped_contacts: [
            { type: 'email', value: record.email || 'contact@example.com' },
            { type: 'phone', value: record.phone_number || '(555) 123-4567' }
          ],
          scraped_social_media: [
            { platform: 'LinkedIn', url: 'https://linkedin.com/company/example' },
            { platform: 'Facebook', url: 'https://facebook.com/example' }
          ]
        }
      })
      
      // Add scraped data to global context
      // This would be handled by the data context
      setScrapingResults(scrapedData)
      setIsScraping(false)
      setShowResults(true)
      setSelectedRecords([])
    }, 3000)
  }

  // ===== Backend API integration (batch, stats, ready) =====
  const applyUploadId = () => {
    const parsed = Number(uploadIdInput)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      alert('Enter a valid uploadId (number)')
      return
    }
    setCurrentUploadId(parsed)
    setStats(null)
    setReadyContacts([])
    setApiError(null)
  }

  const fetchStats = async () => {
    if (!currentUploadId) return
    setIsLoadingStats(true)
    setApiError(null)
    const res = await scrapingApi.getStats(currentUploadId)
    if (res.success && res.data) {
      setStats(res.data.stats)
      console.log('[SCRAPING] Stats fetched:', res.data.stats)
    } else {
      setApiError(res.error || 'Failed to fetch stats')
      console.log('[SCRAPING] Stats fetch failed:', res.error)
    }
    setIsLoadingStats(false)
  }

  const fetchReadyContacts = async (limit?: number) => {
    if (!currentUploadId) return
    setIsLoadingReady(true)
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
    setIsLoadingReady(false)
  }

  // Fetch stats and selected upload's contacts together, then reveal records and actions
  const fetchStatsAndShowRecords = async (limit: number = 20) => {
    if (!currentUploadId) return
    setIsLoadingCombined(true)
    setApiError(null)
    try {
      await Promise.all([
        (async () => {
          setIsLoadingStats(true)
          const res = await scrapingApi.getStats(currentUploadId)
          if (res.success && res.data) {
            setStats(res.data.stats)
          } else {
            setApiError(res.error || 'Failed to fetch stats')
          }
          setIsLoadingStats(false)
        })(),
        (async () => {
          setIsLoadingReady(true)
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
          setIsLoadingReady(false)
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
                      setUploadIdInput(String(val))
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

            {/* Scraping Loader */}
            {isScraping && (
              <div className="bg-white rounded-lg shadow-lg border border-gray-100 p-12 text-center">
                <div className="flex flex-col items-center space-y-4">
                  <div className="h-16 w-16 rounded-full bg-slate-200 animate-pulse"></div>
                  <div className="text-xl font-bold text-gray-900">Scraping in Progress...</div>
                  <div className="text-base text-gray-600">Processing {selectedRecords.length} selected records</div>
                </div>
              </div>
            )}

            {/* Scraping Results */}
            {showResults && scrapingResults.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg border border-gray-100">
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 rounded-t-lg text-white">
                  <div className="flex items-center space-x-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h3 className="text-xl font-bold">Scraping Results</h3>
                      <p className="text-green-100 text-sm mt-1">
                    Successfully scraped {scrapingResults.length} record{scrapingResults.length > 1 ? 's' : ''}
                  </p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  {scrapingResults.length === 1 ? (
                    // Single page result - detailed view
                    <div className="space-y-6">
                      <div className="bg-gray-50 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900">
                              {String(scrapingResults[0].business_name || scrapingResults[0].company_name || scrapingResults[0].name || 'Scraped Business')}
                            </h4>
                            <div className="text-sm text-gray-500 mt-1">
                              Method: {scrapingResults[0].extraction_method} • Confidence: {scrapingResults[0].confidence}
                            </div>
                          </div>
                          <div className="text-xs text-gray-400">
                            Record #{scrapingResults[0].original_record_index ? scrapingResults[0].original_record_index + 1 : 'Unknown'}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div>
                            <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                              <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              Contact Information
                            </h5>
                            <div className="space-y-2">
                              {scrapingResults[0].scraped_contacts?.map((contact, i: number) => (
                                <div key={i} className="flex items-center space-x-3 p-2 bg-white rounded border">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  <span className="text-sm font-medium text-gray-700">{contact.type}:</span>
                                  <span className="text-sm text-gray-600">{contact.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                              <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                              </svg>
                              Social Media Links
                            </h5>
                            <div className="space-y-2">
                              {scrapingResults[0].scraped_social_media?.map((social, i: number) => (
                                <div key={i} className="flex items-center space-x-3 p-2 bg-white rounded border">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  <span className="text-sm font-medium text-gray-700">{social.platform}:</span>
                                  <a href={social.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-800">
                                    {social.url}
                                  </a>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Multiple pages result - summary view
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {scrapingResults.map((result, index) => (
                          <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex-1">
                              <div className="font-medium text-gray-900 text-sm truncate">
                                {String(result.business_name || result.company_name || result.name || `Record ${index + 1}`)}
                              </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {result.extraction_method} • {result.confidence}
                                </div>
                              </div>
                              <div className="text-xs text-gray-400 ml-2">
                                #{result.original_record_index ? result.original_record_index + 1 : 'Unknown'}
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="text-xs text-gray-600">
                                <span className="font-medium">Contacts:</span> {result.scraped_contacts?.length || 0}
                              </div>
                              <div className="text-xs text-gray-600">
                                <span className="font-medium">Social:</span> {result.scraped_social_media?.length || 0}
                              </div>
                            </div>
                            
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <button className="text-xs text-indigo-600 hover:text-indigo-800">
                                View Details →
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Total Records:</span> {scrapingResults.length}
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Total Contacts:</span> {scrapingResults.reduce((sum, r) => sum + (r.scraped_contacts?.length || 0), 0)}
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Total Social Links:</span> {scrapingResults.reduce((sum, r) => sum + (r.scraped_social_media?.length || 0), 0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-6 flex items-center justify-between">
                    <button 
                      onClick={() => setShowResults(false)}
                      className="text-sm text-gray-600 hover:text-gray-800"
                    >
                      Hide Results
                    </button>
                    <button 
                      onClick={() => {
                        setShowResults(false)
                        setScrapingResults([])
                      }}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Clear Results
                    </button>
                  </div>
                </div>
              </div>
            )}
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