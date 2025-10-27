'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ingestionApi } from '@/api/ingestion'
import { useAuthContext } from '@/contexts/AuthContext'
import { CSVRecord } from '@/types/ingestion'

interface UploadMetadata {
  uploadId: number
  contacts: Array<Record<string, unknown>>
  totalRecords: number
  successfulRecords: number
}

interface CSVUploadFormProps {
  onFileProcessed?: (data: CSVRecord[], headers: string[]) => void
  onUploadSuccess?: (metadata: UploadMetadata) => void
}

export function CSVUploadForm({ onFileProcessed, onUploadSuccess }: CSVUploadFormProps) {
  const { client } = useAuthContext()
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  const [parsedData, setParsedData] = useState<CSVRecord[]>([])
  const [, setHeaders] = useState<string[]>([])
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Standard 6-column format
  const requiredColumns = ['business_name', 'zipcode', 'state', 'phone_number', 'website', 'email']
  
  // Column mapping for common variations
  const columnMappings: { [key: string]: string[] } = {
    'business_name': ['business_name', 'company_name', 'name', 'business', 'company'],
    'zipcode': ['zipcode', 'zip', 'zip_code', 'postal_code'],
    'state': ['state', 'province', 'region'],
    'phone_number': ['phone_number', 'phone', 'telephone', 'contact_number'],
    'website': ['website', 'url', 'web_site', 'homepage'],
    'email': ['email', 'email_address', 'e_mail', 'contact_email']
  }

  const validateAndConvertCSV = (data: Record<string, string>[], headers: string[]) => {
    const errors: string[] = []
    const convertedData: CSVRecord[] = []
    
    // Check if we have the required columns
    const missingColumns = requiredColumns.filter(col => 
      !headers.some(header => 
        columnMappings[col].some(mapping => 
          header.toLowerCase().replace(/[_\s-]/g, '') === mapping.toLowerCase().replace(/[_\s-]/g, '')
        )
      )
    )
    
    if (missingColumns.length > 0) {
      errors.push(`Missing required columns: ${missingColumns.join(', ')}`)
    }
    
    // Convert data to standard format
    data.forEach((row) => {
      const convertedRow: CSVRecord = {}
      
      requiredColumns.forEach(requiredCol => {
        // Find matching column in the CSV
        const matchingHeader = headers.find(header => 
          columnMappings[requiredCol].some(mapping => 
            header.toLowerCase().replace(/[_\s-]/g, '') === mapping.toLowerCase().replace(/[_\s-]/g, '')
          )
        )
        
        if (matchingHeader) {
          convertedRow[requiredCol] = row[matchingHeader] || ''
        } else {
          convertedRow[requiredCol] = ''
        }
      })
      
      convertedData.push(convertedRow)
    })
    
    return { convertedData, errors }
  }

  const parseCSV = (csvText: string) => {
    const lines = csvText.split('\n').filter(line => line.trim())
    if (lines.length === 0) return { headers: [], data: [] }
    
    // Improved CSV parsing that handles quoted fields with commas
    const parseCSVLine = (line: string) => {
      const result = []
      let current = ''
      let inQuotes = false
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      
      result.push(current.trim())
      return result
    }
    
    const headers = parseCSVLine(lines[0]).map(header => header.replace(/"/g, ''))
    const data = lines.slice(1).map(line => {
      const values = parseCSVLine(line).map(value => value.replace(/"/g, ''))
      const row: Record<string, string> = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })
      return row
    })
    
    return { headers, data }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile)
      
      // Parse the CSV file immediately
      try {
        const text = await selectedFile.text()
        const { headers, data } = parseCSV(text)
        
        // Validate and convert to standard format
        const { convertedData, errors } = validateAndConvertCSV(data, headers)
        
        setHeaders(requiredColumns) // Use standard headers
        setParsedData(convertedData)
        setValidationErrors(errors)
        
        // Notify parent component with converted data
        if (onFileProcessed) {
          onFileProcessed(convertedData, requiredColumns)
        }
      } catch (error) {
        console.error('Error parsing CSV:', error)
        alert('Error reading CSV file')
      }
    } else {
      alert('Please select a valid CSV file')
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.type === 'text/csv') {
        setFile(droppedFile)
        
        // Parse the CSV file immediately
        try {
          const text = await droppedFile.text()
          const { headers, data } = parseCSV(text)
          
          // Validate and convert to standard format
          const { convertedData, errors } = validateAndConvertCSV(data, headers)
          
          setHeaders(requiredColumns) // Use standard headers
          setParsedData(convertedData)
          setValidationErrors(errors)
          
          // Notify parent component with converted data
          if (onFileProcessed) {
            onFileProcessed(convertedData, requiredColumns)
          }
        } catch (error) {
          console.error('Error parsing CSV:', error)
          alert('Error reading CSV file')
        }
      } else {
        alert('Please select a valid CSV file')
      }
    }
  }

  const handleUpload = async () => {
    if (!file) return

    // Check if user is authenticated
    if (!client) {
      setUploadError('You must be logged in to upload CSV files')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setUploadError(null)
    setUploadSuccess(null)

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      // Call the API
      const response = await ingestionApi.uploadCsv(file, client.id)

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (response.success && response.data) {
        setUploadSuccess(
          `Upload successful! Processed ${response.data.successfulRecords} of ${response.data.totalRecords} records. Validation in progress...`
        )
        
        // Pass contact IDs and metadata to parent component
        if (onUploadSuccess) {
          onUploadSuccess({
            uploadId: response.data.uploadId,
            contacts: response.data.contacts || [],
            totalRecords: response.data.totalRecords,
            successfulRecords: response.data.successfulRecords
          })
        }
        
        // Reset form after successful upload
        setTimeout(() => {
          setFile(null)
          setParsedData([])
          setValidationErrors([])
          setUploadSuccess(null)
          setUploadProgress(0)
        }, 3000)
      } else {
        setUploadError(response.error || 'Upload failed')
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const uploadIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
    </svg>
  )

  return (
    <Card variant="elevated">
      <CardHeader
        title="Upload CSV File"
        subtitle="Upload a CSV file containing contact information to import into your database."
        icon={uploadIcon}
      >
        <div></div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* File Upload Area */}
          <div
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
              dragActive 
                ? 'border-indigo-400 bg-indigo-50' 
                : file 
                  ? 'border-green-400 bg-green-50' 
                  : 'border-slate-300 hover:border-slate-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            
            {!file ? (
              <div className="space-y-4">
                <div className="mx-auto w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-medium text-slate-900">
                    {dragActive ? 'Drop your CSV file here' : 'Choose CSV file or drag and drop'}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    CSV files up to 10MB
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="mx-auto w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-medium text-slate-900">{file.name}</p>
                  <p className="text-sm text-slate-500">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-3">
              <div className="flex justify-between text-sm text-slate-600">
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading...
                </span>
                <span className="font-medium">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-red-800 mb-2">CSV Format Issues</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                  <p className="text-xs text-red-600 mt-2">
                    The CSV has been converted to the standard format. Missing columns will be empty.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {file && validationErrors.length === 0 && parsedData.length > 0 && !uploadSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-green-800">CSV Successfully Processed</h4>
                  <p className="text-sm text-green-700">
                    {parsedData.length} records converted to standard format with 6 columns: business_name, zipcode, state, phone_number, website, email
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Upload Success Message */}
          {uploadSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-green-800">Upload Successful</h4>
                  <p className="text-sm text-green-700">{uploadSuccess}</p>
                </div>
              </div>
            </div>
          )}

          {/* Upload Error Message */}
          {uploadError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-red-800">Upload Failed</h4>
                  <p className="text-sm text-red-700">{uploadError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={!file || isUploading}
            isLoading={isUploading}
            leftIcon={!isUploading ? uploadIcon : undefined}
            className="w-full"
            size="lg"
          >
            {isUploading ? 'Uploading...' : 'Upload CSV'}
          </Button>

          {/* File Requirements */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <h4 className="text-sm font-semibold text-slate-900">File Requirements</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>CSV format only</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Max 10MB size</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>6 fields required: business_name, zipcode, state, phone_number, website, email</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
