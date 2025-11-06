export interface UnsubscribeResponse {
  success: boolean
  contactId: number
  message: string
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

