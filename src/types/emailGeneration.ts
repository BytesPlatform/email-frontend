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
  subjectLine?: string
  bodyText?: string
  icebreaker?: string
  productsRelevant?: string
  status?: string
  contactId?: number
  summaryId?: number
  clientEmailId?: number
  createdAt?: string
  updatedAt?: string
  // Legacy fields for backward compatibility
  subject?: string
  body?: string
  tone?: string
}

export interface SummaryGenerationRequest {
  contactId: number
  uploadId: number
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
  hasSummary?: boolean // Flag to indicate summary exists (without loading full data)
  isGeneratingSummary?: boolean
  isGeneratingEmail?: boolean
  isSendingEmail?: boolean
  isLoadingSummary?: boolean // Flag for when fetching summary on View click
  isLoadingEmailDraft?: boolean // Flag for when fetching email draft on View Body click
}

// Component state types
export interface EmailGenerationState {
  scrapedRecords: ScrapedRecord[]
  isLoadingRecords: boolean
  error: string | null
  currentPage: number
  recordsPerPage: number
}
