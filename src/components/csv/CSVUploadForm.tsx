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
  onMappedDataReady?: (
    validOriginalData: Record<string, string>[],
    mappings: ColumnMapping[],
    uncleanRows: Record<string, string>[]
  ) => void
}

export interface ColumnMapping {
  csvColumnIndex: number
  csvColumnName: string
  mappedField: string | null
  confidence: 'exact' | 'synonym' | 'fuzzy' | 'none'
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
  mappings: ColumnMapping[]
  convertedData: CSVRecord[]
  validOriginalData: Record<string, string>[]
  uncleanRows: Record<string, string>[]
}

export function CSVUploadForm({ onFileProcessed, onUploadSuccess, onMappedDataReady }: CSVUploadFormProps) {
  const { client } = useAuthContext()
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  const [parsedData, setParsedData] = useState<CSVRecord[]>([])
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([])
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uncleanRows, setUncleanRows] = useState<Record<string, string>[]>([])

  const isValueEmpty = (value: string | undefined | null): boolean => {
    if (value === undefined || value === null) return true
    const trimmed = String(value).trim()
    return trimmed === '' || trimmed === '-' || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined'
  }

  // Standard 6-column format in exact order
  const requiredColumns = ['business_name', 'zipcode', 'state', 'phone_number', 'website', 'email']
  
  // Comprehensive synonym dictionary for each required field
  const synonymDictionary: { [key: string]: string[] } = {
    'business_name': [
      'business name',
      'business_name',
      'company',
      'company name',
      'company_name',
      'store name',
      'store_name',
      'organization',
      'organization name',
      'organization_name',
      'firm name',
      'firm_name',
      'brand name',
      'brand_name',
      'business',
      'trading name',
      'trading_name',
      'entity name',
      'entity_name',
      'legal name',
      'legal_name'
    ],
    'zipcode': [
      'zip code',
      'zipcode',
      'zip_code',
      'postal code',
      'postal_code',
      'post code',
      'post_code',
      'zip',
      'area code',
      'area_code',
      'pin code',
      'pin_code',
      'postal',
      'zip number',
      'zip_number',
      'postal zip',
      'postal_zip',
      'region code',
      'region_code',
      'delivery code',
      'delivery_code'
    ],
    'state': [
      'state',
      'province',
      'region',
      'territory',
      'county',
      'district',
      'governorate',
      'prefecture',
      'state name',
      'state_name',
      'region name',
      'region_name',
      'administrative area',
      'administrative_area',
      'location state',
      'location_state'
    ],
    'phone_number': [
      'phone',
      'phone number',
      'phone_number',
      'telephone',
      'contact',
      'contact number',
      'contact_number',
      'mobile',
      'mobile number',
      'mobile_number',
      'cell',
      'cell number',
      'cell_number',
      'work phone',
      'work_phone',
      'office phone',
      'office_phone',
      'business contact',
      'business_contact'
    ],
    'website': [
      'website',
      'url',
      'website url',
      'website_url',
      'web address',
      'web_address',
      'site link',
      'site_link',
      'company website',
      'company_website',
      'homepage',
      'webpage',
      'link',
      'official site',
      'official_site',
      'domain',
      'website address',
      'website_address'
    ],
    'email': [
      'email',
      'email address',
      'email_address',
      'business email',
      'business_email',
      'personal email',
      'personal_email',
      'contact email',
      'contact_email',
      'work email',
      'work_email',
      'official email',
      'official_email',
      'primary email',
      'primary_email',
      'mail',
      'email id',
      'email_id',
      'company email',
      'company_email',
      'registered email',
      'registered_email'
    ]
  }

  // Normalize string for comparison (lowercase, remove special chars)
  const normalizeString = (str: string): string => {
    return str.toLowerCase().replace(/[_\s-]/g, '').trim()
  }

  // Calculate Levenshtein distance for fuzzy matching
  const levenshteinDistance = (str1: string, str2: string): number => {
    const s1 = normalizeString(str1)
    const s2 = normalizeString(str2)
    const matrix: number[][] = []

    for (let i = 0; i <= s2.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= s1.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= s2.length; i++) {
      for (let j = 1; j <= s1.length; j++) {
        if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }

    return matrix[s2.length][s1.length]
  }

  // Calculate similarity score (0-1, higher is better)
  const calculateSimilarity = (str1: string, str2: string): number => {
    const maxLength = Math.max(str1.length, str2.length)
    if (maxLength === 0) return 1
    const distance = levenshteinDistance(str1, str2)
    return 1 - distance / maxLength
  }

  // Smart column mapping function
  const mapColumns = (headers: string[]): ColumnMapping[] => {
    const mappings: ColumnMapping[] = headers.map((header, index) => {
      const normalizedHeader = normalizeString(header)
      let bestMatch: { field: string; confidence: 'exact' | 'synonym' | 'fuzzy'; score: number } | null = null

      // Try to match against each required field
      for (const requiredField of requiredColumns) {
        const synonyms = synonymDictionary[requiredField]
        
        // 1. Check for exact match
        if (normalizedHeader === normalizeString(requiredField)) {
          bestMatch = { field: requiredField, confidence: 'exact', score: 1.0 }
          break
        }

        // 2. Check synonym dictionary
        for (const synonym of synonyms) {
          if (normalizedHeader === normalizeString(synonym)) {
            bestMatch = { field: requiredField, confidence: 'synonym', score: 0.95 }
            break
          }
        }

        if (bestMatch) break

        // 3. Try fuzzy matching with synonyms
        for (const synonym of synonyms) {
          const similarity = calculateSimilarity(normalizedHeader, synonym)
          if (similarity >= 0.7) {
            if (!bestMatch || similarity > bestMatch.score) {
              bestMatch = { field: requiredField, confidence: 'fuzzy', score: similarity }
            }
          }
        }
      }

      return {
        csvColumnIndex: index,
        csvColumnName: header,
        mappedField: bestMatch ? bestMatch.field : null,
        confidence: bestMatch ? bestMatch.confidence : 'none'
      }
    })

    return mappings
  }

  // Validate that all required fields are present (order doesn't matter)
  const validateRequiredFields = (mappings: ColumnMapping[]): string[] => {
    const errors: string[] = []
    const mappedFields = mappings
      .filter(m => m.mappedField !== null)
      .map(m => m.mappedField!)

    // Check if all required fields are present
    const missingFields = requiredColumns.filter(field => !mappedFields.includes(field))
    if (missingFields.length > 0) {
      errors.push(`Missing required fields: ${missingFields.join(', ')}`)
    }

    return errors
  }

  // Main validation function
  const validateAndConvertCSV = (data: Record<string, string>[], headers: string[]): ValidationResult => {
    const errors: string[] = []
    const convertedData: CSVRecord[] = []
    const validOriginalData: Record<string, string>[] = []
    const uncleanRows: Record<string, string>[] = []

    // Check column count
    if (headers.length !== 6) {
      errors.push(`CSV must have exactly 6 columns. Found ${headers.length} columns.`)
      return {
        isValid: false,
        errors,
        mappings: headers.map((h, i) => ({
          csvColumnIndex: i,
          csvColumnName: h,
          mappedField: null,
          confidence: 'none'
        })),
        convertedData: [],
        validOriginalData: [],
        uncleanRows: data
      }
    }

    // Map columns
    const mappings = mapColumns(headers)

    // Check for unmapped columns
    const unmappedColumns = mappings.filter(m => m.mappedField === null)
    if (unmappedColumns.length > 0) {
      const suggestions = unmappedColumns.map(m => {
        // Find best suggestion for unmapped column
        let bestSuggestion = ''
        let bestScore = 0
        for (const field of requiredColumns) {
          const similarity = calculateSimilarity(m.csvColumnName, field)
          if (similarity > bestScore && similarity >= 0.5) {
            bestScore = similarity
            bestSuggestion = field
          }
        }
        return bestSuggestion ? `"${m.csvColumnName}" (suggested: ${bestSuggestion})` : `"${m.csvColumnName}"`
      })
      errors.push(`Could not map columns: ${suggestions.join(', ')}`)
    }

    // Validate that all required fields are present
    const fieldErrors = validateRequiredFields(mappings)
    errors.push(...fieldErrors)

    if (errors.length > 0) {
      return {
        isValid: false,
        errors,
        mappings,
        convertedData: [],
        validOriginalData: [],
        uncleanRows: data
      }
    }

    const emailMapping = mappings.find(mapping => mapping.mappedField === 'email')
    const phoneMapping = mappings.find(mapping => mapping.mappedField === 'phone_number')

    data.forEach((row) => {
      const emailValue = emailMapping ? row[emailMapping.csvColumnName] : ''
      const phoneValue = phoneMapping ? row[phoneMapping.csvColumnName] : ''
      const isEmailEmpty = isValueEmpty(emailValue)
      const isPhoneEmpty = isValueEmpty(phoneValue)

      if (isEmailEmpty && isPhoneEmpty) {
        uncleanRows.push(row)
        return
      }

      const convertedRow: CSVRecord = {}
      mappings.forEach((mapping) => {
        if (mapping.mappedField) {
          convertedRow[mapping.mappedField] = row[mapping.csvColumnName] || ''
        }
      })

      validOriginalData.push(row)
      convertedData.push(convertedRow)
    })

    if (convertedData.length === 0) {
      errors.push('All rows are missing both email and phone number. Please provide at least one contact method for each row.')
    }

    return {
      isValid: errors.length === 0,
      errors,
      mappings,
      convertedData,
      validOriginalData,
      uncleanRows
    }
  }

  const buildCsvContent = (rows: CSVRecord[]): string => {
    const csvHeaders = requiredColumns
    const csvLines = [
      csvHeaders.join(','),
      ...rows.map(row =>
        csvHeaders
          .map(header => {
            const value = row[header] || ''
            return value.includes('"') || value.includes(',') || value.includes('\n')
              ? `"${value.replace(/"/g, '""')}"`
              : value
          })
          .join(',')
      )
    ]
    return csvLines.join('\n')
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
      setUploadError(null)
      setUploadSuccess(null)
      
      // Parse the CSV file immediately
      try {
        const text = await selectedFile.text()
        const { headers, data } = parseCSV(text)
        
        // Validate and convert to standard format
        const validationResult = validateAndConvertCSV(data, headers)
        
        setParsedData(validationResult.convertedData)
        setValidationErrors(validationResult.errors)
        setColumnMappings(validationResult.mappings)
        setUncleanRows(validationResult.uncleanRows)
        
        // Notify parent component with mapped data for preview
        if (onMappedDataReady) {
          onMappedDataReady(
            validationResult.validOriginalData,
            validationResult.mappings,
            validationResult.uncleanRows
          )
        }
        
        // Notify parent component with converted data only if valid
        if (validationResult.isValid && onFileProcessed) {
          onFileProcessed(validationResult.convertedData, requiredColumns)
        } else if (onFileProcessed) {
          // Still notify but with empty data if invalid
          onFileProcessed([], requiredColumns)
        }
      } catch (error) {
        console.error('Error parsing CSV:', error)
        setUploadError('Error reading CSV file. Please ensure the file is a valid CSV format.')
        setValidationErrors(['Failed to parse CSV file. Please check the file format.'])
      }
    } else {
      setUploadError('Please select a valid CSV file')
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
        setUploadError(null)
        setUploadSuccess(null)
        
        // Parse the CSV file immediately
        try {
          const text = await droppedFile.text()
          const { headers, data } = parseCSV(text)
          
          // Validate and convert to standard format
          const validationResult = validateAndConvertCSV(data, headers)
          
          setParsedData(validationResult.convertedData)
          setValidationErrors(validationResult.errors)
          setColumnMappings(validationResult.mappings)
          setUncleanRows(validationResult.uncleanRows)
          
          // Notify parent component with mapped data for preview
          if (onMappedDataReady) {
            onMappedDataReady(
              validationResult.validOriginalData,
              validationResult.mappings,
              validationResult.uncleanRows
            )
          }
          
          // Notify parent component with converted data only if valid
          if (validationResult.isValid && onFileProcessed) {
            onFileProcessed(validationResult.convertedData, requiredColumns)
          } else if (onFileProcessed) {
            // Still notify but with empty data if invalid
            onFileProcessed([], requiredColumns)
          }
        } catch (error) {
          console.error('Error parsing CSV:', error)
          setUploadError('Error reading CSV file. Please ensure the file is a valid CSV format.')
          setValidationErrors(['Failed to parse CSV file. Please check the file format.'])
        }
      } else {
        setUploadError('Please select a valid CSV file')
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

    // Block upload if validation errors exist
    if (validationErrors.length > 0) {
      setUploadError('Please fix CSV validation errors before uploading')
      return
    }

    // Ensure we have valid data
    if (parsedData.length === 0) {
      setUploadError(
        uncleanRows.length > 0
          ? 'No rows are eligible for upload because they are missing both an email and a phone number.'
          : 'No valid data to upload. Please check your CSV file.'
      )
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

      // Rebuild CSV with only validated rows
      const cleanedCsvContent = buildCsvContent(parsedData)
      const cleanedFile = new File([cleanedCsvContent], file.name, { type: 'text/csv' })

      // Call the API with cleaned data
      const response = await ingestionApi.uploadCsv(cleanedFile, client.id)

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
          setColumnMappings([])
          setUncleanRows([])
          setUploadSuccess(null)
          setUploadProgress(0)
          // Clear mapped data in parent
          if (onMappedDataReady) {
            onMappedDataReady([], [], [])
          }
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
            className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 ${
              dragActive 
                ? 'border-indigo-500 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-md' 
                : file 
                  ? 'border-green-400 bg-gradient-to-br from-green-50 to-emerald-50' 
                  : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
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
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            
            {!file ? (
              <div className="space-y-4">
                <div className={`mx-auto w-16 h-16 ${dragActive ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-slate-100'} rounded-xl flex items-center justify-center transition-all duration-200 shadow-sm`}>
                  <svg className={`w-8 h-8 ${dragActive ? 'text-white' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                </div>
                <div>
                  <p className={`text-lg font-semibold ${dragActive ? 'text-indigo-700' : 'text-slate-900'}`}>
                    {dragActive ? 'Drop your CSV file here' : 'Choose CSV file or drag and drop'}
                  </p>
                  <p className="text-sm text-slate-500 mt-2">
                    CSV files up to 10MB
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-900">{file.name}</p>
                  <p className="text-sm text-slate-500 mt-1">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-3">
              <div className="flex justify-between text-sm text-slate-700">
                <span className="flex items-center">
                  <span className="mr-2 h-4 w-4 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 animate-pulse"></span>
                  <span className="font-medium">Uploading...</span>
                </span>
                <span className="font-semibold text-indigo-600">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2.5 rounded-full transition-all duration-300 shadow-sm"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Column Mapping Visualization - Only show mapped fields */}
          {file && columnMappings.length > 0 && (() => {
            const mappedColumns = columnMappings.filter(m => m.mappedField !== null)
            return mappedColumns.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Mapped Columns</h4>
                <div className="space-y-2">
                  {mappedColumns.map((mapping) => {
                    const confidenceColor = 
                      mapping.confidence === 'exact' ? 'text-green-600' :
                      mapping.confidence === 'synonym' ? 'text-blue-600' :
                      mapping.confidence === 'fuzzy' ? 'text-yellow-600' :
                      'text-red-600'
                    
                    return (
                      <div 
                        key={mapping.csvColumnIndex} 
                        className="flex items-center justify-between p-2 rounded bg-green-50 border border-green-200"
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          <span className="text-xs font-medium text-slate-500 w-8">#{mapping.csvColumnIndex + 1}</span>
                          <span className="text-sm text-slate-900 flex-1">{mapping.csvColumnName}</span>
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                          <span className="text-sm font-medium text-slate-900">
                            {mapping.mappedField}
                          </span>
                        </div>
                        <span className={`text-xs font-medium ml-2 ${confidenceColor}`}>
                          {mapping.confidence === 'exact' ? '✓ Exact' :
                           mapping.confidence === 'synonym' ? '≈ Synonym' :
                           mapping.confidence === 'fuzzy' ? '~ Fuzzy' : ''}
                        </span>
                      </div>
                    )
                  })}
                </div>
                {validationErrors.length === 0 && parsedData.length > 0 && (
                  <p className="text-xs text-green-600 mt-3 font-medium">
                    ✓ All required columns mapped correctly
                  </p>
                )}
              </div>
            )
          })()}


          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-red-800 mb-2">CSV Validation Failed</h4>
                  <ul className="text-sm text-red-700 space-y-1.5">
                    {validationErrors.map((error, index) => (
                      <li key={index} className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>{error}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-red-600 mt-3 font-medium">
                    Please ensure your CSV has exactly 6 columns with all required fields: business_name, zipcode, state, phone_number, website, email (order doesn&apos;t matter)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {file && validationErrors.length === 0 && parsedData.length > 0 && !uploadSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-green-800">CSV Validation Passed</h4>
                  <p className="text-sm text-green-700">
                    {parsedData.length} records validated successfully. All 6 required columns are present and mapped correctly.
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
            disabled={!file || isUploading || validationErrors.length > 0 || parsedData.length === 0}
            isLoading={isUploading}
            leftIcon={!isUploading ? uploadIcon : undefined}
            className="w-full"
            size="lg"
          >
            {isUploading ? 'Uploading...' : 
             validationErrors.length > 0 ? 'Fix Errors to Upload' :
             !file ? 'Upload CSV' :
             'Upload CSV'}
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
                <span>6 fields required: business_name, zipcode, state, phone_number, website, email (any order)</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
