export interface CsvUploadResponse {
  message: string
  filename: string
  size: number
  uploadId: number
  totalRecords: number
  successfulRecords: number
  data: Array<Record<string, unknown>>
  contacts: Array<Record<string, unknown>>
  validationStatus: string
}

export interface CsvUpload {
  id: number
  fileName: string
  status: 'success' | 'failure' | 'in_progress'
  totalRecords: number
  successfulRecords: number
  description: string
  createdAt: string
  contacts: Array<Record<string, unknown>>
}

export interface CSVRecord {
  business_name?: string
  zipcode?: string
  state?: string
  phone_number?: string
  website?: string
  email?: string
  [key: string]: string | undefined
}

export interface ClientContact {
  id: number
  csvUploadId: number
  businessName?: string
  website?: string
  email?: string
  state?: string
  zipCode?: string
  status?: string
  valid?: boolean
  createdAt?: string
  errorMessage?: string | null
  csvUpload?: {
    id: number
    fileName: string
    createdAt: string
  }
  [key: string]: unknown
}

export interface AllClientContactsResponse {
  message: string
  count: number
  contacts: ClientContact[]
}

