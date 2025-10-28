export type ContactStatus = 'ready_to_scrape' | 'scraping' | 'scraped' | 'scrape_failed'

export type ScrapeMethod = 'direct_url' | 'email_domain' | 'business_search'

export interface ReadyContact {
  id: number
  csvUploadId: number
  businessName?: string
  website?: string
  email?: string
  state?: string
  zipCode?: string
  status: ContactStatus
  scrapeMethod?: ScrapeMethod | null
  scrapePriority?: number
  // Allow extra backend fields without breaking the UI
  [key: string]: unknown
}

export interface ReadyContactsResponse {
  message: string
  uploadId: number
  count: number
  contacts: ReadyContact[]
}

export interface ScrapeSingleResponseData {
  id: number
  contactId: number
  method: ScrapeMethod | 'direct_url' | 'email_domain' | 'business_search'
  url?: string
  searchQuery?: string
  discoveredUrl?: string
  homepageText?: string | null
  homepageHtml?: string | null
  servicesText?: string | null
  servicesHtml?: string | null
  productsText?: string | null
  productsHtml?: string | null
  contactText?: string | null
  contactHtml?: string | null
  extractedEmails?: string[]
  extractedPhones?: string[]
  pageTitle?: string
  metaDescription?: string | null
  keywords?: string[]
  scrapeSuccess: boolean
  errorMessage?: string | null
  timestamp?: string
}

export interface ScrapeSingleResponse {
  message: 'Contact scraped successfully' | 'Scraping failed'
  contactId: number
  success: boolean
  data?: ScrapeSingleResponseData
  error?: string | null
}

export interface BatchScrapeItemSuccess {
  contactId: number
  success: true
  scrapedData: ScrapeSingleResponseData
}

export interface BatchScrapeItemFailure {
  contactId: number
  success: false
  error: string
}

export type BatchScrapeItem = BatchScrapeItemSuccess | BatchScrapeItemFailure

export interface BatchScrapeResponse {
  message: string
  uploadId: number
  limit: number
  summary: {
    total: number
    successful: number
    failed: number
  }
  results: BatchScrapeItem[]
}

export interface StatsResponse {
  message: string
  stats: {
    uploadId: number
    totalContacts: number
    readyToScrape: number
    scraping: number
    scraped: number
    scrapeFailed: number
    byStatus: Record<string, number>
  }
}
