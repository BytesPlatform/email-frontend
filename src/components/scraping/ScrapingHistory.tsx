'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

// Dummy scraping history data
const scrapingJobs = [
  {
    id: 1,
    url: 'https://example.com',
    type: 'emails',
    status: 'completed',
    results: 25,
    createdAt: '2024-01-15 10:30 AM',
    duration: '2m 15s'
  },
  {
    id: 2,
    url: 'https://business-directory.com',
    type: 'contacts',
    status: 'running',
    results: 0,
    createdAt: '2024-01-15 11:45 AM',
    duration: '1m 30s'
  },
  {
    id: 3,
    url: 'https://company-list.org',
    type: 'phones',
    status: 'failed',
    results: 0,
    createdAt: '2024-01-14 3:20 PM',
    duration: '0m 45s'
  }
]

export function ScrapingHistory() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Recent Scraping Jobs</h3>
          <Button variant="outline" size="sm">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {scrapingJobs.map((job) => (
            <div key={job.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-medium text-gray-900">{job.url}</h4>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    job.status === 'completed' ? 'bg-green-100 text-green-800' :
                    job.status === 'running' ? 'bg-blue-100 text-blue-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {job.status}
                  </span>
                </div>
                <div className="flex items-center mt-1 space-x-4 text-sm text-gray-500">
                  <span>Type: {job.type}</span>
                  <span>Results: {job.results}</span>
                  <span>{job.createdAt}</span>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  View
                </Button>
                {job.status === 'completed' && (
                  <Button variant="outline" size="sm">
                    Download
                  </Button>
                )}
              </div>
            </div>
          ))}

          {scrapingJobs.length === 0 && (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-4">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No scraping jobs yet</h3>
              <p className="text-gray-500">Start your first scraping job to see results here.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
