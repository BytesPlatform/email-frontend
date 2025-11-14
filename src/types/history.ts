export interface ScrapingHistoryItem {
  id: number
  contactId: number
  businessName: string | null
  email: string
  website: string | null
  scrapedAt: Date
  method: string
  success: boolean
  errorMessage?: string
  discoveredUrl?: string
  pagesScraped: number
  extractedEmails: number
  extractedPhones: number
  contentLength: number
}

export interface Pagination {
  page: number
  limit: number
  totalPages: number
  totalItems: number
}

export interface ClientHistoryFilters {
  status?: 'all' | 'success' | 'failed'
  method?: string
  dateFrom?: string
  dateTo?: string
  businessName?: string
  page?: number
  limit?: number
  sortBy?: 'scrapedAt' | 'businessName' | 'method'
  sortOrder?: 'asc' | 'desc'
}

export interface ClientScrapingHistoryResponse {
  totalScrapes: number
  successfulScrapes: number
  failedScrapes: number
  recentActivity: ScrapingHistoryItem[]
  pagination: Pagination
}

export interface UploadHistorySummary {
  total: number
  successful: number
  failed: number
  avgTime: string
}

export interface UploadScrapingHistoryResponse {
  uploadId: number
  uploadName: string
  scrapingHistory: ScrapingHistoryItem[]
  summary: UploadHistorySummary
}

export interface ScrapingAttempt {
  attemptNumber: number
  scrapedAt: Date
  method: string
  success: boolean
  errorMessage?: string
  discoveredUrl?: string
  pagesScraped: number
  dataQuality: 'excellent' | 'good' | 'fair' | 'poor'
}

export interface ContactScrapingHistoryResponse {
  contactId: number
  businessName: string | null
  scrapingAttempts: ScrapingAttempt[]
  currentStatus: string
}

export interface MethodStats {
  count: number
  successRate: number
}

export interface DailyActivity {
  date: string
  attempts: number
  successful: number
  failed: number
}

export interface FailedReason {
  reason: string
  count: number
}

export interface ContentQuality {
  quality: string
  count: number
}

export interface ScrapingAnalytics {
  totalScrapes: number
  successRate: number
  avgScrapingTime: number
  methodBreakdown: {
    direct_url: MethodStats
    email_domain: MethodStats
    business_search: MethodStats
  }
  dailyActivity: DailyActivity[]
  topFailedReasons: FailedReason[]
  contentQuality: ContentQuality[]
}

export type SentStatus = 'all' | 'sent' | 'delivered' | 'failed'

export interface SentHistoryFilters {
  page?: number
  limit?: number
  status?: SentStatus
  search?: string
}

export interface SentEmailLog {
  id: number
  contactId?: number | null
  contactName?: string | null
  contactEmail?: string | null
  subject?: string | null
  body?: string | null
  sentAt: string
  status?: string | null
  deliveryStatus?: string | null
  opens?: number | null
  clicks?: number | null
}

export interface SentSmsLog {
  id: number
  contactId?: number | null
  contactName?: string | null
  contactPhone?: string | null
  message?: string | null
  sentAt: string
  status?: string | null
  deliveryStatus?: string | null
}

export interface PaginatedSentLogs<T> {
  items: T[]
  pagination: Pagination
}

// SMS Log types
export interface SmsLogContact {
  id: number
  businessName?: string | null
  phone?: string | null
  email?: string | null
}

export interface SmsLogDraft {
  id: number
  messageText?: string | null
  status?: string | null
  createdAt?: string | Date | null
}

export interface SmsLogClientSms {
  id: number
  phoneNumber?: string | null
  status?: string | null
  currentCounter?: number | null
  totalCounter?: number | null
  limit?: number | null
}

export interface SmsLog {
  id: number
  smsDraftId: number
  contactId: number
  clientSmsId: number
  status: string
  providerResponse?: Record<string, unknown>
  sentAt: string | Date
  contact?: SmsLogContact
  smsDraft?: SmsLogDraft
  clientSms?: SmsLogClientSms
}

export interface SmsLogsResponse {
  message: string
  success: boolean
  count: number
  data: SmsLog[]
}

// Email Log types
export interface EmailLogContact {
  id: number
  businessName?: string | null
  email?: string | null
  phone?: string | null
}

export interface EmailLogClientEmail {
  id: number
  emailAddress?: string | null
  status?: string | null
  currentCounter?: number | null
  totalCounter?: number | null
  limit?: number | null
}

export interface EmailLogDraft {
  id: number
  subjectLine?: string | null
  bodyText?: string | null
  status?: string | null
  createdAt?: string | Date | null
  clientEmail?: EmailLogClientEmail
}

export interface EmailLogEngagement {
  id: number
  engagementType?: string | null
  engagedAt?: string | Date | null
  url?: string | null
}

export interface EmailLog {
  id: number
  emailDraftId: number
  contactId: number
  status: string
  sentAt: string | Date
  trackingPixelToken?: string | null
  unsubscribeToken?: string | null
  providerResponse?: Record<string, unknown>
  contact?: EmailLogContact
  emailDraft?: EmailLogDraft
  emailEngagements?: EmailLogEngagement[]
}

export interface EmailLogsResponse {
  message: string
  success: boolean
  count: number
  data: EmailLog[]
}

