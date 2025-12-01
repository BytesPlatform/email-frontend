'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ingestionApi } from '@/api/ingestion'
import { useAuthContext } from '@/contexts/AuthContext'
import { CSVRecord } from '@/types/ingestion'
import { FILE_CONFIG } from '@/lib/constants'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import { autoMapColumns, validateColumnData } from '@/lib/csvValidation'
import { normalizePhoneNumber } from '@/lib/phoneUtils'

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
  confidence: 'auto' | 'manual' | 'none'
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
  mappings: ColumnMapping[]
  convertedData: CSVRecord[]
  validOriginalData: Record<string, string>[]
  uncleanRows: Record<string, string>[]
  invalidPhoneRows: Record<string, string>[] // Rows with invalid phone numbers
}

export function CSVUploadForm({ onFileProcessed, onUploadSuccess, onMappedDataReady }: CSVUploadFormProps) {
  const { client } = useAuthContext()
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  const [parsedData, setParsedData] = useState<CSVRecord[]>([])
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [fieldValidationErrors, setFieldValidationErrors] = useState<Record<string, string>>({}) // field -> error message
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([])
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uncleanRows, setUncleanRows] = useState<Record<string, string>[]>([])
  const [invalidPhoneRows, setInvalidPhoneRows] = useState<Record<string, string>[]>([]) // Rows with invalid phone numbers
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvData, setCsvData] = useState<Record<string, string>[]>([])
  const [sampleRows, setSampleRows] = useState<Record<string, string>[]>([]) // First 10 rows for validation
  const [manualMappings, setManualMappings] = useState<Record<string, number>>({})
  const [autoMappedFields, setAutoMappedFields] = useState<Set<string>>(new Set()) // Track which fields were auto-mapped
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  // manualMappings: { 'business_name': 0, 'email': 2 } = requiredField -> csvColumnIndex

  const isValueEmpty = (value: string | undefined | null): boolean => {
    if (value === undefined || value === null) return true
    const trimmed = String(value).trim()
    return trimmed === '' || trimmed === '-' || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined'
  }

  // Standard 6-column format - required fields
  const requiredColumns = ['business_name', 'zipcode', 'state', 'phone_number', 'website', 'email']
  
  // Field display names for UI
  const fieldDisplayNames: Record<string, string> = {
    'business_name': 'Business Name',
    'zipcode': 'Zipcode',
    'state': 'State',
    'phone_number': 'Phone Number',
    'website': 'Website',
    'email': 'Email'
  }

  // Build column mappings from manual mappings
  const buildColumnMappings = (headers: string[], mappings: Record<string, number>, autoMapped: Set<string> = new Set()): ColumnMapping[] => {
    return headers.map((header, index) => {
      // Find which required field this column is mapped to
      const mappedField = Object.entries(mappings).find(([_, colIndex]) => colIndex === index)?.[0] || null
      
      let confidence: 'auto' | 'manual' | 'none' = 'none'
      if (mappedField) {
        confidence = autoMapped.has(mappedField) ? 'auto' : 'manual'
      }
      
      return {
        csvColumnIndex: index,
        csvColumnName: header,
        mappedField: mappedField,
        confidence
      }
    })
  }

  // Validate that all required fields are manually mapped
  const validateRequiredFields = (mappings: Record<string, number>): string[] => {
    const errors: string[] = []
    const missingFields = requiredColumns.filter(field => mappings[field] === undefined)
    
    if (missingFields.length > 0) {
      errors.push(`Please map the following required fields: ${missingFields.map(f => fieldDisplayNames[f] || f).join(', ')}`)
    }

    return errors
  }

  // Handle manual mapping change with validation
  const handleManualMappingChange = (requiredField: string, csvColumnIndex: number | null) => {
    const newMappings = { ...manualMappings }
    const newFieldErrors = { ...fieldValidationErrors }
    
    if (csvColumnIndex === null) {
      // Remove mapping
      delete newMappings[requiredField]
      delete newFieldErrors[requiredField]
    } else {
      // Check if this column is already mapped to another field
      const existingField = Object.entries(newMappings).find(([_, idx]) => idx === csvColumnIndex)?.[0]
      if (existingField) {
        delete newMappings[existingField]
        delete newFieldErrors[existingField]
      }
      
      // Set new mapping
      newMappings[requiredField] = csvColumnIndex
      
      // Remove from auto-mapped set if it was auto-mapped (user is now manually overriding)
      const newAutoMapped = new Set(autoMappedFields)
      newAutoMapped.delete(requiredField)
      setAutoMappedFields(newAutoMapped)
      
      // Run heuristic validation on the selected column
      const csvHeader = csvHeaders[csvColumnIndex]
      if (csvHeader && sampleRows.length > 0) {
        const validation = validateColumnData(requiredField, csvHeader, sampleRows)
        if (!validation.isValid && validation.error) {
          newFieldErrors[requiredField] = validation.error
        } else {
          delete newFieldErrors[requiredField]
        }
      }
    }
    
    setManualMappings(newMappings)
    setFieldValidationErrors(newFieldErrors)
    
    // Rebuild column mappings and validate
    const newColumnMappings = buildColumnMappings(csvHeaders, newMappings, autoMappedFields)
    setColumnMappings(newColumnMappings)
    
    // Re-validate and convert data
    const fieldErrors = validateRequiredFields(newMappings)
    setValidationErrors(fieldErrors)
    
    if (fieldErrors.length === 0 && csvData.length > 0) {
      // Convert data with new mappings
      const validationResult = validateAndConvertCSV(csvData, csvHeaders, newMappings)
      setParsedData(validationResult.convertedData)
      setUncleanRows(validationResult.uncleanRows)
      setInvalidPhoneRows(validationResult.invalidPhoneRows)
      
      // Notify parent components
      if (onMappedDataReady) {
        onMappedDataReady(
          validationResult.validOriginalData,
          validationResult.mappings,
          validationResult.uncleanRows
        )
      }
      
      if (validationResult.isValid && onFileProcessed) {
        onFileProcessed(validationResult.convertedData, requiredColumns)
      } else if (onFileProcessed) {
        onFileProcessed([], requiredColumns)
      }
    } else {
      setParsedData([])
      setUncleanRows([])
      setInvalidPhoneRows([])
      if (onFileProcessed) {
        onFileProcessed([], requiredColumns)
      }
    }
  }

  // Main validation function - uses manual mappings
  const validateAndConvertCSV = (data: Record<string, string>[], headers: string[], mappings: Record<string, number>): ValidationResult => {
    const errors: string[] = []
    const convertedData: CSVRecord[] = []
    const validOriginalData: Record<string, string>[] = []
    const uncleanRows: Record<string, string>[] = []
    // No longer tracking invalid phone rows separately - user can assign country code later
    const invalidPhoneRows: Record<string, string>[] = []

    // Check column count - allow more than 6 columns (extras will be ignored)
    if (headers.length < 6) {
      errors.push(`CSV must have at least 6 columns. Found ${headers.length} columns.`)
      return {
        isValid: false,
        errors,
        mappings: buildColumnMappings(headers, {}),
        convertedData: [],
        validOriginalData: [],
        uncleanRows: [],
        invalidPhoneRows: []
      }
    }

    // Build column mappings from manual mappings
    const columnMappings = buildColumnMappings(headers, mappings)

    // Validate that all required fields are present
    const fieldErrors = validateRequiredFields(mappings)
    if (fieldErrors.length > 0) {
      errors.push(...fieldErrors)
      return {
        isValid: false,
        errors,
        mappings: columnMappings,
        convertedData: [],
        validOriginalData: [],
        uncleanRows: [],
        invalidPhoneRows: []
      }
    }

    // Process all rows and separate invalid contacts (missing both email and phone)
    data.forEach((row) => {
      const convertedRow: CSVRecord = {}
      columnMappings.forEach((mapping) => {
        if (mapping.mappedField) {
          // Normalize phone numbers when processing phone_number field
          if (mapping.mappedField === 'phone_number') {
            const rawPhoneValue = row[mapping.csvColumnName] || ''
            const normalizedPhone = normalizePhoneNumber(rawPhoneValue)
            
            if (normalizedPhone && normalizedPhone.startsWith('+')) {
              // Store normalized phone number (E.164 format)
              convertedRow[mapping.mappedField] = normalizedPhone
            } else if (!isValueEmpty(rawPhoneValue)) {
              // Phone number exists but normalization failed (no country code match)
              // Store the raw input - user can assign country code later
              convertedRow[mapping.mappedField] = rawPhoneValue
            } else {
              // Empty phone number
              convertedRow[mapping.mappedField] = ''
            }
          } else {
            // For non-phone fields, use value as-is
            convertedRow[mapping.mappedField] = row[mapping.csvColumnName] || ''
          }
        }
      })

      // Check if row is invalid (missing both email and phone)
      const emailMapping = columnMappings.find(m => m.mappedField === 'email')
      const phoneMapping = columnMappings.find(m => m.mappedField === 'phone_number')
      
      const emailValue = emailMapping ? row[emailMapping.csvColumnName] : ''
      const phoneValue = phoneMapping ? row[phoneMapping.csvColumnName] : ''
      
      const hasEmail = !isValueEmpty(emailValue)
      // Phone is considered "has" if there's a value, even if normalization failed
      // (user can assign country code later)
      const hasPhone = !isValueEmpty(phoneValue)
      
      // If missing both email and phone, add to uncleanRows
      if (!hasEmail && !hasPhone) {
        uncleanRows.push(row)
      } else {
        // Valid row - has at least email or phone
        validOriginalData.push(row)
        convertedData.push(convertedRow)
      }
    })

    return {
      isValid: errors.length === 0,
      errors,
      mappings: columnMappings,
      convertedData,
      validOriginalData,
      uncleanRows, // Invalid contacts (missing both email and phone)
      invalidPhoneRows: [] // No longer tracking invalid phone rows - user can assign country code later
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

  // Helper function to check if file is valid (CSV or XLSX)
  const isValidFile = (file: File): boolean => {
    const fileName = file.name.toLowerCase()
    const fileExtension = fileName.substring(fileName.lastIndexOf('.'))
    const fileType = file.type
    
    // Check by extension
    if (fileExtension === '.csv' || fileExtension === '.xlsx') {
      return true
    }
    
    // Check by MIME type
    const allowedTypesArray = FILE_CONFIG.allowedTypes as readonly string[]
    if (allowedTypesArray.includes(fileType)) {
      return true
    }
    
    // Fallback: check common MIME types that browsers might not report correctly
    if (fileExtension === '.csv' && (fileType === '' || fileType === 'text/plain')) {
      return true
    }
    
    if (fileExtension === '.xlsx' && 
        (fileType === '' || fileType === 'application/octet-stream')) {
      return true
    }
    
    return false
  }

  // Helper function to check if file is Excel format
  const isExcelFile = (file: File): boolean => {
    const fileName = file.name.toLowerCase()
    return fileName.endsWith('.xlsx')
  }

  const parseCSV = (csvText: string): Promise<{ headers: string[]; data: Record<string, string>[]; sampleData: Record<string, string>[] }> => {
    return new Promise<{ headers: string[]; data: Record<string, string>[]; sampleData: Record<string, string>[] }>((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim(),
        transform: (value: string) => String(value || '').trim(),
        complete: (results) => {
          if (results.errors.length > 0 && results.data.length === 0) {
            reject(new Error('Failed to parse CSV: ' + results.errors[0].message))
            return
          }
          
          const headers = results.meta.fields || []
          const allData = results.data as Record<string, string>[]
          
          // Get first 10 rows for validation preview
          const sampleData = allData.slice(0, 10)
          
          resolve({
            headers,
            data: allData,
            sampleData
          })
        },
        error: (error: Error) => {
          reject(error)
        }
      })
    })
  }

  // Parse Excel file (XLSX or XLS)
  const parseExcel = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    
    // Get the first sheet
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]
    
    // Convert to JSON with header row
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: '' // Default value for empty cells
    }) as string[][]
    
    if (jsonData.length === 0) return { headers: [], data: [], sampleData: [] }
    
    // First row is headers
    const headers = jsonData[0].map(header => String(header || '').trim())
    
    // Rest are data rows
    const allData = jsonData.slice(1).map(row => {
      const rowObj: Record<string, string> = {}
      headers.forEach((header, index) => {
        rowObj[header] = String(row[index] || '').trim()
      })
      return rowObj
    })
    
    // Get first 10 rows for validation preview
    const sampleData = allData.slice(0, 10)
    
    return { headers, data: allData, sampleData }
  }

  // Universal parser that handles both CSV and Excel
  const parseFile = async (file: File): Promise<{ headers: string[]; data: Record<string, string>[]; sampleData: Record<string, string>[] }> => {
    if (isExcelFile(file)) {
      return await parseExcel(file)
    } else {
      const text = await file.text()
      return await parseCSV(text)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && isValidFile(selectedFile)) {
      setFile(selectedFile)
      setUploadError(null)
      setUploadSuccess(null)
      setManualMappings({}) // Reset manual mappings
      setAutoMappedFields(new Set()) // Reset auto-mapped fields
      setFieldValidationErrors({}) // Reset field validation errors
      setParsedData([]) // Reset parsed data
      setUncleanRows([]) // Reset unclean rows - IMPORTANT: Clear stale data before new validation
      setInvalidPhoneRows([]) // Reset invalid phone rows
      
      // Also notify parent to reset uncleanRows state
      if (onMappedDataReady) {
        onMappedDataReady([], [], [])
      }
      
      // Parse the file immediately (CSV or Excel)
      try {
        const { headers, data, sampleData } = await parseFile(selectedFile)
        
        // Store headers, data, and sample rows for validation
        setCsvHeaders(headers)
        setCsvData(data)
        setSampleRows(sampleData)
        
        // Validate column count
        if (headers.length < 6) {
          setValidationErrors([`File must have at least 6 columns. Found ${headers.length} columns.`])
          setParsedData([])
          setUncleanRows([])
          setInvalidPhoneRows([])
          if (onFileProcessed) {
            onFileProcessed([], requiredColumns)
          }
          return
        }
        
        // Auto-map columns using fuzzy matching
        const autoMappings = autoMapColumns(headers)
        setManualMappings(autoMappings)
        setAutoMappedFields(new Set(Object.keys(autoMappings))) // Track auto-mapped fields
        
        // Build column mappings with auto-mapped fields
        const initialColumnMappings = buildColumnMappings(headers, autoMappings, new Set(Object.keys(autoMappings)))
        setColumnMappings(initialColumnMappings)
        
        // Validate auto-mapped columns
        const newFieldErrors: Record<string, string> = {}
        Object.entries(autoMappings).forEach(([field, colIndex]) => {
          const csvHeader = headers[colIndex]
          if (csvHeader && sampleData.length > 0) {
            const validation = validateColumnData(field, csvHeader, sampleData)
            if (!validation.isValid && validation.error) {
              newFieldErrors[field] = validation.error
            }
          }
        })
        setFieldValidationErrors(newFieldErrors)
        
        // Check if all required fields are mapped
        const fieldErrors = validateRequiredFields(autoMappings)
        setValidationErrors(fieldErrors)
        
        // If auto-mapping worked, process the data
        if (fieldErrors.length === 0 && data.length > 0) {
          const validationResult = validateAndConvertCSV(data, headers, autoMappings)
          setParsedData(validationResult.convertedData)
          setUncleanRows(validationResult.uncleanRows)
          
          if (onMappedDataReady) {
            onMappedDataReady(
              validationResult.validOriginalData,
              validationResult.mappings,
              validationResult.uncleanRows
            )
          }
          
          if (validationResult.isValid && onFileProcessed) {
            onFileProcessed(validationResult.convertedData, requiredColumns)
          }
        } else {
          setParsedData([])
          setUncleanRows([])
          setInvalidPhoneRows([])
          if (onFileProcessed) {
            onFileProcessed([], requiredColumns)
          }
          if (fieldErrors.length === 0) {
            setValidationErrors(['Please review and confirm the auto-mapped columns above.'])
          }
        }
      } catch (error) {
        console.error('Error parsing file:', error)
        setUploadError('Error reading file. Please ensure the file is a valid CSV or Excel format.')
        setValidationErrors(['Failed to parse file. Please check the file format.'])
      }
    } else {
      setUploadError('Please select a valid CSV or Excel file (.csv, .xlsx)')
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
      if (isValidFile(droppedFile)) {
        setFile(droppedFile)
        setUploadError(null)
        setUploadSuccess(null)
        setManualMappings({}) // Reset manual mappings
        setAutoMappedFields(new Set()) // Reset auto-mapped fields
        setFieldValidationErrors({}) // Reset field validation errors
        setParsedData([]) // Reset parsed data
        setUncleanRows([]) // Reset unclean rows - IMPORTANT: Clear stale data before new validation
        setInvalidPhoneRows([]) // Reset invalid phone rows
        
        // Also notify parent to reset uncleanRows state
        if (onMappedDataReady) {
          onMappedDataReady([], [], [])
        }
        
        // Parse the file immediately (CSV or Excel)
        try {
          const { headers, data, sampleData } = await parseFile(droppedFile)
          
          // Store headers, data, and sample rows for validation
          setCsvHeaders(headers)
          setCsvData(data)
          setSampleRows(sampleData)
          
          // Validate column count
          if (headers.length < 6) {
            setValidationErrors([`File must have at least 6 columns. Found ${headers.length} columns.`])
            setParsedData([])
            setUncleanRows([])
            setInvalidPhoneRows([])
            if (onFileProcessed) {
              onFileProcessed([], requiredColumns)
            }
            return
          }
          
          // Auto-map columns using fuzzy matching
          const autoMappings = autoMapColumns(headers)
          setManualMappings(autoMappings)
          
          // Build column mappings with auto-mapped fields
          const initialColumnMappings = buildColumnMappings(headers, autoMappings)
          setColumnMappings(initialColumnMappings)
          
          // Validate auto-mapped columns
          const newFieldErrors: Record<string, string> = {}
          Object.entries(autoMappings).forEach(([field, colIndex]) => {
            const csvHeader = headers[colIndex]
            if (csvHeader && sampleData.length > 0) {
              const validation = validateColumnData(field, csvHeader, sampleData)
              if (!validation.isValid && validation.error) {
                newFieldErrors[field] = validation.error
              }
            }
          })
          setFieldValidationErrors(newFieldErrors)
          
          // Check if all required fields are mapped
          const fieldErrors = validateRequiredFields(autoMappings)
          setValidationErrors(fieldErrors)
          
          // If auto-mapping worked, process the data
          if (fieldErrors.length === 0 && data.length > 0) {
            const validationResult = validateAndConvertCSV(data, headers, autoMappings)
            setParsedData(validationResult.convertedData)
            setUncleanRows(validationResult.uncleanRows)
            
            if (onMappedDataReady) {
              onMappedDataReady(
                validationResult.validOriginalData,
                validationResult.mappings,
                validationResult.uncleanRows
              )
            }
            
            if (validationResult.isValid && onFileProcessed) {
              onFileProcessed(validationResult.convertedData, requiredColumns)
            }
          } else {
            setParsedData([])
            setUncleanRows([])
            if (onFileProcessed) {
              onFileProcessed([], requiredColumns)
            }
            if (fieldErrors.length === 0) {
              setValidationErrors(['Please review and confirm the auto-mapped columns above.'])
            }
          }
        } catch (error) {
          console.error('Error parsing file:', error)
          setUploadError('Error reading file. Please ensure the file is a valid CSV or Excel format.')
          setValidationErrors(['Failed to parse file. Please check the file format.'])
        }
      } else {
        setUploadError('Please select a valid CSV or Excel file (.csv, .xlsx)')
      }
    }
  }

  const handleRemoveFile = () => {
    setFile(null)
    setParsedData([])
    setValidationErrors([])
    setFieldValidationErrors({})
    setColumnMappings([])
    setUncleanRows([])
    setInvalidPhoneRows([])
    setUploadError(null)
    setUploadSuccess(null)
    setUploadProgress(0)
    setCsvHeaders([])
    setCsvData([])
    setSampleRows([])
    setManualMappings({})
    setAutoMappedFields(new Set())
    
    // Clear mapped data in parent
    if (onMappedDataReady) {
      onMappedDataReady([], [], [])
    }
    if (onFileProcessed) {
      onFileProcessed([], requiredColumns)
    }
    
    // Reset file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
    }
  }

  // Actual upload function that performs the upload
  const performUpload = async () => {
    if (!file || !client) return

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

      // Rebuild CSV with ALL rows (both valid and invalid) - backend will handle validation
      // Combine valid and invalid rows for upload
      const allRows = [...parsedData]
      // Add invalid rows back to the CSV content
      uncleanRows.forEach((row) => {
        const convertedRow: CSVRecord = {}
        columnMappings.forEach((mapping) => {
          if (mapping.mappedField) {
            convertedRow[mapping.mappedField] = row[mapping.csvColumnName] || ''
          }
        })
        allRows.push(convertedRow)
      })
      
      const allCsvContent = buildCsvContent(allRows)
      const cleanedFile = new File([allCsvContent], file.name, { type: 'text/csv' })

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
          setFieldValidationErrors({})
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

  const handleUpload = async () => {
    if (!file) return

    // Check if user is authenticated
    if (!client) {
      setUploadError('You must be logged in to upload CSV files')
      return
    }

    // Block upload if validation errors exist (column mapping errors)
    if (validationErrors.length > 0) {
      setUploadError('Please fix CSV validation errors before uploading')
      return
    }

    // Ensure we have data to upload (valid or invalid contacts)
    if (parsedData.length === 0 && uncleanRows.length === 0) {
      setUploadError('No data to upload. Please check your CSV file.')
      return
    }

    // Check if there are field validation warnings
    const hasValidationWarnings = Object.keys(fieldValidationErrors).length > 0

    if (hasValidationWarnings) {
      // Show confirmation dialog
      setShowConfirmDialog(true)
      return
    }

    // No warnings, proceed with upload
    await performUpload()
  }

  const handleConfirmUpload = async () => {
    setShowConfirmDialog(false)
    await performUpload()
  }

  const handleCancelUpload = () => {
    setShowConfirmDialog(false)
  }

  const uploadIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
    </svg>
  )

  return (
    <>
    <Card variant="elevated">
      <CardHeader
        title="Upload CSV or Excel File"
        subtitle="Upload a CSV or Excel file (.csv, .xlsx) containing contact information to import into your database."
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
              accept=".csv,.xlsx"
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
                    {dragActive ? 'Drop your file here' : 'Choose CSV or Excel file or drag and drop'}
                  </p>
                  <p className="text-sm text-slate-500 mt-2">
                    CSV or Excel files (.csv, .xlsx) up to 10MB
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <div className={`mx-auto w-16 h-16 rounded-xl flex items-center justify-center shadow-md ${
                    isExcelFile(file) 
                      ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                      : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                  }`}>
                    {isExcelFile(file) ? (
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    ) : (
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleRemoveFile()
                    }}
                    className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors duration-200 z-20"
                    title="Remove file"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-slate-900 break-words">{file.name}</p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      isExcelFile(file)
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {isExcelFile(file) ? 'Excel' : 'CSV'}
                    </span>
                    <span className="text-sm text-slate-500">
                      {(file.size / 1024).toFixed(2)} KB
                    </span>
                  </div>
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

          {/* Manual Column Mapping UI */}
          {file && csvHeaders.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-slate-900 mb-3">Map File Columns to Required Fields</h4>
              <p className="text-xs text-slate-600 mb-4">
                Select which column from your file corresponds to each required field. All 6 fields must be mapped before upload.
              </p>
              <div className="space-y-3">
                {requiredColumns.map((requiredField) => {
                  const isMapped = manualMappings[requiredField] !== undefined
                  const selectedColumnIndex = manualMappings[requiredField]
                  const selectedColumnName = selectedColumnIndex !== undefined ? csvHeaders[selectedColumnIndex] : ''
                  const fieldError = fieldValidationErrors[requiredField]
                  const hasValidationError = !!fieldError
                  
                  return (
                    <div key={requiredField} className="space-y-2">
                      <div 
                        className={`flex items-center gap-3 p-3 rounded border ${
                          hasValidationError
                            ? 'bg-amber-50 border-amber-300'
                            : isMapped 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-white border-slate-300'
                        }`}
                      >
                        <span className="text-sm font-medium text-slate-900 w-32 flex-shrink-0">
                          {fieldDisplayNames[requiredField]}
                          <span className="text-red-500 ml-1">*</span>
                        </span>
                        <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        <select
                          value={selectedColumnIndex !== undefined ? selectedColumnIndex : ''}
                          onChange={(e) => {
                            const value = e.target.value
                            handleManualMappingChange(
                              requiredField,
                              value === '' ? null : parseInt(value, 10)
                            )
                          }}
                          className={`flex-1 min-w-0 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            hasValidationError
                              ? 'border-amber-400 bg-white'
                              : isMapped 
                                ? 'border-green-300 bg-white' 
                                : 'border-slate-300 bg-white'
                          }`}
                        >
                          <option value="">Select Column...</option>
                          {csvHeaders.map((header, index) => {
                            // Check if this column is already mapped to another field
                            const alreadyMapped = Object.entries(manualMappings).find(
                              ([field, colIdx]) => colIdx === index && field !== requiredField
                            )
                            const isSelected = selectedColumnIndex === index
                            
                            return (
                              <option 
                                key={index} 
                                value={index}
                                disabled={!!alreadyMapped && !isSelected}
                              >
                                {header} {alreadyMapped && !isSelected ? '(already mapped)' : ''}
                              </option>
                            )
                          })}
                        </select>
                        {isMapped && !hasValidationError && (
                          <span className="text-xs text-green-600 font-medium flex-shrink-0 whitespace-nowrap">
                            ✓ Mapped
                          </span>
                        )}
                      </div>
                      {hasValidationError && (
                        <div className="ml-36 bg-amber-50 border border-amber-200 rounded-md p-2">
                          <div className="flex items-start space-x-2">
                            <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <p className="text-xs text-amber-800">{fieldError}</p>
                          </div>
                        </div>
                      )}
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
          )}

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
                    Please map all required fields using the dropdowns above. Your CSV must have at least 6 columns, and you need to manually select which column corresponds to each required field.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {file && validationErrors.length === 0 && (parsedData.length > 0 || uncleanRows.length > 0) && !uploadSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-green-800">CSV Ready for Upload</h4>
                  <p className="text-sm text-green-700">
                    {parsedData.length} valid contact{parsedData.length !== 1 ? 's' : ''} ready for upload.
                    {uncleanRows.length > 0 && (
                      <span className="text-amber-700 font-medium">
                        {' '}{uncleanRows.length} invalid contact{uncleanRows.length !== 1 ? 's' : ''} (missing both email and phone) will also be uploaded but may not be usable.
                      </span>
                    )}
                    {' '}All records will be uploaded to the database.
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
            disabled={!file || isUploading || validationErrors.length > 0 || (parsedData.length === 0 && uncleanRows.length === 0)}
            isLoading={isUploading}
            leftIcon={!isUploading ? uploadIcon : undefined}
            className="w-full"
            size="lg"
          >
            {isUploading ? 'Uploading...' : 
             validationErrors.length > 0 ? 'Fix Errors to Upload' :
             !file ? 'Upload File' :
             `Upload ${file.name}`}
          </Button>

          {/* File Requirements - Dynamic based on selected file */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-semibold text-slate-900">File Requirements</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* File Format - Dynamic */}
              <div className="flex items-center space-x-2">
                <div className="flex-shrink-0 w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-200">
                  {file ? (
                    isExcelFile(file) ? (
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )
                  ) : (
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-slate-700">
                    {file ? (
                      <>
                        <span className="text-slate-900 font-semibold">{file.name}</span>
                        <span className="text-slate-500 ml-2">
                          ({isExcelFile(file) ? 'Excel' : 'CSV'} format)
                        </span>
                      </>
                    ) : (
                      'CSV or Excel format (.csv, .xlsx)'
                    )}
                  </div>
                </div>
              </div>
              
              {/* File Size */}
              <div className="flex items-center space-x-2">
                <div className="flex-shrink-0 w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-200">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-slate-700">
                    {file ? (
                      <>
                        <span className="text-slate-900 font-semibold">
                          {(file.size / 1024).toFixed(2)} KB
                        </span>
                        <span className="text-slate-500 ml-2">/ Max 10MB</span>
                      </>
                    ) : (
                      'Max 10MB size'
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Required Fields */}
            <div className="pt-2 border-t border-slate-200">
              <div className="flex items-start space-x-2">
                <div className="flex-shrink-0 w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-200 mt-0.5">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-xs font-medium text-slate-700">
                    <span className="text-slate-900 font-semibold">6 fields required:</span>
                    <span className="text-slate-600 ml-1">
                      business_name, zipcode, state, phone_number, website, email
                    </span>
                    <span className="text-slate-500 text-xs block mt-1">
                      (any order, extra columns allowed)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    
    {/* Confirmation Dialog for Validation Warnings */}
    <ConfirmDialog
      isOpen={showConfirmDialog}
      title="Validation Warnings Detected"
      message={
        `You have validation warnings for the following field mappings:\n\n` +
        Object.entries(fieldValidationErrors)
          .map(([field, error]) => `• ${fieldDisplayNames[field] || field}: ${error}`)
          .join('\n') +
        `\n\nThe selected columns may not match the expected data format for these fields.\n\nAre you sure you want to proceed with the upload? The data might be incorrectly mapped.`
      }
      confirmText="Yes, Proceed Anyway"
      cancelText="Cancel"
      variant="warning"
      onConfirm={handleConfirmUpload}
      onCancel={handleCancelUpload}
      isLoading={isUploading}
    />
    </>
  )
}
