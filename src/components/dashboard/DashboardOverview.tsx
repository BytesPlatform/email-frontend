'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { dashboardApi } from '@/api/analytics'

interface StatData {
  name: string
  value: string
  change: string
  changeType: 'positive' | 'negative' | 'neutral'
  icon: React.ReactNode
  color: string
}

const colorClasses = {
  blue: 'bg-blue-50 text-blue-600',
  purple: 'bg-purple-50 text-purple-600',
  green: 'bg-green-50 text-green-600',
  emerald: 'bg-emerald-50 text-emerald-600'
}

// Helper function to determine change type
const getChangeType = (change: string): 'positive' | 'negative' | 'neutral' => {
  if (change.startsWith('+')) {
    const num = parseFloat(change.replace(/[+%]/g, ''))
    return num > 0 ? 'positive' : 'neutral'
  } else if (change.startsWith('-')) {
    return 'negative'
  }
  return 'neutral'
}

// Default stats to show if API fails or no data
const getDefaultStats = (): StatData[] => [
  { 
    name: 'CSV Uploads', 
    value: '0', 
    change: '+0', 
    changeType: 'neutral',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
      </svg>
    ),
    color: 'blue'
  },
  { 
    name: 'Scraping Jobs', 
    value: '0', 
    change: '+0', 
    changeType: 'neutral',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
      </svg>
    ),
    color: 'purple'
  },
  { 
    name: 'Total Records', 
    value: '0', 
    change: '+0%', 
    changeType: 'neutral',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    color: 'green'
  },
  { 
    name: 'Success Rate', 
    value: '0%', 
    change: '+0%', 
    changeType: 'neutral',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'emerald'
  },
]

export function DashboardOverview() {
  const [stats, setStats] = useState<StatData[]>(getDefaultStats())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadDashboardStats()
  }, [])

  const loadDashboardStats = async () => {
    setIsLoading(true)
    try {
      const response = await dashboardApi.getDashboardStats()
      if (response.success && response.data) {
        // The dashboardApi already extracts stats from the nested response
        const { csvUploads, scrapingJobs, totalRecords, successRate } = response.data

        setStats([
          {
            name: 'CSV Uploads',
            value: csvUploads.value,
            change: csvUploads.change,
            changeType: getChangeType(csvUploads.change),
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            ),
            color: 'blue'
          },
          {
            name: 'Scraping Jobs',
            value: scrapingJobs.value,
            change: scrapingJobs.change,
            changeType: getChangeType(scrapingJobs.change),
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
              </svg>
            ),
            color: 'purple'
          },
          {
            name: 'Total Records',
            value: totalRecords.value,
            change: totalRecords.change,
            changeType: getChangeType(totalRecords.change),
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            ),
            color: 'green'
          },
          {
            name: 'Success Rate',
            value: successRate.value,
            change: successRate.change,
            changeType: getChangeType(successRate.change),
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
            color: 'emerald'
          },
        ])
      } else {
        // API call succeeded but no data - use defaults
        console.warn('Dashboard stats API returned no data, using defaults')
        setStats(getDefaultStats())
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
      // Set default stats on error
      setStats(getDefaultStats())
    } finally {
      setIsLoading(false)
    }
  }

  // Ensure we always have stats to render
  const displayStats = stats.length > 0 ? stats : getDefaultStats()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} hover className="group">
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-slate-100 animate-pulse">
                      <div className="w-6 h-6"></div>
                    </div>
                    <div>
                      <div className="h-4 w-24 bg-slate-200 rounded animate-pulse mb-2"></div>
                      <div className="h-8 w-16 bg-slate-200 rounded animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {displayStats.map((stat) => (
        <Card key={stat.name} hover className="group">
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${colorClasses[stat.color as keyof typeof colorClasses]}`}>
                    {stat.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">{stat.name}</p>
                    <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0">
                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  stat.changeType === 'positive' ? 'bg-green-100 text-green-800' : 
                  stat.changeType === 'negative' ? 'bg-red-100 text-red-800' : 
                  'bg-slate-100 text-slate-800'
                }`}>
                  {stat.changeType === 'positive' && (
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {stat.changeType === 'negative' && (
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {stat.change}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}