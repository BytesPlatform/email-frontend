import { apiClient, ApiResponse } from './ApiClient'
import {
  BusinessSummary,
  GeneratedEmail,
  SummaryGenerationRequest,
  EmailGenerationRequest,
  SummaryGenerationResponse,
  EmailGenerationResponse,
} from '@/types/emailGeneration'

export const emailGenerationApi = {
  /**
   * Generate business summary for a specific contact
   * Note: This will be implemented when backend API is ready
   */
  async generateSummary(contactId: number, uploadId: number): Promise<ApiResponse<SummaryGenerationResponse>> {
    // TODO: Replace with actual API call when backend is ready
    // return apiClient.post<SummaryGenerationResponse>('/email-generation/summary', { contactId, uploadId })
    
    // Mock implementation for now
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockSummary: BusinessSummary = {
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
    emailType: 'sales' | 'outreach' | 'follow-up' = 'sales',
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
          subject: `Partnership Opportunity with ${summaryData.businessName}`,
          body: `Dear ${summaryData.businessName} Team,

I hope this email finds you well. I came across your company and was impressed by your focus on ${summaryData.services.join(', ').toLowerCase()}.

As a fellow business in the ${summaryData.industry} industry, I believe there's a great opportunity for us to collaborate and help each other grow. Your expertise in ${summaryData.keyFeatures.join(', ').toLowerCase()} aligns perfectly with what we're looking for in a strategic partner.

I would love to schedule a brief call to discuss how we can work together to serve your ${summaryData.targetAudience.toLowerCase()} more effectively. Would you be available for a 15-minute conversation this week?

Looking forward to hearing from you.

Best regards,
[Your Name]`,
          personalization: {
            businessName: summaryData.businessName,
            industry: summaryData.industry,
            keyFeatures: summaryData.keyFeatures
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
