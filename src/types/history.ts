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

