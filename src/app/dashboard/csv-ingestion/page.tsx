'use client'

import { useState } from 'react'
import { CSVUploadForm, ColumnMapping } from '@/components/csv/CSVUploadForm'
import { CSVPreview } from '@/components/csv/CSVPreview'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { useData } from '@/contexts/DataContext'
import { CSVRecord } from '@/types/ingestion'
import Link from 'next/link'

interface UploadMetadata {
  uploadId: number
  contacts: Array<Record<string, unknown>>
  totalRecords: number
  successfulRecords: number
}

export default function CSVIngestionPage() {
  const { setCsvData } = useData()
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [uploadMetadata, setUploadMetadata] = useState<UploadMetadata | null>(null)
  const [mappedCsvData, setMappedCsvData] = useState<Record<string, string>[]>([])
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([])

  const handleFileProcessed = (data: CSVRecord[], headers: string[]) => {
    setCsvData(data)
    setCsvHeaders(headers)
  }

  const handleMappedDataReady = (originalData: Record<string, string>[], mappings: ColumnMapping[]) => {
    setMappedCsvData(originalData)
    setColumnMappings(mappings)
  }

  const handleUploadSuccess = (metadata: UploadMetadata) => {
    setUploadMetadata(metadata)
    
    // Store uploadId and contacts for scraping page
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastUploadId', String(metadata.uploadId))
      localStorage.setItem('lastUploadContacts', JSON.stringify(metadata.contacts))
    }
    
    console.log('Upload successful! Contact IDs:', metadata.contacts.map(c => c.id))
    console.log('Upload ID:', metadata.uploadId)
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
                  <h1 className="text-3xl font-bold mb-2">CSV Ingestion</h1>
                  <p className="text-indigo-100 text-lg">Upload and process CSV files to import contact data into your database.</p>
                </div>
                <div className="hidden md:block">
                  <div className="h-20 w-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CSVUploadForm 
                onFileProcessed={handleFileProcessed} 
                onUploadSuccess={handleUploadSuccess}
                onMappedDataReady={handleMappedDataReady}
              />
              <CSVPreview 
                headers={csvHeaders} 
                mappedCsvData={mappedCsvData}
                columnMappings={columnMappings}
                refreshTrigger={uploadMetadata?.uploadId}
                onDataUpdate={(updatedData) => {
                  setMappedCsvData(updatedData)
                }}
              />
            </div>
            
            {/* Upload Success Metadata */}
            {uploadMetadata && (
              <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">Upload Successful!</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-gray-500 text-xs font-medium mb-1">Upload ID</div>
                          <div className="text-gray-900 font-semibold">{uploadMetadata.uploadId}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-gray-500 text-xs font-medium mb-1">Records Processed</div>
                          <div className="text-gray-900 font-semibold">
                            {uploadMetadata.successfulRecords} of {uploadMetadata.totalRecords}
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 sm:col-span-2">
                          <div className="text-gray-500 text-xs font-medium mb-1">Contact IDs (sample)</div>
                          <div className="text-gray-900 font-mono text-xs">
                            {uploadMetadata.contacts.slice(0, 5).map(c => c.id || 'N/A').join(', ')}
                            {uploadMetadata.contacts.length > 5 && '...'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-6">
                    <Link 
                      href="/dashboard/scraping" 
                      className="inline-flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all duration-200 text-sm font-medium"
                    >
                      <span>Go to Scraping</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
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
