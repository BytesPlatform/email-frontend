'use client'

import { useState, useEffect } from 'react'
import { HistoryList } from '@/components/history/HistoryList'
import { HistoryFilters } from '@/components/history/HistoryFilters'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { useAuthContext } from '@/contexts/AuthContext'
import { historyApi } from '@/api/history'
import type { ClientHistoryFilters, ScrapingAnalytics, ClientScrapingHistoryResponse } from '@/types/history'
import Link from 'next/link'

export default function HistoryPage() {
  const { client } = useAuthContext()
  const [filters, setFilters] = useState<ClientHistoryFilters>({
    page: 1,
    limit: 5,
    status: 'all',
    sortBy: 'scrapedAt',
    sortOrder: 'desc'
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [historyData, setHistoryData] = useState<ClientScrapingHistoryResponse | null>(null)
  const [analytics, setAnalytics] = useState<ScrapingAnalytics | null>(null)
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false)

  useEffect(() => {
    if (client?.id) {
      fetchHistory()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client?.id, filters])

  useEffect(() => {
    if (client?.id) {
      fetchAnalytics()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client?.id])

  const fetchHistory = async () => {
    if (!client?.id) return
    
    setIsLoading(true)
    try {
      const response = await historyApi.getClientScrapingHistory(client.id, filters)
      if (response.success && response.data) {
        setHistoryData(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch history:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAnalytics = async () => {
    if (!client?.id) return
    
    setIsLoadingAnalytics(true)
    try {
      const response = await historyApi.getScrapingAnalytics(client.id)
      if (response.success && response.data) {
        setAnalytics(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setIsLoadingAnalytics(false)
    }
  }

  const handleFilterChange = (newFilters: Partial<ClientHistoryFilters>) => {
    setFilters(prev => {
      const isExplicitPageChange = typeof newFilters.page === 'number'
      return {
        ...prev,
        ...newFilters,
        ...(isExplicitPageChange ? {} : { page: 1 })
      }
    })
  }

  return (
    <AuthGuard>
      <div className="bg-gray-50 min-h-screen">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 pb-34">
          <div className="space-y-6">
            {/* Page Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <Link href="/dashboard" className="text-white/80 hover:text-white text-sm mb-2 inline-flex items-center cursor-pointer">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Dashboard
                  </Link>
                  <h1 className="text-3xl font-bold mb-2">History</h1>
                  <p className="text-indigo-100 text-lg">View and manage your data ingestion and scraping history.</p>
                </div>
                <div className="hidden md:block">
                  <div className="h-20 w-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Summary */}
            {(historyData || analytics) && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {historyData && (
                  <>
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-md cursor-pointer">
                      <div className="flex items-center justify-between mb-2">
                        <svg className="w-8 h-8 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <div className="text-3xl font-bold">{historyData.totalScrapes}</div>
                      <div className="text-sm text-blue-100 mt-1">Total Scrapes</div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white shadow-md cursor-pointer">
                      <div className="flex items-center justify-between mb-2">
                        <svg className="w-8 h-8 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="text-3xl font-bold">{historyData.successfulScrapes}</div>
                      <div className="text-sm text-green-100 mt-1">Successful</div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-5 text-white shadow-md cursor-pointer">
                      <div className="flex items-center justify-between mb-2">
                        <svg className="w-8 h-8 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div className="text-3xl font-bold">{historyData.failedScrapes}</div>
                      <div className="text-sm text-red-100 mt-1">Failed</div>
                    </div>
                  </>
                )}
                
                {analytics && (
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white shadow-md cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                      <svg className="w-8 h-8 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div className="text-3xl font-bold">{analytics.successRate.toFixed(1)}%</div>
                    <div className="text-sm text-purple-100 mt-1">Success Rate</div>
                  </div>
                )}
              </div>
            )}
            
            {/* Analytics Overview */}
            {analytics && (
              <div className="bg-white rounded-lg shadow-lg border border-gray-100 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Analytics Overview</h3>
                
                {/* Method Breakdown */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Method Breakdown</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-green-50 rounded-lg p-4 border border-green-100 cursor-pointer">
                      <p className="text-xs text-gray-600 mb-1">Direct URL</p>
                      <p className="text-2xl font-bold text-green-700">{analytics.methodBreakdown.direct_url.count}</p>
                      <p className="text-xs text-green-600 mt-1">{analytics.methodBreakdown.direct_url.successRate.toFixed(1)}% success</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 cursor-pointer">
                      <p className="text-xs text-gray-600 mb-1">Email Domain</p>
                      <p className="text-2xl font-bold text-blue-700">{analytics.methodBreakdown.email_domain.count}</p>
                      <p className="text-xs text-blue-600 mt-1">{analytics.methodBreakdown.email_domain.successRate.toFixed(1)}% success</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-100 cursor-pointer">
                      <p className="text-xs text-gray-600 mb-1">Business Search</p>
                      <p className="text-2xl font-bold text-purple-700">{analytics.methodBreakdown.business_search.count}</p>
                      <p className="text-xs text-purple-600 mt-1">{analytics.methodBreakdown.business_search.successRate.toFixed(1)}% success</p>
                    </div>
                  </div>
                </div>

                {/* Top Failed Reasons */}
                {analytics.topFailedReasons.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Top Failed Reasons</h4>
                    <div className="space-y-2">
                      {analytics.topFailedReasons.slice(0, 5).map((reason, index) => (
                        <div key={index} className="flex items-center justify-between bg-red-50 rounded-lg p-3 border border-red-100 cursor-pointer">
                          <div className="flex items-center space-x-2">
                            <span className="text-red-700 font-bold">#{index + 1}</span>
                            <span className="text-sm text-gray-800">{reason.reason}</span>
                          </div>
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                            {reason.count} times
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1">
                <HistoryFilters filters={filters} onFilterChange={handleFilterChange} />
              </div>
              <div className="lg:col-span-3">
                <HistoryList 
                  historyData={historyData} 
                  isLoading={isLoading}
                  filters={filters}
                  onPageChange={(page) => handleFilterChange({ page })}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}