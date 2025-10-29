'use client'

import { useState, useEffect } from 'react'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { useAuthContext } from '@/contexts/AuthContext'
import { historyApi } from '@/api/history'
import { emailGenerationApi } from '@/api/emailGeneration'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import type { 
  BusinessSummary, 
  GeneratedEmail, 
  ScrapedRecord,
  EmailGenerationState 
} from '@/types/emailGeneration'
import type { ScrapingHistoryItem } from '@/types/history'

export default function EmailGenerationPage() {
  const { client } = useAuthContext()
  const [state, setState] = useState<EmailGenerationState>({
    scrapedRecords: [],
    isLoadingRecords: false,
    error: null
  })

  // Load scraped records on component mount
  useEffect(() => {
    const loadScrapedRecords = async () => {
      if (!client?.id) return
      
      setState(prev => ({ ...prev, isLoadingRecords: true, error: null }))
      
      try {
        // Get client scraping history to fetch all scraped records
        const historyRes = await historyApi.getClientScrapingHistory(client.id, {
          status: 'success', // Only get successful scrapes
          limit: 100 // Get up to 100 records
        })
        
        if (historyRes.success && historyRes.data) {
          console.log('History API Response:', historyRes.data)
          console.log('Recent Activity:', historyRes.data.recentActivity)
          
          // Check if recentActivity exists and is an array
          const recentActivity = historyRes.data.recentActivity || []
          console.log('Recent Activity Length:', recentActivity.length)
          
          if (recentActivity.length === 0) {
            console.log('No recent activity found - showing empty state')
            setState(prev => ({ 
              ...prev, 
              scrapedRecords: [],
              isLoadingRecords: false 
            }))
            return
          }
          
          // Convert ScrapingHistoryItem to ScrapedRecord format
          const scrapedRecords: ScrapedRecord[] = recentActivity.map((item: ScrapingHistoryItem) => ({
            id: item.id,
            contactId: item.contactId,
            businessName: item.businessName || undefined,
            website: item.website || undefined,
            email: item.email,
            state: undefined, // Not available in history API
            zipCode: undefined, // Not available in history API
            status: item.success ? 'scraped' : 'scrape_failed',
            scrapedData: {
              id: item.id,
              contactId: item.contactId,
              method: item.method as any,
              url: item.discoveredUrl,
              pageTitle: undefined,
              metaDescription: undefined,
              extractedEmails: [], // Would need to fetch from individual contact history
              extractedPhones: [],
              homepageText: undefined,
              servicesText: undefined,
              productsText: undefined,
              contactText: undefined,
              keywords: [],
              scrapeSuccess: item.success,
              errorMessage: item.errorMessage,
              timestamp: typeof item.scrapedAt === 'string' ? item.scrapedAt : item.scrapedAt.toISOString()
            }
          }))
          
          console.log('Converted Scraped Records:', scrapedRecords)
          
          setState(prev => ({ 
            ...prev, 
            scrapedRecords,
            isLoadingRecords: false 
          }))
        } else {
          console.log('History API Error:', historyRes.error)
          setState(prev => ({ 
            ...prev, 
            error: historyRes.error || 'Failed to load scraped records',
            isLoadingRecords: false 
          }))
        }
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          error: error instanceof Error ? error.message : 'Failed to load scraped records',
          isLoadingRecords: false 
        }))
      }
    }
    
    loadScrapedRecords()
  }, [client?.id])

  const handleGenerateSummary = async (recordId: number) => {
    const record = state.scrapedRecords.find(r => r.id === recordId)
    if (!record) return

    setState(prev => ({
      ...prev,
      scrapedRecords: prev.scrapedRecords.map(r => 
        r.id === recordId ? { ...r, isGeneratingSummary: true } : r
      ),
      error: null
    }))
    
    try {
      const res = await emailGenerationApi.generateSummary(record.contactId, 1) // Using uploadId 1 for now
      if (res.success && res.data?.success) {
        setState(prev => ({
          ...prev,
          scrapedRecords: prev.scrapedRecords.map(r => 
            r.id === recordId 
              ? { 
                  ...r, 
                  generatedSummary: res.data!.data!,
                  generatedEmail: undefined, // Reset email when new summary is generated
                  isGeneratingSummary: false 
                } 
              : r
          )
        }))
      } else {
        setState(prev => ({
          ...prev,
          scrapedRecords: prev.scrapedRecords.map(r => 
            r.id === recordId ? { ...r, isGeneratingSummary: false } : r
          ),
          error: res.data?.error || res.error || 'Failed to generate summary'
        }))
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        scrapedRecords: prev.scrapedRecords.map(r => 
          r.id === recordId ? { ...r, isGeneratingSummary: false } : r
        ),
        error: error instanceof Error ? error.message : 'Failed to generate summary'
      }))
    }
  }

  const handleGenerateEmail = async (recordId: number) => {
    const record = state.scrapedRecords.find(r => r.id === recordId)
    if (!record || !record.generatedSummary) return

    setState(prev => ({
      ...prev,
      scrapedRecords: prev.scrapedRecords.map(r => 
        r.id === recordId ? { ...r, isGeneratingEmail: true } : r
      ),
      error: null
    }))
    
    try {
      const res = await emailGenerationApi.generateEmail(
        record.contactId, 
        record.generatedSummary,
        'sales',
        'professional'
      )
      if (res.success && res.data?.success) {
        setState(prev => ({
          ...prev,
          scrapedRecords: prev.scrapedRecords.map(r => 
            r.id === recordId 
              ? { 
                  ...r, 
                  generatedEmail: res.data!.data!,
                  isGeneratingEmail: false 
                } 
              : r
          )
        }))
      } else {
        setState(prev => ({
          ...prev,
          scrapedRecords: prev.scrapedRecords.map(r => 
            r.id === recordId ? { ...r, isGeneratingEmail: false } : r
          ),
          error: res.data?.error || res.error || 'Failed to generate email'
        }))
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        scrapedRecords: prev.scrapedRecords.map(r => 
          r.id === recordId ? { ...r, isGeneratingEmail: false } : r
        ),
        error: error instanceof Error ? error.message : 'Failed to generate email'
      }))
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // You could add a toast notification here
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
                  <h1 className="text-3xl font-bold mb-2">Email Generation</h1>
                  <p className="text-indigo-100 text-lg">Generate business summaries and personalized emails for your scraped contacts.</p>
                </div>
                <div className="hidden md:block">
                  <div className="h-20 w-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Scraped Records Table */}
            <Card variant="elevated">
              <CardHeader
                title="Scraped Records"
                subtitle="Generate summaries and emails for your scraped contacts"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
              />
              <CardContent>
                {state.isLoadingRecords ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading scraped records...</p>
                  </div>
                ) : state.scrapedRecords.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                     <h3 className="text-2xl font-bold text-gray-900 mb-2">No Scraped Records</h3>
                     <p className="text-gray-500 mb-6">No successfully scraped records found. You need to scrape some contacts first before generating emails.</p>
                    <Link 
                      href="/dashboard/scraping" 
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 shadow-md font-medium"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Go to Scraping
                    </Link>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Business
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Contact Info
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Location
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Summary
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {state.scrapedRecords.map((record) => (
                          <tr key={record.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                    <span className="text-white font-semibold text-sm">
                                      {record.businessName?.[0]?.toUpperCase() || 'B'}
                                    </span>
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {record.businessName || 'Unknown Business'}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    ID: {record.contactId}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {record.email || 'No email'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {record.website || 'No website'}
                              </div>
                            </td>
                             <td className="px-6 py-4 whitespace-nowrap">
                               <div className="text-sm text-gray-900">
                                 {record.state || 'N/A'}
                               </div>
                               <div className="text-sm text-gray-500">
                                 {record.zipCode || 'N/A'}
                               </div>
                             </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {record.generatedSummary ? (
                                <div className="flex items-center space-x-2">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    ✓ Generated
                                  </span>
                                  <Button
                                    onClick={() => copyToClipboard(record.generatedSummary!.summary)}
                                    variant="outline"
                                    size="xs"
                                  >
                                    Copy
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">Not generated</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {record.generatedEmail ? (
                                <div className="flex items-center space-x-2">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    ✓ Generated
                                  </span>
                                  <Button
                                    onClick={() => copyToClipboard(record.generatedEmail!.body)}
                                    variant="outline"
                                    size="xs"
                                  >
                                    Copy
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">Not generated</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                {!record.generatedSummary ? (
                                  <Button
                                    onClick={() => handleGenerateSummary(record.id)}
                                    disabled={record.isGeneratingSummary}
                                    isLoading={record.isGeneratingSummary}
                                    size="sm"
                                  >
                                    {record.isGeneratingSummary ? 'Generating...' : 'Generate Summary'}
                                  </Button>
                                ) : !record.generatedEmail ? (
                                  <Button
                                    onClick={() => handleGenerateEmail(record.id)}
                                    disabled={record.isGeneratingEmail}
                                    isLoading={record.isGeneratingEmail}
                                    size="sm"
                                    variant="success"
                                  >
                                    {record.isGeneratingEmail ? 'Generating...' : 'Generate Email'}
                                  </Button>
                                ) : (
                                  <div className="flex space-x-1">
                                    <Button
                                      onClick={() => handleGenerateSummary(record.id)}
                                      disabled={record.isGeneratingSummary}
                                      isLoading={record.isGeneratingSummary}
                                      size="sm"
                                      variant="outline"
                                    >
                                      Regenerate Summary
                                    </Button>
                                    <Button
                                      onClick={() => handleGenerateEmail(record.id)}
                                      disabled={record.isGeneratingEmail}
                                      isLoading={record.isGeneratingEmail}
                                      size="sm"
                                      variant="outline"
                                    >
                                      Regenerate Email
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Error Display */}
            {state.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
                <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-red-700">{state.error}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}