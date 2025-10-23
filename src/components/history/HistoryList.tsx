'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useData } from '@/contexts/DataContext'
import { useState } from 'react'

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'csv_upload':
      return '📄'
    case 'scraping':
      return '🕷️'
    default:
      return '📊'
  }
}

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'csv_upload':
      return 'CSV Upload'
    case 'scraping':
      return 'Web Scraping'
    default:
      return 'Unknown'
  }
}

export function HistoryList() {
  const { csvData, scrapedData, clearAllData } = useData()
  const [showDetails, setShowDetails] = useState<number | null>(null)

  // Generate history items from actual data
  const historyItems = [
    ...(csvData.length > 0 ? [{
      id: 1,
      type: 'csv_upload',
      name: 'Uploaded CSV File',
      status: 'completed',
      records: csvData.length,
      createdAt: new Date().toLocaleString(),
      duration: '30s',
      data: csvData
    }] : []),
    ...(scrapedData.length > 0 ? [{
      id: 2,
      type: 'scraping',
      name: 'Web Scraping Job',
      status: 'completed',
      records: scrapedData.length,
      createdAt: new Date().toLocaleString(),
      duration: '2m 15s',
      data: scrapedData
    }] : [])
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Activity History</h3>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              Export
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={clearAllData}
            >
              Clear All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {historyItems.map((item) => (
            <div key={item.id} className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="text-2xl">{getTypeIcon(item.type)}</div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-gray-900">{item.name}</h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.status === 'completed' ? 'bg-green-100 text-green-800' :
                        item.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="flex items-center mt-1 space-x-4 text-sm text-gray-500">
                      <span>{getTypeLabel(item.type)}</span>
                      <span>{item.records} records</span>
                      <span>{item.createdAt}</span>
                      <span>Duration: {item.duration}</span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowDetails(showDetails === item.id ? null : item.id)}
                  >
                    {showDetails === item.id ? 'Hide Details' : 'View Details'}
                  </Button>
                  {item.status === 'completed' && (
                    <Button variant="outline" size="sm">
                      Download
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Details View */}
              {showDetails === item.id && item.data && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h5 className="text-sm font-medium text-gray-900 mb-3">Data Preview</h5>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-100">
                        <tr>
                          {Object.keys(item.data[0] || {}).map((key) => (
                            <th key={key} className="px-2 py-1 text-left font-medium text-gray-700">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {item.data.slice(0, 3).map((row: Record<string, unknown>, index: number) => (
                          <tr key={index}>
                            {Object.values(row).map((value: unknown, colIndex: number) => (
                              <td key={colIndex} className="px-2 py-1 text-gray-900">
                                {String(value || '-')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {item.data.length > 3 && (
                      <div className="text-xs text-gray-500 mt-2 text-center">
                        ... and {item.data.length - 3} more rows
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {historyItems.length === 0 && (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-4">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No activity yet</h3>
              <p className="text-gray-500">Your CSV uploads and scraping jobs will appear here.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
