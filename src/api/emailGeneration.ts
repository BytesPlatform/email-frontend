import { apiClient, ApiResponse } from './ApiClient'
import {
  BusinessSummary,
  GeneratedEmail,
  SummaryGenerationResponse,
  EmailGenerationResponse,
  EmailDraft,
} from '@/types/emailGeneration'

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
  }
}
