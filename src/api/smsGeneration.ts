import { apiClient, ApiResponse } from './ApiClient'
import { SMSDraft, SMSGenerationResult, SmsBulkStatusEntry } from '@/types/smsGeneration'

export const smsGenerationApi = {
  /**
   * Generate SMS draft based on business summary
   * POST /sms/generation/generate
   * @param contactId - The contact ID
   * @param summaryId - The summary ID
   * @param clientSmsId - The client SMS template ID (required)
   */
  async generateSmsDraft(contactId: number, summaryId: number, clientSmsId: number): Promise<ApiResponse<SMSDraft>> {
    try {
      const requestBody = {
        contactId,
        summaryId,
        clientSmsId,
      }
      
      console.log(`Calling SMS API: /sms/generation/generate with`, requestBody, '(120s timeout)')
      const response = await apiClient.post<SMSGenerationResult>(
        '/sms/generation/generate',
        requestBody,
        120000 // 120 seconds (2 minutes) for AI processing
      )
      console.log(`SMS generation API response:`, response)
      
      // Backend returns: { success: true, data: { contactId, summaryId, smsDraftId, success, error? } }
      // ApiClient unwraps it: response.data = { contactId, summaryId, smsDraftId, success, error? }
      if (response.success && response.data) {
        const result = response.data as SMSGenerationResult
        
        if (result.success && result.smsDraftId > 0) {
          // Fetch the full draft object using the draft ID
          const draftResponse = await this.getSmsDraft(result.smsDraftId)
          
          if (draftResponse.success && draftResponse.data) {
            console.log(`✅ SMS draft generated successfully with ID: ${result.smsDraftId}`)
            return draftResponse
          } else {
            // If we can't fetch the draft, return a minimal response with the ID
            return {
              success: true,
              data: {
                id: result.smsDraftId,
                contactId: result.contactId,
                summaryId: result.summaryId,
                status: 'draft',
              } as SMSDraft
            }
          }
        } else {
          // Generation failed
          return {
            success: false,
            error: result.error || 'Failed to generate SMS draft'
          }
        }
      }
      
      return {
        success: false,
        error: response.error || 'Failed to generate SMS draft - no response data'
      }
    } catch (error) {
      console.error('Error generating SMS draft:', error)
      throw error
    }
  },

  /**
   * Get a specific SMS draft by ID
   * GET /sms/generation/drafts/:id
   */
  async getSmsDraft(draftId: number): Promise<ApiResponse<SMSDraft>> {
    try {
      return await apiClient.get<SMSDraft>(`/sms/generation/drafts/${draftId}`)
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
   * POST /sms/send-draft
   * Body: { draftId: number }
   */
  async sendSmsDraft(draftId: number): Promise<ApiResponse<{ success: boolean; smsLogId: number; messageSid: string; message: string }>> {
    try {
      const response = await apiClient.post<{ success: boolean; smsLogId: number; messageSid: string; message: string }>(
        '/sms/send-draft',
        { draftId }
      )
      
      // Backend returns: { message: 'SMS send initiated', success: true, data: { success, smsLogId, messageSid, message } }
      if (response.success && response.data) {
        // Check if data is nested (response.data.data) or direct
        type SendResponse = { success: boolean; smsLogId: number; messageSid: string; message: string }
        type NestedResponse = { data: SendResponse }
        const data = response.data as SendResponse | NestedResponse
        if ('data' in data && typeof data.data === 'object' && 'smsLogId' in data.data) {
          // Nested structure: response.data.data
          return {
            success: true,
            data: data.data
          }
        } else if ('smsLogId' in data) {
          // Direct structure: response.data
          return {
            success: true,
            data: data as SendResponse
          }
        }
      }
      
      return response
    } catch (error) {
      console.error('Error sending SMS draft:', error)
      throw error
    }
  },

  /**
   * Update an SMS draft
   * PUT /sms/generation/drafts/:id
   */
  async updateSmsDraft(draftId: number, updates: { messageText?: string }): Promise<ApiResponse<SMSDraft>> {
    try {
      return await apiClient.put<SMSDraft>(`/sms/generation/drafts/${draftId}`, updates)
    } catch (error) {
      console.error('Error updating SMS draft:', error)
      throw error
    }
  },

  /**
   * Get all SMS drafts for a specific client SMS
   * GET /sms/client-sms/:clientSmsId/drafts
   */
  async getClientSmsDrafts(clientSmsId: number): Promise<ApiResponse<SMSDraft[]>> {
    try {
      const res = await apiClient.get<SMSDraft[]>(`/sms/generation/client-sms/${clientSmsId}/drafts`)
      
      console.log(`[SMS API] Response for getClientSmsDrafts (clientSmsId: ${clientSmsId}):`, res)
      
      if (res.success && res.data) {
        // Check if res.data is already an array (unwrapped by ApiClient)
        if (Array.isArray(res.data)) {
          console.log(`[SMS API] Extracted ${res.data.length} drafts (direct array)`)
          return {
            success: true,
            data: res.data as SMSDraft[]
          }
        }
        
        // Otherwise, return empty array
        return {
          success: true,
          data: []
        } as ApiResponse<SMSDraft[]>
      }
      
      console.log('[SMS API] No drafts found')
      return {
        success: false,
        error: 'Failed to fetch SMS drafts',
        data: []
      }
    } catch (error) {
      console.error('Error fetching client SMS drafts:', error)
      throw error
    }
  },

  /**
   * Get bulk SMS status for contacts
   * POST /sms/generation/bulk-status
   */
  async getBulkStatus(contactIds: number[]): Promise<ApiResponse<SmsBulkStatusEntry[]>> {
    try {
      const response = await apiClient.post<SmsBulkStatusEntry[]>('/sms/bulk-status', { contactIds })

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data ?? [],
        }
      }

      return {
        success: false,
        error: response.error || 'Failed to get SMS bulk status',
        data: [],
      }
    } catch (error) {
      console.error('Error getting SMS bulk status:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get SMS bulk status',
        data: [],
      }
    }
  }
}

