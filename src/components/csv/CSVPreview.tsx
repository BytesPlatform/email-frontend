'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useData } from '@/contexts/DataContext'
import { CSVRecord, CsvUpload } from '@/types/ingestion'
import { ColumnMapping } from '@/components/csv/CSVUploadForm'
import { ingestionApi } from '@/api/ingestion'
import { useAuthContext } from '@/contexts/AuthContext'
import Link from 'next/link'

interface CSVPreviewProps {
  headers?: string[]
  mappedCsvData?: Record<string, string>[]
  columnMappings?: ColumnMapping[]
  refreshTrigger?: number // When this changes, refresh the uploaded files list
  onDataUpdate?: (updatedData: Record<string, string>[]) => void // Callback when data is updated
  uncleanRows?: Record<string, string>[]
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

export function CSVPreview({ headers = [], mappedCsvData = [], columnMappings = [], refreshTrigger, onDataUpdate, uncleanRows = [] }: CSVPreviewProps) {
  // Local state for mapped CSV data to allow editing
  const [localMappedCsvData, setLocalMappedCsvData] = useState<Record<string, string>[]>(mappedCsvData)
  const [localUncleanRows, setLocalUncleanRows] = useState<Record<string, string>[]>(uncleanRows || [])

  // Sync local state when prop changes
  useEffect(() => {
    setLocalMappedCsvData(mappedCsvData)
  }, [mappedCsvData])
  useEffect(() => {
    setLocalUncleanRows(uncleanRows || [])
  }, [uncleanRows])
  const { csvData } = useData()
  const { client } = useAuthContext()
  const [showFullOverlay, setShowFullOverlay] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<CsvUpload[]>([])
  const [isLoadingUploads, setIsLoadingUploads] = useState(false)
  const [selectedUpload, setSelectedUpload] = useState<CsvUpload | null>(null)
  const [showUploadOverlay, setShowUploadOverlay] = useState(false)
  const [isLoadingUploadDetails, setIsLoadingUploadDetails] = useState(false)
  const [showCsvDataOverlay, setShowCsvDataOverlay] = useState(false)
  const [showUncleanOverlay, setShowUncleanOverlay] = useState(false)
  const [overlayCsvData, setOverlayCsvData] = useState<Record<string, string>[]>([])
  const [overlayHeaders, setOverlayHeaders] = useState<string[]>([])
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; header: string; isMapped?: boolean } | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [localCsvData, setLocalCsvData] = useState<Record<string, string>[]>([])
  
  // Initialize local CSV data from csvData prop
  useEffect(() => {
    if (csvData && csvData.length > 0 && headers && headers.length > 0) {
      setLocalCsvData(csvData.map(row => {
        const rowObj: Record<string, string> = {}
        headers.forEach(header => {
          rowObj[header] = row[header] || ''
        })
        return rowObj
      }))
    }
  }, [csvData, headers])

  // Get mapped columns only
  const mappedColumns = columnMappings.filter(m => m.mappedField !== null)
  const hasMappedData = localMappedCsvData.length > 0 && mappedColumns.length > 0
  const uncleanHeaders =
    columnMappings.length > 0
      ? columnMappings.map(mapping => mapping.csvColumnName)
      : localUncleanRows[0]
      ? Object.keys(localUncleanRows[0])
      : []

  // Fetch uploaded CSV files
  useEffect(() => {
    const fetchUploads = async () => {
      if (!client?.id) return
      setIsLoadingUploads(true)
      try {
        const res = await ingestionApi.getClientUploads()
        if (res.success && res.data) {
          setUploadedFiles(res.data)
        }
      } catch (error) {
        console.error('Failed to fetch uploads:', error)
      } finally {
        setIsLoadingUploads(false)
      }
    }
    fetchUploads()
  }, [client?.id, refreshTrigger])

  // Block body scrolling when any overlay is open
  useEffect(() => {
    if (showCsvDataOverlay || showUploadOverlay || showUncleanOverlay) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [showCsvDataOverlay, showUploadOverlay, showUncleanOverlay])

  // Handle clicking on an uploaded file row
  const handleUploadClick = async (upload: CsvUpload) => {
    setShowUploadOverlay(true)
    setIsLoadingUploadDetails(true)
    setSelectedUpload(upload) // Set initial upload data
    
    try {
      const res = await ingestionApi.getUploadDetails(upload.id)
      if (res.success && res.data) {
        // Ensure contacts array exists
        const uploadData = {
          ...res.data,
          contacts: res.data.contacts || []
        }
        setSelectedUpload(uploadData)
        console.log('Upload details loaded:', uploadData)
        console.log('Contacts count:', uploadData.contacts.length)
        if (uploadData.contacts.length > 0) {
          console.log('First contact:', uploadData.contacts[0])
        }
      } else {
        console.error('Failed to fetch upload details:', res.error)
      }
    } catch (error) {
      console.error('Error fetching upload details:', error)
    } finally {
      setIsLoadingUploadDetails(false)
    }
  }

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

  // Get contact headers from the first contact if available
  const getContactHeaders = (contacts: Array<Record<string, unknown>>) => {
    if (contacts.length === 0) return []
    const firstContact = contacts[0]
    const excludedKeys = ['id', 'csvUploadId', 'createdAt', 'csvUpload']
    return Object.keys(firstContact).filter(key => !excludedKeys.includes(key))
  }

  // Format header name for display
  const formatHeaderName = (header: string): string => {
    // Convert camelCase to Title Case
    return header
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim()
  }

  // Check if field is empty or invalid
  const isFieldEmpty = (value: string | undefined | null): boolean => {
    if (!value) return true
    const strValue = String(value).trim()
    return strValue === '' || strValue === '-' || strValue === 'null' || strValue === 'undefined'
  }

  // Check if a field is the email field
  // Matches all email synonyms from CSVUploadForm.tsx
  const isEmailField = (fieldName: string, mapping?: ColumnMapping): boolean => {
    const emailSynonyms = [
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
    
    if (mapping) {
      // Check if mapped field is email
      if (mapping.mappedField === 'email') {
        return true
      }
      
      // Check if CSV column name matches any email synonym
      const lowerColumnName = mapping.csvColumnName.toLowerCase().trim()
      return emailSynonyms.some(synonym => 
        lowerColumnName === synonym.toLowerCase() || 
        lowerColumnName.includes(synonym.toLowerCase())
      )
    }
    
    // Check field name directly
    const lowerFieldName = fieldName.toLowerCase().trim()
    return emailSynonyms.some(synonym => 
      lowerFieldName === synonym.toLowerCase() || 
      lowerFieldName.includes(synonym.toLowerCase())
    )
  }

  // Check if a field is the phone number field
  // Matches all phone number synonyms from CSVUploadForm.tsx
  const isPhoneField = (fieldName: string, mapping?: ColumnMapping): boolean => {
    const phoneSynonyms = [
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
    ]
    
    if (mapping) {
      // Check if mapped field is phone_number
      if (mapping.mappedField === 'phone_number') {
        return true
      }
      
      // Check if CSV column name matches any phone synonym
      const lowerColumnName = mapping.csvColumnName.toLowerCase().trim()
      return phoneSynonyms.some(synonym => 
        lowerColumnName === synonym.toLowerCase() || 
        lowerColumnName.includes(synonym.toLowerCase())
      )
    }
    
    // Check field name directly
    const lowerFieldName = fieldName.toLowerCase().trim()
    return phoneSynonyms.some(synonym => 
      lowerFieldName === synonym.toLowerCase() || 
      lowerFieldName.includes(synonym.toLowerCase())
    )
  }

  // Check if a field is required (email or phone)
  const isRequiredField = (fieldName: string, mapping?: ColumnMapping): boolean => {
    return isEmailField(fieldName, mapping) || isPhoneField(fieldName, mapping)
  }

  // Handle starting edit
  const handleStartEdit = (e: React.MouseEvent, rowIndex: number, header: string, currentValue: string, isMapped: boolean = true) => {
    e.stopPropagation()
    setEditingCell({ rowIndex, header, isMapped })
    setEditValue(currentValue === '-' || !currentValue ? '' : String(currentValue))
  }

  // Handle saving edit
  const handleSaveEdit = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation()
    if (!editingCell) return

    const { rowIndex, header, isMapped } = editingCell
    const trimmedValue = editValue.trim()
    
    // Validate email format if it's an email field
    if (isEmailField(header)) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (trimmedValue && !emailRegex.test(trimmedValue)) {
        alert('Please enter a valid email address')
        return
      }
    }

    // Validate phone number format if it's a phone field
    if (isPhoneField(header)) {
      // Basic phone validation - allows digits, spaces, dashes, parentheses, and +
      const phoneRegex = /^[\d\s\-\(\)\+]+$/
      if (trimmedValue && !phoneRegex.test(trimmedValue)) {
        alert('Please enter a valid phone number')
        return
      }
      // Check minimum length (at least 7 digits)
      const digitCount = trimmedValue.replace(/\D/g, '').length
      if (trimmedValue && digitCount < 7) {
        alert('Phone number must contain at least 7 digits')
        return
      }
    }

    if (isMapped !== false && localMappedCsvData.length > 0) {
      // Update mapped CSV data
      const updatedData = [...localMappedCsvData]
      updatedData[rowIndex] = {
        ...updatedData[rowIndex],
        [header]: trimmedValue
      }
      
      // Update local mapped CSV data
      setLocalMappedCsvData(updatedData)
      
      // Notify parent component
      if (onDataUpdate) {
        onDataUpdate(updatedData)
      }
    } else {
      // Update non-mapped CSV data
      const updatedData = [...localCsvData]
      updatedData[rowIndex] = {
        ...updatedData[rowIndex],
        [header]: trimmedValue
      }
      setLocalCsvData(updatedData)
    }
    
    // Also update overlay data if it's open
    if (showCsvDataOverlay && overlayCsvData.length > 0) {
      const updatedOverlayData = [...overlayCsvData]
      updatedOverlayData[rowIndex] = {
        ...updatedOverlayData[rowIndex],
        [header]: trimmedValue
      }
      setOverlayCsvData(updatedOverlayData)
    }

    setEditingCell(null)
    setEditValue('')
  }

  // Handle canceling edit
  const handleCancelEdit = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation()
    setEditingCell(null)
    setEditValue('')
  }

  return (
    <>
      {/* Unclean Data Overlay - rows missing both email and phone */}
      {showUncleanOverlay && localUncleanRows.length > 0 && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowUncleanOverlay(false)
            }
          }}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0 bg-white">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Rows Missing Contact Info</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {localUncleanRows.length} row{localUncleanRows.length !== 1 ? 's' : ''} will be skipped • Each row must include an email or phone number
                </p>
              </div>
              <button
                onClick={() => setShowUncleanOverlay(false)}
                className="text-gray-600 hover:text-gray-900 cursor-pointer text-2xl leading-none w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6 bg-gray-50">
              <div className="border border-amber-200 rounded-lg overflow-hidden bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-amber-50 sticky top-0">
                      <tr>
                        {uncleanHeaders.map((header, index) => (
                          <th
                            key={index}
                            className="px-4 py-3 text-left font-medium text-amber-900 border-r border-amber-200 last:border-r-0 whitespace-nowrap"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-200 bg-white">
                      {localUncleanRows.map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-amber-50/70 transition-colors">
                          {uncleanHeaders.map((header, colIndex) => {
                            const mapping = columnMappings.find(m => m.csvColumnName === header)
                            const value = row[header]
                            const isEmail = isEmailField(header, mapping)
                            const isPhone = isPhoneField(header, mapping)
                            const isCritical = (isEmail || isPhone) && isFieldEmpty(value)
                            return (
                              <td
                                key={colIndex}
                                className={`px-4 py-3 border-r border-amber-200 last:border-r-0 ${
                                  isCritical ? 'text-red-700 font-medium' : 'text-gray-900'
                                }`}
                              >
                                {value ? String(value) : '-'}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <p className="text-xs text-amber-700 mt-4">
                These rows will not be uploaded because they are missing both an email address and a phone number.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CSV Data Overlay - for mapped CSV preview table */}
      {showCsvDataOverlay && overlayCsvData.length > 0 && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCsvDataOverlay(false)
              setOverlayCsvData([])
              setOverlayHeaders([])
            }
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Overlay Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0 bg-white">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">CSV Data Preview</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {overlayCsvData.length} row{overlayCsvData.length !== 1 ? 's' : ''} • {overlayHeaders.length} column{overlayHeaders.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCsvDataOverlay(false)
                  setOverlayCsvData([])
                  setOverlayHeaders([])
                }}
                className="text-gray-600 hover:text-gray-900 cursor-pointer text-2xl leading-none w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded"
              >
                ×
              </button>
            </div>

            {/* Scrollable Table */}
            <div className="flex-1 overflow-auto p-6 bg-gray-50">
              <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        {overlayHeaders.map((header, index) => (
                          <th 
                            key={index} 
                            className="px-4 py-3 text-left font-medium text-gray-700 border-r border-gray-200 last:border-r-0 whitespace-nowrap"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {overlayCsvData.map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-gray-50">
                          {overlayHeaders.map((header, colIndex) => {
                            const value = row[header]
                            const displayValue = value !== null && value !== undefined ? String(value) : '-'
                            const isEmptyEmail = isEmailField(header) && isFieldEmpty(displayValue)
                            const isEmptyPhone = isPhoneField(header) && isFieldEmpty(displayValue)
                            const isEmptyRequired = isEmptyEmail || isEmptyPhone
                            const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.header === header

                            return (
                              <td 
                                key={colIndex} 
                                className={`px-4 py-3 border-r border-gray-200 last:border-r-0 ${
                                  isEmptyRequired ? 'text-red-600 font-medium' : 'text-gray-900'
                                }`}
                              >
                                <span className={isEmptyRequired ? 'text-red-600 font-medium' : ''}>
                                  {displayValue}
                                </span>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Details Overlay */}
      {showUploadOverlay && selectedUpload && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowUploadOverlay(false)
              setSelectedUpload(null)
            }
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Overlay Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0 bg-white">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedUpload.fileName || `Upload #${selectedUpload.id}`}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Upload ID: {selectedUpload.id} • {selectedUpload.contacts?.length || 0} contacts
                  {selectedUpload.totalRecords && ` • ${selectedUpload.successfulRecords}/${selectedUpload.totalRecords} records`}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowUploadOverlay(false)
                  setSelectedUpload(null)
                }}
                className="text-gray-600 hover:text-gray-900 cursor-pointer text-2xl leading-none w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded"
              >
                ×
              </button>
            </div>

            {/* Scrollable Table */}
            <div className="flex-1 overflow-auto p-6 bg-gray-50">
              {isLoadingUploadDetails ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
                  <div className="text-gray-500">Loading upload details...</div>
                </div>
              ) : selectedUpload.contacts && Array.isArray(selectedUpload.contacts) && selectedUpload.contacts.length > 0 ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          {getContactHeaders(selectedUpload.contacts).map((header, index) => (
                            <th 
                              key={index} 
                              className="px-4 py-3 text-left font-medium text-gray-700 border-r border-gray-200 last:border-r-0 whitespace-nowrap"
                            >
                              {formatHeaderName(header)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {selectedUpload.contacts.map((contact: Record<string, unknown>, rowIndex) => {
                          const headers = getContactHeaders(selectedUpload.contacts)
                          return (
                            <tr key={rowIndex} className="hover:bg-gray-50">
                              {headers.map((header, colIndex) => {
                                const value = contact[header]
                                return (
                                  <td 
                                    key={colIndex} 
                                    className="px-4 py-3 text-gray-900 border-r border-gray-200 last:border-r-0"
                                  >
                                    {value !== null && value !== undefined ? String(value) : '-'}
                                  </td>
                                )
                              })}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-500 mb-2">
                    {selectedUpload.contacts === undefined 
                      ? 'Contacts data not available' 
                      : 'No contacts found in this upload'}
                  </div>
                  {selectedUpload.totalRecords > 0 && (
                    <div className="text-sm text-gray-400">
                      Total records: {selectedUpload.totalRecords}, Successful: {selectedUpload.successfulRecords}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
          {localUncleanRows.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-amber-900 font-semibold">
                  {localUncleanRows.length} row{localUncleanRows.length !== 1 ? 's' : ''} will be skipped during upload.
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Each contact must include at least an email address or a phone number.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-amber-300 text-amber-900 hover:bg-amber-100"
                onClick={() => setShowUncleanOverlay(true)}
              >
                View Unclean Rows ({localUncleanRows.length})
              </Button>
            </div>
          )}

          {/* Show Mapped CSV Data or Regular CSV Data or Empty State */}
          {hasMappedData ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900">
                  CSV Data Preview (Mapped Fields Only)
                </h4>
                <div className="text-xs text-slate-500">
                  {localMappedCsvData.length} row{localMappedCsvData.length !== 1 ? 's' : ''} • {mappedColumns.length} mapped field{mappedColumns.length !== 1 ? 's' : ''}
                </div>
              </div>
              
              {/* Mapped CSV Data Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        {mappedColumns.map((mapping) => (
                          <th 
                            key={mapping.csvColumnIndex} 
                            className="px-4 py-3 text-left font-medium text-slate-700 border-r border-slate-200 last:border-r-0"
                          >
                            <div className="flex flex-col">
                              <span className="text-xs text-slate-500">{mapping.csvColumnName}</span>
                              <span className="text-xs font-semibold text-slate-900 mt-0.5">
                                → {mapping.mappedField}
                              </span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {localMappedCsvData.map((row, rowIndex) => (
                        <tr 
                          key={rowIndex} 
                          className="hover:bg-slate-50 transition-colors"
                        >
                          {mappedColumns.map((mapping) => {
                            const header = mapping.csvColumnName
                            const value = row[header] || '-'
                            const isEmptyEmail = isEmailField(header, mapping) && isFieldEmpty(value)
                            const isEmptyPhone = isPhoneField(header, mapping) && isFieldEmpty(value)
                            const isEmptyRequired = isEmptyEmail || isEmptyPhone
                            const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.header === header

                            return (
                              <td 
                                key={mapping.csvColumnIndex} 
                                className={`px-4 py-3 border-r border-slate-200 last:border-r-0 ${
                                  isEmptyRequired ? 'text-red-600 font-medium' : 'text-slate-900'
                                }`}
                                onClick={(e) => {
                                  if (!isEditing && !isEmptyRequired) {
                                    setOverlayCsvData(localMappedCsvData)
                                    setOverlayHeaders(mappedColumns.map(m => m.csvColumnName))
                                    setShowCsvDataOverlay(true)
                                  }
                                }}
                              >
                                {isEditing ? (
                                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type={isEmailField(header, mapping) ? 'email' : 'tel'}
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleSaveEdit(e)
                                        } else if (e.key === 'Escape') {
                                          handleCancelEdit(e)
                                        }
                                      }}
                                      className="flex-1 px-2 py-1 border border-indigo-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                      autoFocus
                                      placeholder={isEmailField(header, mapping) ? 'Enter email' : 'Enter phone number'}
                                    />
                                    <button
                                      onClick={handleSaveEdit}
                                      className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors"
                                    >
                                      ✓
                                    </button>
                                    <button
                                      onClick={handleCancelEdit}
                                      className="px-2 py-1 bg-gray-400 text-white rounded text-xs hover:bg-gray-500 transition-colors"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ) : (
                                  <span className={isEmptyRequired ? 'text-red-600 font-medium' : ''}>
                                    {value}
                                  </span>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : csvData.length > 0 ? (
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
                        <tr 
                          key={rowIndex} 
                          className="hover:bg-slate-50 cursor-pointer transition-colors"
                          onClick={() => {
                            const dataToShow = localCsvData.length > 0 ? localCsvData : csvData.map(r => {
                              const rowObj: Record<string, string> = {}
                              headers.forEach(header => {
                                rowObj[header] = r[header] || ''
                              })
                              return rowObj
                            })
                            setOverlayCsvData(dataToShow)
                            setOverlayHeaders(headers)
                            setShowCsvDataOverlay(true)
                          }}
                        >
                          {headers.map((header, colIndex) => {
                            const rowData = localCsvData[rowIndex] || row
                            const value = rowData[header] || row[header] || '-'
                            const isEmptyEmail = isEmailField(header) && isFieldEmpty(value)
                            const isEmptyPhone = isPhoneField(header) && isFieldEmpty(value)
                            const isEmptyRequired = isEmptyEmail || isEmptyPhone
                            const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.header === header && editingCell?.isMapped === false

                            return (
                              <td 
                                key={colIndex} 
                                className={`px-3 py-2 border-r border-slate-200 ${
                                  isEmptyRequired ? 'text-red-600 font-medium' : 'text-slate-900'
                                }`}
                                onClick={(e) => {
                                  if (!isEditing && !isEmptyRequired) {
                                    e.stopPropagation()
                                    const dataToShow = localCsvData.length > 0 ? localCsvData : csvData.map(r => {
                                      const rowObj: Record<string, string> = {}
                                      headers.forEach(h => {
                                        rowObj[h] = r[h] || ''
                                      })
                                      return rowObj
                                    })
                                    setOverlayCsvData(dataToShow)
                                    setOverlayHeaders(headers)
                                    setShowCsvDataOverlay(true)
                                  }
                                }}
                              >
                                {isEditing ? (
                                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type={isEmailField(header) ? 'email' : 'tel'}
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleSaveEdit(e)
                                        } else if (e.key === 'Escape') {
                                          handleCancelEdit(e)
                                        }
                                      }}
                                      className="flex-1 px-2 py-1 border border-indigo-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                      autoFocus
                                      placeholder={isEmailField(header) ? 'Enter email' : 'Enter phone number'}
                                    />
                                    <button
                                      onClick={handleSaveEdit}
                                      className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors"
                                    >
                                      ✓
                                    </button>
                                    <button
                                      onClick={handleCancelEdit}
                                      className="px-2 py-1 bg-gray-400 text-white rounded text-xs hover:bg-gray-500 transition-colors"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ) : (
                                  <span className={isEmptyRequired ? 'text-red-600 font-medium' : ''}>
                                    {value}
                                  </span>
                                )}
                              </td>
                            )
                          })}
                          <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
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
            /* Empty State or Uploaded Files List - Only show when no CSV data to preview */
            <div className="space-y-4">
              {uploadedFiles.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-900">
                      Uploaded CSV Files
                    </h4>
                    <div className="text-xs text-slate-500">
                      {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  
                  {/* Uploaded Files Table */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium text-slate-700">File Name</th>
                            <th className="px-4 py-3 text-left font-medium text-slate-700">Records</th>
                            <th className="px-4 py-3 text-left font-medium text-slate-700">Upload Date</th>
                            <th className="px-4 py-3 text-left font-medium text-slate-700">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {uploadedFiles.map((upload) => (
                            <tr 
                              key={upload.id} 
                              className="hover:bg-slate-50 cursor-pointer transition-colors"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                console.log('Row clicked for upload:', upload.id)
                                handleUploadClick(upload)
                              }}
                            >
                              <td className="px-4 py-3 text-slate-900 font-medium">
                                {upload.fileName || `Upload #${upload.id}`}
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {upload.successfulRecords}/{upload.totalRecords}
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {upload.createdAt ? new Date(upload.createdAt).toLocaleDateString() : '-'}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  upload.status === 'success' 
                                    ? 'bg-green-100 text-green-800' 
                                    : upload.status === 'failure'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {upload.status || 'unknown'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 text-center">
                    Click on a row to view all contacts from that upload
                  </p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="mx-auto w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                  </div>
                  {isLoadingUploads ? (
                    <>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">Loading...</h3>
                      <p className="text-slate-500">Fetching uploaded CSV files</p>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">No CSV file uploaded</h3>
                      <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                        Upload a CSV file to see a preview of your data and verify the format before importing.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </CardContent>
      </Card>
    </>
  )
}
