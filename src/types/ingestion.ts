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
  phone?: string
  state?: string
  zipCode?: string
  status?: string
  valid?: boolean
  emailValid?: boolean
  websiteValid?: boolean
  validationReason?: string
  computedValid?: boolean
  computedValidationReason?: string
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

export interface ClientContactsMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  totalValid?: number
  totalInvalid?: number
}

export interface ClientContactsListResponse {
  data: ClientContact[]
  meta: ClientContactsMeta
}

export interface ClientContactsQuery {
  page?: number
  limit?: number
  status?: string
  csvUploadId?: number
  validOnly?: boolean
  invalidOnly?: boolean
  search?: string
  searchField?: 'all' | 'businessName' | 'email' | 'website'
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface UpdateContactPayload {
  businessName?: string
  email?: string | null
  phone?: string | null
  website?: string | null
  state?: string | null
  zipCode?: string | null
  status?: string
  valid?: boolean
}

export interface UpdateContactResponse {
  message?: string
  contact: ClientContact
}

export interface BulkUpdateContactItem {
  id: number
  businessName?: string
  email?: string | null
  phone?: string | null
  website?: string | null
  state?: string | null
  zipCode?: string | null
  status?: string
  valid?: boolean
}

export interface BulkUpdateContactsPayload {
  contacts: BulkUpdateContactItem[]
}

export interface BulkUpdateResult {
  updated: ClientContact[]
  failed: Array<{ id: number; error: string }>
}

