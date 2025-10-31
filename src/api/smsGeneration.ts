import { apiClient, ApiResponse } from './ApiClient'
import { SMSDraft, SMSGenerationResponse } from '@/types/smsGeneration'

export const smsGenerationApi = {
  /**
   * Generate SMS draft based on business summary
   * POST /sms/generate/:contactId/:summaryId
   */
  async generateSmsDraft(contactId: number, summaryId: number): Promise<ApiResponse<SMSDraft>> {
    try {
      console.log(`Calling SMS API: /sms/generate/${contactId}/${summaryId} (120s timeout)`)
      const response = await apiClient.post<SMSGenerationResponse>(
        `/sms/generate/${contactId}/${summaryId}`,
        undefined,
        120000 // 120 seconds (2 minutes) for AI processing
      )
      console.log(`SMS generation API response:`, response)
      
      // Backend returns: { success: true, message, data: { success, smsDraft, message, characterCount } }
      // We need to extract the smsDraft from the nested data
      if (response.success && response.data) {
        const data = response.data as SMSGenerationResponse
        if (data.smsDraft) {
          return {
            success: true,
            data: data.smsDraft
          } as ApiResponse<SMSDraft>
        }
      }
      
      return {
        success: false,
        error: 'Failed to generate SMS draft - no draft returned'
      }
    } catch (error) {
      console.error('Error generating SMS draft:', error)
      throw error
    }
  },

  /**
   * Get a specific SMS draft by ID
   * GET /sms/draft/:smsDraftId
   */
  async getSmsDraft(draftId: number): Promise<ApiResponse<SMSDraft>> {
    try {
      return await apiClient.get<SMSDraft>(`/sms/draft/${draftId}`)
    } catch (error) {
      console.error('Error fetching SMS draft:', error)
      throw error
    }
  },

  /**
   * Get all SMS drafts for a specific contact
   * GET /sms/drafts/:contactId
   */
  async getContactSmsDrafts(contactId: number): Promise<ApiResponse<SMSDraft[]>> {
    try {
      interface SMSDraftsResponse {
        data?: SMSDraft[]
        message?: string
        success?: boolean
        count?: number
      }
      const res = await apiClient.get<SMSDraftsResponse>(`/sms/drafts/${contactId}`)
      
      console.log(`[SMS API] Response for contactId ${contactId}:`, res)
      
      // Backend returns: { message, success, count, data: [...] }
      // ApiClient automatically unwraps it: if backend has { success, data }, 
      // it extracts data.data or returns data directly
      // So res.data here is either the array of drafts directly OR the wrapped response
      
      if (res.success && res.data) {
        // Check if res.data is already an array (unwrapped by ApiClient)
        if (Array.isArray(res.data)) {
          console.log(`[SMS API] Extracted ${res.data.length} drafts (direct array)`)
          return {
            success: true,
            data: res.data as SMSDraft[]
          }
        }
        
        // Otherwise, check if it's wrapped in another data property
        const data = res.data as SMSDraftsResponse
        const drafts = data.data && Array.isArray(data.data) ? data.data : []
        console.log(`[SMS API] Extracted ${drafts.length} drafts (from wrapped data)`)
        return {
          success: true,
          data: drafts
        } as ApiResponse<SMSDraft[]>
      }
      
      console.log('[SMS API] No drafts found')
      return {
        success: false,
        error: 'Failed to fetch SMS drafts'
      }
    } catch (error) {
      console.error('Error fetching contact SMS drafts:', error)
      throw error
    }
  },

  /**
   * Send an SMS draft
   * POST /sms/send-draft/:smsDraftId
   */
  async sendSmsDraft(draftId: number, to?: string): Promise<ApiResponse<{ success: boolean; message?: string }>> {
    try {
      const body = to ? { to } : undefined
      return await apiClient.post<{ success: boolean; message?: string }>(`/sms/send-draft/${draftId}`, body)
    } catch (error) {
      console.error('Error sending SMS draft:', error)
      throw error
    }
  },

  /**
   * Update an SMS draft
   * PATCH /sms/draft/:smsDraftId
   */
  async updateSmsDraft(draftId: number, updates: { messageText?: string }): Promise<ApiResponse<SMSDraft>> {
    try {
      return await apiClient.patch<SMSDraft>(`/sms/draft/${draftId}`, updates)
    } catch (error) {
      console.error('Error updating SMS draft:', error)
      throw error
    }
  }
}

