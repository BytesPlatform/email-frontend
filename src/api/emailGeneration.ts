import { apiClient, ApiResponse } from './ApiClient'
import {
  BusinessSummary,
  GeneratedEmail,
  SummaryGenerationResponse,
  EmailGenerationResponse,
  EmailDraft,
  SpamCheckResult,
  CheckSpamDto,
  OptimizationSuggestions,
  OptimizeDto,
  BulkStatusEntry,
  BulkStatusPagination,
} from '@/types/emailGeneration'
import type { EmailLog, EmailLogsResponse } from '@/types/history'

export const emailGenerationApi = {
  /**
   * Summarize contact's scraped data
   * POST /summarization/contact/:contactId
   */
  async summarizeContact(contactId: number): Promise<ApiResponse<BusinessSummary>> {
    try {
      console.log(`Calling API: /summarization/contact/${contactId} (120s timeout)`)
      const response = await apiClient.post<BusinessSummary>(
        `/summarization/contact/${contactId}`,
        undefined,
        120000 // 120 seconds (2 minutes) for AI processing
      )
      console.log(`API response:`, response)
      return response
    } catch (error) {
      console.error('Error summarizing contact:', error)
      throw error
    }
  },

  /**
   * Fetch existing summary for a contact
   * GET /summarization/contact/:contactId
   */
  async getContactSummary(contactId: number): Promise<ApiResponse<BusinessSummary>> {
    try {
      console.log(`Fetching existing summary for contact: ${contactId}`)
      const response = await apiClient.get<BusinessSummary>(`/summarization/contact/${contactId}`)
      console.log(`Summary fetch response:`, response)
      return response
    } catch (error) {
      console.log(`No existing summary found for contact ${contactId}:`, error)
      throw error
    }
  },

  /**
   * Bulk summarize multiple contacts
   * POST /summarization/bulk-generate
   * Body: { contactIds: number[] }
   */
  async bulkSummarizeContacts(contactIds: number[]): Promise<ApiResponse<{
    message: string
    success: boolean
    totalProcessed: number
    successful: number
    failed: number
    totalTimeSeconds: number
    estimatedTimeSeconds: number
    results: Array<{
      contactId: number
      success: boolean
      summary?: BusinessSummary
      error?: string
    }>
  }>> {
    try {
      console.log(`Calling bulk summarization API for ${contactIds.length} contacts`)
      const response = await apiClient.post<{
        message: string
        success: boolean
        totalProcessed: number
        successful: number
        failed: number
        totalTimeSeconds: number
        estimatedTimeSeconds: number
        results: Array<{
          contactId: number
          success: boolean
          summary?: BusinessSummary
          error?: string
        }>
      }>(
        '/summarization/bulk-generate',
        { contactIds },
        300000 // 5 minutes timeout for bulk operations
      )
      console.log(`Bulk summarization API response:`, response)
      return response
    } catch (error) {
      console.error('Error in bulk summarization:', error)
      throw error
    }
  },

  /**
   * Generate business summary for a specific contact
   * Note: This will be implemented when backend API is ready
   */
  async generateSummary(contactId: number, _uploadId: number): Promise<ApiResponse<SummaryGenerationResponse>> {
    // TODO: Replace with actual API call when backend is ready
    // return apiClient.post<SummaryGenerationResponse>('/email-generation/summary', { contactId, uploadId })
    
    // Mock implementation for now
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockSummary: BusinessSummary = {
          id: contactId,
          contactId: contactId,
          scrapedDataId: 1,
          summaryText: `This is a technology company specializing in web development and digital marketing services. They serve small to medium businesses with custom solutions and 24/7 support. The company has 10-50 employees and is based in California.`,
          painPoints: ['Limited online presence', 'Outdated technology stack'],
          strengths: ['Experienced team', 'Strong client relationships'],
          opportunities: ['Digital transformation', 'Market expansion'],
          keywords: ['technology', 'web development', 'digital marketing'],
          // Legacy fields for backward compatibility
          businessName: `Business ${contactId}`,
          industry: 'Technology',
          services: ['Web Development', 'Digital Marketing', 'Consulting'],
          keyFeatures: ['24/7 Support', 'Custom Solutions', 'Fast Delivery'],
          targetAudience: 'Small to Medium Businesses',
          businessSize: '10-50 employees',
          location: 'California, USA',
          website: 'https://example.com',
          contactInfo: {
            email: 'contact@example.com',
            phone: '(555) 123-4567',
            address: '123 Business St, City, State'
          },
          socialMedia: [
            { platform: 'LinkedIn', url: 'https://linkedin.com/company/example' },
            { platform: 'Twitter', url: 'https://twitter.com/example' }
          ],
          summary: `This is a technology company specializing in web development and digital marketing services. They serve small to medium businesses with custom solutions and 24/7 support. The company has 10-50 employees and is based in California.`,
          generatedAt: new Date().toISOString()
        }
        
        resolve({
          success: true,
          data: {
            success: true,
            data: mockSummary,
            message: 'Summary generated successfully'
          }
        })
      }, 2000) // 2 second delay to simulate API call
    })
  },

  /**
   * Generate personalized email based on business summary
   */
  async generateEmailDraft(
    params: {
      contactId: number
      summaryId: number
      clientEmailId: number
      tone?: string // backend expects values like 'pro_friendly'
    }
  ): Promise<ApiResponse<EmailDraft>> {
    try {
      const payload = {
        contactId: params.contactId,
        summaryId: params.summaryId,
        clientEmailId: params.clientEmailId,
        tone: params.tone || 'pro_friendly',
      }
      return await apiClient.post<EmailDraft>('/emails/generation/generate', payload)
    } catch (error) {
      console.error('Error generating email draft:', error)
      throw error
    }
  },

  /**
   * Bulk generate email drafts for multiple contacts
   * POST /emails/bulk-generate
   * Body: GenerateEmailDto[]
   */
  async bulkGenerateEmailDrafts(requests: Array<{
    contactId: number
    summaryId: number
    clientEmailId: number
    tone?: string
  }>): Promise<ApiResponse<{
    totalProcessed: number
    successful: number
    failed: number
    totalTimeSeconds: number
    estimatedTimeSeconds: number
    results: Array<{
      contactId: number
      summaryId: number
      emailDraftId: number
      success: boolean
      error?: string
    }>
  }>> {
    try {
      console.log(`Calling bulk email generation API for ${requests.length} contacts`)
      const response = await apiClient.post<{
        totalProcessed: number
        successful: number
        failed: number
        totalTimeSeconds: number
        estimatedTimeSeconds: number
        results: Array<{
          contactId: number
          summaryId: number
          emailDraftId: number
          success: boolean
          error?: string
        }>
      }>(
        '/emails/generation/bulk-generate',
        requests,
        300000 // 5 minutes timeout for bulk operations
      )
      console.log(`Bulk email generation API response:`, response)
      return response
    } catch (error) {
      console.error('Error in bulk email generation:', error)
      throw error
    }
  },

  /**
   * Get a specific email draft by ID
   * GET /emails/generation/drafts/:id
   */
  async getEmailDraft(draftId: number): Promise<ApiResponse<EmailDraft>> {
    try {
      return await apiClient.get<EmailDraft>(`/emails/generation/drafts/${draftId}`)
    } catch (error) {
      console.error('Error fetching email draft:', error)
      throw error
    }
  },

  /**
   * Get all email drafts for a specific contact
   * GET /emails/generation/contacts/:contactId/drafts
   */
  async getContactEmailDrafts(contactId: number): Promise<ApiResponse<EmailDraft[]>> {
    try {
      return await apiClient.get<EmailDraft[]>(`/emails/generation/contacts/${contactId}/drafts`)
    } catch (error) {
      console.error('Error fetching contact email drafts:', error)
      throw error
    }
  },

  /**
   * Get all email drafts for the current client
   * GET /emails/generation/drafts
   */
  async getAllEmailDrafts(): Promise<ApiResponse<EmailDraft[]>> {
    try {
      interface GetAllEmailDraftsResponse {
        message?: string
        success?: boolean
        count?: number
        data?: EmailDraft[]
      }
      const res = await apiClient.get<GetAllEmailDraftsResponse>(`/emails/drafts`)
      
      console.log(`[Email API] Response for getAllEmailDrafts:`, res)
      
      // Backend returns: { message, success, count, data: [...] }
      if (res.success && res.data) {
        // Check if res.data is already an array (unwrapped by ApiClient)
        if (Array.isArray(res.data)) {
          console.log(`[Email API] Extracted ${res.data.length} drafts (direct array)`)
          return {
            success: true,
            data: res.data as EmailDraft[]
          }
        }
        
        // Otherwise, check if it's wrapped in the response structure
        const data = res.data as GetAllEmailDraftsResponse
        const drafts = data.data && Array.isArray(data.data) ? data.data : []
        console.log(`[Email API] Extracted ${drafts.length} drafts (from wrapped data)`)
        return {
          success: true,
          data: drafts
        } as ApiResponse<EmailDraft[]>
      }
      
      console.log('[Email API] No drafts found')
      return {
        success: false,
        error: 'Failed to fetch email drafts',
        data: []
      }
    } catch (error) {
      console.error('Error fetching all email drafts:', error)
      throw error
    }
  },

  /**
   * Check spam score for an email draft
   * POST /emails/optimization/check
   */
  // async checkSpam(dto: CheckSpamDto): Promise<ApiResponse<SpamCheckResult>> {
  //   try {
  //     const response = await apiClient.post<SpamCheckResult>('/emails/optimization/check', dto)  
  //     // Handle different response structures
  //     if (response.success && response.data) {
  //       let spamResult: SpamCheckResult
        
  //       // Check if data is nested (response.data.data) or direct
  //       type NestedSpamResponse = { data: SpamCheckResult }
  //       const responseData = response.data as SpamCheckResult | NestedSpamResponse
  //       if ('data' in responseData && typeof responseData.data === 'object') {
  //         spamResult = responseData.data as SpamCheckResult
  //         console.log('Found nested data structure, extracting:', spamResult)
  //       } else {
  //         spamResult = responseData as SpamCheckResult
  //       }
        
  //       // Ensure all fields are properly typed and have default values
  //       const parsedResult: SpamCheckResult = {
  //         score: typeof spamResult?.score === 'number' ? spamResult.score : 
  //               typeof spamResult?.score === 'string' ? parseFloat(spamResult.score) || 0 : 0,
  //         keywords: Array.isArray(spamResult?.keywords) ? spamResult.keywords : [],
  //         suggestions: Array.isArray(spamResult?.suggestions) ? spamResult.suggestions : [],
  //         blocked: typeof spamResult?.blocked === 'boolean' ? spamResult.blocked : false
  //       }
        
  //       return {
  //         success: true,
  //         data: parsedResult
  //       }
  //     } else {
  //       console.warn('Response error:', response.error)
  //       console.warn('Response data:', response.data)
        
  //       return {
  //         success: false,
  //         error: response.error || 'Spam check failed or returned no data',
  //         data: {
  //           score: 0,
  //           keywords: [],
  //           suggestions: [],
  //           blocked: false
  //         } as SpamCheckResult
  //       }
  //     }
  //   } catch (error) {
  //     console.error('=== SPAM CHECK API ERROR ===')
  //     console.error('Error checking spam:', error)
  //     console.error('Error details:', error instanceof Error ? {
  //       message: error.message,
  //       stack: error.stack,
  //       name: error.name
  //     } : error)
  //     throw error
  //   }
  // },

  /**
   * Get optimization suggestions for an email
   * POST /emails/optimization/suggest
   */
  async getOptimizationSuggestions(dto: OptimizeDto): Promise<ApiResponse<OptimizationSuggestions>> {
    try {
      
      const response = await apiClient.post<OptimizationSuggestions>('/emails/optimization/suggest', dto)
      
      if (response.success && response.data) {
        let suggestions: OptimizationSuggestions
        
        // Handle nested response structure
        type NestedOptimizationResponse = { data: OptimizationSuggestions }
        const responseData = response.data as OptimizationSuggestions | NestedOptimizationResponse
        if ('data' in responseData && typeof responseData.data === 'object') {
          suggestions = responseData.data as OptimizationSuggestions
        } else {
          suggestions = responseData as OptimizationSuggestions
        }
        
        // Ensure proper typing
        const parsedSuggestions: OptimizationSuggestions = {
          suggestions: Array.isArray(suggestions?.suggestions) ? suggestions.suggestions : [],
          optimizedContent: typeof suggestions?.optimizedContent === 'string' ? suggestions.optimizedContent : undefined
        }
          
        return {
          success: true,
          data: parsedSuggestions
        }
      } else {
        console.warn('Response success:', response.success)
        console.warn('Response error:', response.error)
        
        return {
          success: false,
          error: response.error || 'Failed to get optimization suggestions',
          data: {
            suggestions: []
          }
        }
      }
    } catch (error) {
      console.error('Error getting optimization suggestions:', error)
      throw error
    }
  },
  /**
   * Send an email draft
   * POST /emails/send-draft
   * Body: { draftId: number }
   * 
   * This API:
   * - Validates draft and contact
   * - Checks spam score and auto-optimizes if needed
   * - Generates tracking pixel token and unsubscribe token automatically
   * - Injects tracking pixel and unsubscribe link into email
   * - Sends via SendGrid with native tracking enabled
   * - Creates EmailLog entry with both tokens stored
   * - Updates draft status to 'sent'
   * 
   * Note: Two separate tokens are generated:
   * - trackingPixelToken: For 1x1 pixel tracking (backup method)
   * - unsubscribeToken: For unsubscribe link (separate for security)
   */
  async sendEmailDraft(draftId: number): Promise<ApiResponse<{
    success: boolean
    emailLogId?: number
    messageId?: string
    spamScore?: number
    message?: string
  }>> {
    try {
      return await apiClient.post<{
        success: boolean
        emailLogId?: number
        messageId?: string
        spamScore?: number
        message?: string
      }>(`/emails/send-draft`, { draftId })
    } catch (error) {
      console.error('Error sending email draft:', error)
      throw error
    }
  },

  /**
   * Update an email draft
   * PUT /emails/generation/drafts/:id
   */
  async updateEmailDraft(
    draftId: number,
    updates: {
      subjectLines?: string[]
      subjectLine?: string // For backward compatibility
      bodyText?: string
      icebreaker?: string
      productsRelevant?: string
      clientEmailId?: number
    }
  ): Promise<ApiResponse<EmailDraft>> {
    try {
      return await apiClient.put<EmailDraft>(`/emails/generation/drafts/${draftId}`, updates)
    } catch (error) {
      console.error('Error updating email draft:', error)
      throw error
    }
  },

  /**
   * Get bulk status for multiple contacts (summary, email draft, SMS draft status)
   * POST /emails/generation/bulk-status
   * Body: { contactIds: number[] }
   */
  async getBulkStatus(contactIds: number[]): Promise<ApiResponse<BulkStatusEntry[]>> {
    try {
      const response = await apiClient.post<{
        success: boolean
        data:
          | BulkStatusEntry[]
          | {
              data: BulkStatusEntry[]
              pagination?: BulkStatusPagination
            }
        pagination?: BulkStatusPagination
      }>('/emails/generation/bulk-status', { contactIds })
      
      if (response.success && response.data) {
        const rawData = response.data

        if (Array.isArray(rawData)) {
          return {
            success: true,
            data: rawData.map(entry => ({
              ...entry,
              hasSMSDraft: false,
              smsDraftId: null,
              smsStatus: null,
            })),
          }
        }

        if (rawData && Array.isArray(rawData.data)) {
          return {
            success: true,
            data: rawData.data.map(entry => ({
              ...entry,
              hasSMSDraft: false,
              smsDraftId: null,
              smsStatus: null,
            })),
          }
        }
      }
      
      return {
        success: false,
        error: response.error || 'Failed to get bulk status',
        data: [],
      }
    } catch (error) {
      console.error('Error getting bulk status:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get bulk status',
        data: [],
      }
    }
  },

  /**
   * Get email logs for a specific client email
   * GET /emails/logs/client-email/:clientEmailId
   */
  async getEmailLogsByClientEmailId(clientEmailId: number): Promise<ApiResponse<EmailLog[]>> {
    try {
      const res = await apiClient.get<EmailLogsResponse>(`/emails/logs/client-email/${clientEmailId}`)
      
      if (res.success && res.data) {
        // Check if data is nested (response.data.data) or direct array
        const data = res.data as EmailLogsResponse | EmailLog[]
        if (Array.isArray(data)) {
          // Direct array
          return {
            success: true,
            data: data as EmailLog[]
          }
        } else if (data.data && Array.isArray(data.data)) {
          // Nested structure: response.data.data
          return {
            success: true,
            data: data.data as EmailLog[]
          }
        } else if (data.count !== undefined && data.data && Array.isArray(data.data)) {
          // Response structure: { message, success, count, data }
          return {
            success: true,
            data: data.data as EmailLog[]
          }
        }
      }
      
      return {
        success: false,
        error: 'Failed to fetch email logs',
        data: []
      }
    } catch (error) {
      console.error('Error fetching email logs:', error)
      throw error
    }
  },

  /**
   * Schedule email for later sending
   * POST /emails/schedule
   * Body: { draftId: number, scheduledAt: string (ISO date) }
   */
  async scheduleEmail(
    draftId: number,
    scheduledAt: string
  ): Promise<ApiResponse<{
    id: number
    emailDraftId: number
    scheduledAt: string
    status: 'pending' | 'sent' | 'failed'
    priority: number
  }>> {
    try {
      const response = await apiClient.post<{
        id: number
        emailDraftId: number
        scheduledAt: string
        status: 'pending' | 'sent' | 'failed'
        priority: number
      }>('/emails/schedule', {
        draftId,
        scheduledAt,
      })
      return response
    } catch (error) {
      console.error('Error scheduling email:', error)
      throw error
    }
  },

  /**
   * Get email queue status
   * GET /emails/schedule/queue/status
   */
  async getQueueStatus(): Promise<ApiResponse<{
    pending: number
    sent: number
    failed: number
    nextProcessing: string
  }>> {
    try {
      const response = await apiClient.get<{
        pending: number
        sent: number
        failed: number
        nextProcessing: string
      }>('/emails/schedule/queue/status')
      return response
    } catch (error) {
      console.error('Error fetching queue status:', error)
      throw error
    }
  },

  /**
   * Remove email from queue (cancel scheduled email)
   * DELETE /emails/schedule/queue/:draftId
   */
  async removeFromQueue(draftId: number): Promise<ApiResponse<{ message: string }>> {
    try {
      const response = await apiClient.delete<{ message: string }>(
        `/emails/schedule/queue/${draftId}`
      )
      return response
    } catch (error) {
      console.error('Error removing from queue:', error)
      throw error
    }
  },

  /**
   * Get all queued emails
   * GET /emails/schedule/queue
   */
  async getQueuedEmails(): Promise<ApiResponse<Array<{
    id: number
    emailDraftId: number
    scheduledAt: string
    status: 'pending' | 'sent' | 'failed'
    priority: number
    retryCount: number
    nextRetryAt: string | null
    createdAt: string
    updatedAt: string
    emailDraft?: EmailDraft
  }>>> {
    try {
      const response = await apiClient.get<Array<{
        id: number
        emailDraftId: number
        scheduledAt: string
        status: 'pending' | 'sent' | 'failed'
        priority: number
        retryCount: number
        nextRetryAt: string | null
        createdAt: string
        updatedAt: string
        emailDraft?: EmailDraft
      }>>('/emails/schedule/queue')
      return response
    } catch (error) {
      console.error('Error fetching queued emails:', error)
      throw error
    }
  },
}
