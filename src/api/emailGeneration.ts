import { apiClient, ApiResponse } from './ApiClient'
import {
  BusinessSummary,
  GeneratedEmail,
  SummaryGenerationResponse,
  EmailGenerationResponse,
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
   * Note: This will be implemented when backend API is ready
   */
  async generateEmail(
    contactId: number, 
    summaryData: BusinessSummary, 
    _emailType: 'sales' | 'outreach' | 'follow-up' = 'sales',
    tone: 'professional' | 'friendly' | 'persuasive' = 'professional'
  ): Promise<ApiResponse<EmailGenerationResponse>> {
    // TODO: Replace with actual API call when backend is ready
    // return apiClient.post<EmailGenerationResponse>('/email-generation/email', { 
    //   contactId, 
    //   summaryData, 
    //   emailType, 
    //   tone 
    // })
    
    // Mock implementation for now
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockEmail: GeneratedEmail = {
          subject: `Partnership Opportunity with ${summaryData.businessName || 'Your Company'}`,
          body: `Dear ${summaryData.businessName || 'Team'},

I hope this email finds you well. I came across your company and was impressed by your focus on ${summaryData.services?.join(', ').toLowerCase() || 'your services'}.

As a fellow business in the ${summaryData.industry || 'your industry'} industry, I believe there's a great opportunity for us to collaborate and help each other grow. Your expertise in ${summaryData.keyFeatures?.join(', ').toLowerCase() || 'your key features'} aligns perfectly with what we're looking for in a strategic partner.

I would love to schedule a brief call to discuss how we can work together to serve your ${summaryData.targetAudience?.toLowerCase() || 'target audience'} more effectively. Would you be available for a 15-minute conversation this week?

Looking forward to hearing from you.

Best regards,
[Your Name]`,
          personalization: {
            businessName: summaryData.businessName || 'Your Company',
            industry: summaryData.industry || 'Your Industry',
            keyFeatures: summaryData.keyFeatures || []
          },
          tone,
          callToAction: 'Schedule a 15-minute call',
          generatedAt: new Date().toISOString()
        }
        
        resolve({
          success: true,
          data: {
            success: true,
            data: mockEmail,
            message: 'Email generated successfully'
          }
        })
      }, 3000) // 3 second delay to simulate API call
    })
  }
}
