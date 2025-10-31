export interface SMSDraft {
  id: number
  messageText?: string
  message?: string // Legacy field for backward compatibility
  contactId?: number
  summaryId?: number
  status?: string
  createdAt?: string
  updatedAt?: string
  characterCount?: number
  // Related data (included in getSmsDraft response)
  contact?: {
    businessName?: string
    phone?: string
    email?: string
  }
  summary?: {
    summaryText?: string
    painPoints?: string[]
    opportunities?: string[]
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
}

