'use client'

import { useState } from 'react'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { useData } from '@/contexts/DataContext'
import Link from 'next/link'

interface CSVRecord {
  business_name?: string
  zipcode?: string
  state?: string
  phone_number?: string
  website?: string
  email?: string
  [key: string]: string | undefined
}

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
  const [selectedRecords, setSelectedRecords] = useState<number[]>([])
  const [isScraping, setIsScraping] = useState(false)

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

  return (
    <AuthGuard>
      <div className="bg-gray-50 min-h-screen">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="space-y-6">
            <div>
              <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 text-sm mb-1 block">
                ← Back to Dashboard
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Web Scraping</h1>
                <p className="text-gray-600">Configure and run web scraping jobs to collect contact information.</p>
              </div>
            </div>

            {/* Data Summary */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600">{csvData.length}</div>
                  <div className="text-sm text-blue-800">CSV Records</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600">{scrapedData.length}</div>
                  <div className="text-sm text-green-800">Scraped Records</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-600">{combinedData.length}</div>
                  <div className="text-sm text-purple-800">Total Records</div>
                </div>
              </div>
            </div>

            {/* CSV Records Checklist */}
            {csvData.length > 0 ? (
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Select Websites to Scrape</h3>
                  <p className="text-sm text-gray-600 mt-1">Choose which CSV records you want to scrape</p>
                </div>
                <div className="p-6">
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {csvData.map((record, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <input
                          type="checkbox"
                          id={`record-${index}`}
                          checked={selectedRecords.includes(index)}
                          onChange={() => handleRecordSelect(index)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`record-${index}`} className="flex-1 cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 mb-1">
                                {record.business_name || record.company_name || record.name || `Record ${index + 1}`}
                              </div>
                              <div className="text-sm text-gray-600 mb-1">
                                {(() => {
                                  // Priority 1: Direct website URL
                                  if (record.website) {
                                    return (
                                      <div className="flex items-center space-x-1">
                                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                        <span className="text-green-700 font-medium">Website: {record.website}</span>
                                      </div>
                                    )
                                  }
                                  
                                  // Priority 2: Custom email domain (not general domains like gmail, yahoo)
                                  if (record.email && record.email.includes('@')) {
                                    const domain = record.email.split('@')[1]
                                    
                                    if (isGeneralEmailDomain(domain)) {
                                      // General email domain - fall back to Google search
                                      const locationParts = []
                                      if (record.state) locationParts.push(record.state)
                                      if (record.zip_code || record.zip) locationParts.push(record.zip_code || record.zip)
                                      
                                      return (
                                        <div className="flex items-center space-x-1">
                                          <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                          </svg>
                                          <span className="text-orange-700 font-medium">Google Search: {record.business_name || record.company_name || record.name}</span>
                                          {locationParts.length > 0 && (
                                            <span className="text-gray-500">({locationParts.join(', ')})</span>
                                          )}
                                          <span className="text-xs text-gray-400 ml-2">(General email: {domain})</span>
                                        </div>
                                      )
                                    } else {
                                      // Custom domain - use for website
                                      return (
                                        <div className="flex items-center space-x-1">
                                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                          </svg>
                                          <span className="text-blue-700 font-medium">Email: {record.email}</span>
                                          <span className="text-gray-500">(Domain: {domain})</span>
                                        </div>
                                      )
                                    }
                                  }
                                  
                                  // Priority 3: Business name + state + zip for Google search (no email or general email)
                                  const locationParts = []
                                  if (record.state) locationParts.push(record.state)
                                  if (record.zip_code || record.zip) locationParts.push(record.zip_code || record.zip)
                                  
                                  return (
                                    <div className="flex items-center space-x-1">
                                      <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                      </svg>
                                      <span className="text-orange-700 font-medium">Google Search: {record.business_name || record.company_name || record.name}</span>
                                      {locationParts.length > 0 && (
                                        <span className="text-gray-500">({locationParts.join(', ')})</span>
                                      )}
                                    </div>
                                  )
                                })()}
                              </div>
                            </div>
                            <div className="text-xs text-gray-400 ml-4">
                              #{index + 1}
                            </div>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <button 
                        onClick={handleSelectAll}
                        className="text-sm text-indigo-600 hover:text-indigo-800"
                      >
                        Select All
                      </button>
                      <button 
                        onClick={handleClearAll}
                        className="text-sm text-indigo-600 hover:text-indigo-800"
                      >
                        Clear All
                      </button>
                      <span className="text-sm text-gray-500">
                        {selectedRecords.length} of {csvData.length} selected
                      </span>
                    </div>
                    <button 
                      onClick={handleStartScraping}
                      disabled={selectedRecords.length === 0 || isScraping}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isScraping ? 'Scraping...' : `Start Scraping ${selectedRecords.length} Selected`}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No CSV Data Available</h3>
                <p className="text-gray-500 mb-4">Upload a CSV file first to see records for scraping</p>
                <a 
                  href="/dashboard/csv-ingestion" 
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Go to CSV Upload
                </a>
              </div>
            )}

            {/* Scraping Loader */}
            {isScraping && (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="flex flex-col items-center space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                  <div className="text-lg font-medium text-gray-900">Scraping in Progress...</div>
                  <div className="text-sm text-gray-600">Processing {selectedRecords.length} selected records</div>
                </div>
              </div>
            )}

            {/* Scraping Results */}
            {showResults && scrapingResults.length > 0 && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Scraping Results</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Successfully scraped {scrapingResults.length} record{scrapingResults.length > 1 ? 's' : ''}
                  </p>
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
    </AuthGuard>
  )
}
