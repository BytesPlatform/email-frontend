import type { ScrapeSingleResponseData } from './scraping'

export interface BusinessSummary {
  id: number
  contactId: number
  scrapedDataId: number
  summaryText: string
  painPoints: string[]
  strengths: string[]
  opportunities: string[]
  keywords: string[]
  aiModel?: string
  createdAt?: string
  updatedAt?: string
  scrapedData?: {
    url: string
    scrapedAt: string
    scrapeSuccess: boolean
  }
  // Legacy fields for backward compatibility
  businessName?: string
  industry?: string
  services?: string[]
  keyFeatures?: string[]
  targetAudience?: string
  businessSize?: string
  location?: string
  website?: string
  contactInfo?: {
    email?: string
    phone?: string
    address?: string
  }
  socialMedia?: {
    platform: string
    url: string
  }[]
  summary?: string
  generatedAt?: string
}

export interface GeneratedEmail {
  subject: string
  body: string
  personalization: {
    businessName: string
    industry: string
    keyFeatures: string[]
  }
  tone: 'professional' | 'friendly' | 'persuasive'
  callToAction: string
  generatedAt: string
}

// Backend email draft entity
export interface EmailDraft {
  id: number
  subjectLines?: string[]
  bodyText?: string
  icebreaker?: string
  productsRelevant?: string
  status?: string
  contactId?: number
  summaryId?: number
  clientId?: number
  clientEmailId?: number
  createdAt?: string
  updatedAt?: string
  // Legacy fields for backward compatibility
  subjectLine?: string // For backward compatibility
  subject?: string
  body?: string
  tone?: string
  // Related data (included in getAllEmailDrafts response)
  contact?: {
    id?: number
    businessName?: string
    email?: string
    phone?: string
    website?: string
  }
  summary?: {
    id?: number
    summaryText?: string
    painPoints?: string[]
    strengths?: string[]
    opportunities?: string[]
    keywords?: string[]
  }
  clientEmail?: {
    id?: number
    emailAddress?: string
  }
}

export interface SummaryGenerationRequest {
  contactId: number
  uploadId: number
}

export interface SummarizationResult {
  contactId: number
  success: boolean
  summary?: BusinessSummary
  error?: string
}

export interface BulkSummarizationResponse {
  message: string
  success: boolean
  totalProcessed: number
  successful: number
  failed: number
  results: SummarizationResult[]
}

export interface GenerateEmailDto {
  contactId: number
  summaryId: number
  clientId: number
  clientEmailId?: number
  tone?: string
}

export interface EmailGenerationResult {
  contactId: number
  summaryId: number
  emailDraftId: number
  success: boolean
  error?: string
}

export interface BulkEmailGenerationResponse {
  totalProcessed: number
  successful: number
  failed: number
  results: EmailGenerationResult[]
}

export interface EmailGenerationRequest {
  contactId: number
  summaryData: BusinessSummary
  emailType: 'sales' | 'outreach' | 'follow-up'
  tone?: 'professional' | 'friendly' | 'persuasive'
}

export interface EmailGenerationResponse {
  success: boolean
  data?: GeneratedEmail
  error?: string
  message?: string
}

export interface SummaryGenerationResponse {
  success: boolean
  data?: BusinessSummary
  error?: string
  message?: string
}

// Spam check types
export interface SpamCheckResult {
  score: number
  keywords: string[]
  suggestions: string[]
  blocked: boolean
}

export interface CheckSpamDto {
  draftId?: number
  content?: string
  subjectLine?: string
}

export interface OptimizationSuggestions {
  suggestions: string[]
  optimizedContent?: string
}

export interface OptimizeDto {
  draftId?: number
  content?: string
  subjectLine?: string
}

export interface BulkStatusEntry {
  contactId: number
  hasSummary: boolean
  hasEmailDraft: boolean
  hasSMSDraft?: boolean // Optional - only present for SMS mode
  emailDraftId: number | null
  smsDraftId?: number | null // Optional - only present for SMS mode
  smsStatus?: string | null // Optional - only present for SMS mode
}

export interface BulkStatusPagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

// Scraped record interface (reusing from scraping types)
export interface ScrapedRecord {
  id: number
  contactId: number
  businessName?: string
  website?: string
  email?: string
  state?: string
  zipCode?: string
  status: string
  scrapedData?: ScrapeSingleResponseData
  generatedSummary?: BusinessSummary
  generatedEmail?: GeneratedEmail
  emailDraftId?: number
  smsDraftId?: number // SMS draft ID (similar to emailDraftId)
  generatedSMS?: GeneratedEmail
  smsStatus?: string // SMS status: 'draft', 'sent', 'failed'
  hasSummary?: boolean // Flag to indicate summary exists (without loading full data)
  hasEmailDraft?: boolean // Flag to indicate email draft exists (without loading full data)
  hasSMSDraft?: boolean // Flag to indicate SMS draft exists (without loading full data)
  isGeneratingSummary?: boolean
  isGeneratingEmail?: boolean
  isGeneratingSMS?: boolean
  isSendingEmail?: boolean
  isSendingSMS?: boolean
  isCheckingSpam?: boolean
  spamCheckResult?: SpamCheckResult // Spam check result for email drafts
  isLoadingEmailDraft?: boolean
  isLoadingSummary?: boolean
  isLoadingSMSDraft?: boolean
}

// Component state types
export interface EmailGenerationState {
  scrapedRecords: ScrapedRecord[]
  isLoadingRecords: boolean
  isLoadingBulkStatus: boolean // Track bulk status API loading
  error: string | null
  currentPage: number
  recordsPerPage: number
  totalItems?: number // Total items from API for server-side pagination
}
