'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { ClientHistoryFilters, ClientScrapingHistoryResponse } from '@/types/history'
import { historyApi } from '@/api/history'
import { useState, useEffect } from 'react'
import type { ContactScrapingHistoryResponse } from '@/types/history'

interface HistoryListProps {
  historyData: ClientScrapingHistoryResponse | null
  isLoading: boolean
  filters: ClientHistoryFilters
  onPageChange: (page: number) => void
}

const getMethodBadge = (method: string) => {
  const badges: Record<string, { color: string; label: string }> = {
    'direct_url': { color: 'bg-green-100 text-green-800', label: 'Direct URL' },
    'email_domain': { color: 'bg-blue-100 text-blue-800', label: 'Email Domain' },
    'business_search': { color: 'bg-purple-100 text-purple-800', label: 'Business Search' },
  }
  return badges[method] || { color: 'bg-gray-100 text-gray-800', label: method }
}

export function HistoryList({ historyData, isLoading, filters, onPageChange }: HistoryListProps) {
  const [showDetails, setShowDetails] = useState<number | null>(null)
  const [contactHistory, setContactHistory] = useState<ContactScrapingHistoryResponse | null>(null)
  const [isLoadingContact, setIsLoadingContact] = useState(false)
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null)

  const fetchContactHistory = async (contactId: number) => {
    setIsLoadingContact(true)
    try {
      const response = await historyApi.getContactScrapingHistory(contactId)
      if (response.success && response.data) {
        setContactHistory(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch contact history:', error)
    } finally {
      setIsLoadingContact(false)
    }
  }

  const handleViewAttempts = async (contactId: number) => {
    setSelectedContactId(contactId)
    await fetchContactHistory(contactId)
  }

  const closeModal = () => {
    setSelectedContactId(null)
    setContactHistory(null)
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading history...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const items = historyData?.recentActivity || []

  const pagination = historyData?.pagination

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Scraping History</h3>
          {pagination && (
            <span className="text-sm text-gray-500">
              Showing {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.totalItems)} of {pagination.totalItems}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.map((item) => {
            const methodBadge = getMethodBadge(item.method)
            return (
            <div key={item.id} className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      item.success ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {item.success ? (
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                  <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="text-sm font-medium text-gray-900">{item.businessName || 'Unknown Business'}</h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${methodBadge.color}`}>
                          {methodBadge.label}
                        </span>
                        {item.success && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Success
                          </span>
                        )}
                      </div>
                      <div className="flex items-center flex-wrap gap-3 text-xs text-gray-500">
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {new Date(item.scrapedAt).toLocaleString()}
                        </span>
                        {item.website && (
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                            </svg>
                            {item.website}
                          </span>
                        )}
                        {item.email && (
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {item.email}
                          </span>
                        )}
                        <span className="flex items-center">
                          📧 {item.extractedEmails} emails
                        </span>
                        <span className="flex items-center">
                          📞 {item.extractedPhones} phones
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowDetails(showDetails === item.id ? null : item.id)}
                  >
                      {showDetails === item.id ? 'Hide' : 'Details'}
                  </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewAttempts(item.contactId)}
                    >
                      View Attempts
                    </Button>
                </div>
              </div>
              
              {/* Details View */}
                {showDetails === item.id && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Contact ID:</span>
                        <span className="ml-2 font-medium">{item.contactId}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Pages Scraped:</span>
                        <span className="ml-2 font-medium">{item.pagesScraped}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Content Length:</span>
                        <span className="ml-2 font-medium">{item.contentLength} chars</span>
                      </div>
                      {item.discoveredUrl && (
                        <div className="col-span-2">
                          <span className="text-gray-600">Discovered URL:</span>
                          <a href={item.discoveredUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-600 hover:underline">
                            {item.discoveredUrl}
                          </a>
                        </div>
                      )}
                      {item.errorMessage && (
                        <div className="col-span-2">
                          <span className="text-red-600">Error:</span>
                          <p className="ml-2 text-red-700">{item.errorMessage}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            )
          })}

          {items.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">
                <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Scraping History</h3>
              <p className="text-gray-500">Your scraping activities will appear here once you start scraping data.</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t pt-4">
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(filters.page || 1 - 1)}
                disabled={filters.page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange((filters.page || 1) + 1)}
                disabled={filters.page === pagination.totalPages}
              >
                Next
              </Button>
            </div>
            <span className="text-sm text-gray-500">
              Page {filters.page || 1} of {pagination.totalPages}
            </span>
          </div>
        )}

        {/* Contact History Modal */}
        {selectedContactId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold">Contact Scraping History</h3>
                    {contactHistory && (
                      <p className="text-indigo-100 text-sm mt-1">
                        {contactHistory.businessName || 'Unknown Business'}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={closeModal}
                    className="text-white hover:text-gray-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6">
                {isLoadingContact ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                  </div>
                ) : contactHistory ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Contact ID</p>
                        <p className="text-lg font-semibold">{contactHistory.contactId}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Current Status</p>
                        <p className="text-lg font-semibold capitalize">{contactHistory.currentStatus}</p>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="text-lg font-semibold mb-4">Scraping Attempts ({contactHistory.scrapingAttempts.length})</h4>
                      <div className="space-y-3">
                        {contactHistory.scrapingAttempts.map((attempt, index) => (
                          <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                  attempt.success ? 'bg-green-100' : 'bg-red-100'
                                }`}>
                                  {attempt.success ? '✓' : '✗'}
                                </div>
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <span className="font-medium">Attempt #{attempt.attemptNumber}</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                      getMethodBadge(attempt.method).color
                                    }`}>
                                      {getMethodBadge(attempt.method).label}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-500">
                                    {new Date(attempt.scrapedAt).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                attempt.dataQuality === 'excellent' ? 'bg-green-100 text-green-800' :
                                attempt.dataQuality === 'good' ? 'bg-blue-100 text-blue-800' :
                                attempt.dataQuality === 'fair' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {attempt.dataQuality}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-gray-600">Pages: </span>
                                <span className="font-medium">{attempt.pagesScraped}</span>
                              </div>
                              {attempt.discoveredUrl && (
                                <div className="col-span-2">
                                  <span className="text-gray-600">URL: </span>
                                  <a href={attempt.discoveredUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                                    {attempt.discoveredUrl}
                                  </a>
                                </div>
                              )}
                              {attempt.errorMessage && (
                                <div className="col-span-2">
                                  <span className="text-red-600 font-medium">Error: </span>
                                  <span className="text-red-700">{attempt.errorMessage}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {contactHistory.scrapingAttempts.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          No scraping attempts found for this contact
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No contact history available
            </div>
          )}
        </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
