'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
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

interface CSVPreviewProps {
  headers?: string[]
}

const previewIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
)

const downloadIcon = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

export function CSVPreview({ headers = [] }: CSVPreviewProps) {
  const { csvData } = useData()
  const [showFullOverlay, setShowFullOverlay] = useState(false)

  // Standard CSV template with 6 required columns
  const standardTemplate: CSVRecord[] = [
    {
      business_name: 'Example Business Inc',
      zipcode: '12345',
      state: 'CA',
      phone_number: '(555) 123-4567',
      website: 'https://example.com',
      email: 'contact@example.com'
    },
    {
      business_name: 'Another Company LLC',
      zipcode: '67890',
      state: 'NY',
      phone_number: '(555) 987-6543',
      website: 'https://anothercompany.com',
      email: 'info@anothercompany.com'
    }
  ]

  const downloadTemplate = () => {
    // Create CSV content
    const csvHeaders = ['business_name', 'zipcode', 'state', 'phone_number', 'website', 'email']
    const csvContent = [
      csvHeaders.join(','),
      ...standardTemplate.map(row => 
        csvHeaders.map(header => {
          const value = row[header] || ''
          // Escape commas and quotes in values
          return value.includes(',') || value.includes('"') ? `"${value.replace(/"/g, '""')}"` : value
        }).join(',')
      )
    ].join('\n')

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'csv_template.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const closeIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )

  return (
    <>
      {/* Full Screen Overlay */}
      {showFullOverlay && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full h-full max-w-7xl max-h-[90vh] flex flex-col">
            {/* Overlay Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Full CSV Data</h3>
                <p className="text-sm text-slate-500">{csvData.length} rows, {headers.length} columns</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFullOverlay(false)}
                leftIcon={closeIcon}
              >
                Close
              </Button>
            </div>
            
            {/* Scrollable Table */}
            <div className="flex-1 overflow-auto p-4">
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      {headers.map((header, index) => (
                        <th key={index} className="px-4 py-3 text-left font-medium text-slate-700 border-r border-slate-200">
                          {header}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-left font-medium text-slate-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {csvData.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-slate-50">
                        {headers.map((header, colIndex) => (
                          <td key={colIndex} className="px-4 py-3 text-slate-900 border-r border-slate-200">
                            {row[header] || '-'}
                          </td>
                        ))}
                        <td className="px-4 py-3">
                          <Link href="/dashboard/scraping">
                            <Button
                              variant="outline"
                              size="xs"
                              className="text-xs"
                            >
                              Scrape
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Preview Component */}
      <Card variant="elevated">
      <CardHeader
        title="CSV Preview"
        subtitle="Preview of your CSV data before import"
        icon={previewIcon}
      >
        <div className="flex items-center justify-between w-full">
          <div></div>
          <Button 
            variant="outline" 
            size="sm"
            leftIcon={downloadIcon}
            onClick={downloadTemplate}
          >
            Download Template
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Show CSV Data or Empty State */}
          {csvData.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900">
                  Preview ({csvData.length} rows)
                </h4>
                <div className="flex items-center space-x-3">
                  <div className="text-xs text-slate-500">
                    {headers.length} columns
                  </div>
                  {csvData.length > 5 && (
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => setShowFullOverlay(true)}
                    >
                      View All Data
                    </Button>
                  )}
                </div>
              </div>
              
              {/* CSV Data Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        {headers.map((header, index) => (
                          <th key={index} className="px-3 py-2 text-left font-medium text-slate-700 border-r border-slate-200">
                            {header}
                          </th>
                        ))}
                        <th className="px-3 py-2 text-left font-medium text-slate-700">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {csvData.slice(0, 5).map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-slate-50">
                          {headers.map((header, colIndex) => (
                            <td key={colIndex} className="px-3 py-2 text-slate-900 border-r border-slate-200">
                              {row[header] || '-'}
                            </td>
                          ))}
                          <td className="px-3 py-2">
                            <Link href="/dashboard/scraping">
                              <Button
                                variant="outline"
                                size="xs"
                                className="text-xs"
                              >
                                Scrape
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {csvData.length > 5 && (
                  <button 
                    onClick={() => setShowFullOverlay(true)}
                    className="w-full bg-slate-50 hover:bg-slate-100 px-3 py-2 text-xs text-slate-500 hover:text-slate-700 text-center transition-colors cursor-pointer"
                  >
                    ... and {csvData.length - 5} more rows (click to view all)
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Empty State */
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No CSV file uploaded</h3>
              <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                Upload a CSV file to see a preview of your data and verify the format before importing.
              </p>
            </div>
          )}

        </div>
      </CardContent>
      </Card>
    </>
  )
}
