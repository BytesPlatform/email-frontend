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
  isGeneratingSummary?: boolean
  isGeneratingEmail?: boolean
}

// Component state types
export interface EmailGenerationState {
  scrapedRecords: ScrapedRecord[]
  isLoadingRecords: boolean
  error: string | null
  currentPage: number
  recordsPerPage: number
}
