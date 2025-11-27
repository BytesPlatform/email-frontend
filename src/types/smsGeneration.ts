export interface SMSDraft {
  id: number
  messageText?: string
  message?: string // Legacy field for backward compatibility
  contactId?: number
  summaryId?: number
  clientId?: number
  status?: string
  createdAt?: string
  updatedAt?: string
  characterCount?: number
  // Related data (included in getSmsDraft and getClientSmsDrafts response)
  contact?: {
    id: number
    businessName?: string
    phone?: string
    email?: string
  }
  summary?: {
    id: number
    summaryText?: string
    painPoints?: string[]
    strengths?: string[]
    opportunities?: string[]
    keywords?: string[]
  }
  clientSms?: {
    id: number
    phoneNumber?: string
    status?: string
    currentCounter?: number
    totalCounter?: number
    limit?: number
  }
}

export interface SMSGenerationResponse {
  success: boolean
  smsDraft?: SMSDraft
  message?: string
  characterCount?: number
}

export interface SMSGenerationRequest {
  contactId: number
  summaryId: number
  clientId: number
  clientSmsId?: number
}

export interface SMSGenerationResult {
  contactId: number
  summaryId: number
  smsDraftId: number
  success: boolean
  error?: string
}

export interface SmsBulkStatusEntry {
  contactId: number
  hasSmsDraft: boolean
  smsDraftId: number | null
  smsStatus: string | null
}

