'use client'

import { useState } from 'react'
import { CSVUploadForm } from '@/components/csv/CSVUploadForm'
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

  const handleFileProcessed = (data: CSVRecord[], headers: string[]) => {
    setCsvData(data)
    setCsvHeaders(headers)
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
            <div>
              <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 text-sm mb-1 block">
                ← Back to Dashboard
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">CSV Ingestion</h1>
                <p className="text-gray-600">Upload and process CSV files to import contact data.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CSVUploadForm onFileProcessed={handleFileProcessed} onUploadSuccess={handleUploadSuccess} />
              <CSVPreview headers={csvHeaders} />
            </div>
            
            {/* Show upload metadata */}
            {uploadMetadata && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h4 className="text-sm font-medium text-blue-800">Upload Metadata</h4>
                </div>
                <div className="text-sm text-blue-700 space-y-1">
                  <div><strong>Upload ID:</strong> {uploadMetadata.uploadId}</div>
                  <div><strong>Contacts:</strong> {uploadMetadata.successfulRecords} with database IDs</div>
                  <div><strong>Contact IDs:</strong> {uploadMetadata.contacts.slice(0, 5).map(c => c.id || 'N/A').join(', ')}...</div>
                </div>
                <div className="mt-3">
                  <Link 
                    href="/dashboard/scraping" 
                    className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    Go to Scraping Page →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
