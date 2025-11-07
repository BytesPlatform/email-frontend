export interface UnsubscribeResponse {
  success: boolean
  contactId: number
  message: string
}

export interface UnsubscribeListItem {
  id: number
  contactId: number
  email: string | null
  businessName: string
  phone: string | null
  unsubscribedAt: string | null
  reason: string | null
  unsubscribeToken?: string | null
}

export interface UnsubscribeHistory {
  contactId: number
  contactEmail: string
  isUnsubscribed: boolean
  unsubscribeRecord?: {
    id: number
    unsubscribedAt: string
    reason: string | null
  }
}

export interface UnsubscribeDto {
  reason?: string
}

