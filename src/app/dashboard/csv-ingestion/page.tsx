'use client'

import { useState } from 'react'
import { CSVUploadForm } from '@/components/csv/CSVUploadForm'
import { CSVPreview } from '@/components/csv/CSVPreview'
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

export default function CSVIngestionPage() {
  const { setCsvData } = useData()
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])

  const handleFileProcessed = (data: CSVRecord[], headers: string[]) => {
    setCsvData(data)
    setCsvHeaders(headers)
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
              <CSVUploadForm onFileProcessed={handleFileProcessed} />
              <CSVPreview headers={csvHeaders} />
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
