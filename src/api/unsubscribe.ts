import { apiClient, ApiResponse } from './ApiClient'
import { UnsubscribeResponse, UnsubscribeHistory, UnsubscribeDto, UnsubscribeListItem } from '@/types/unsubscribe'

export const unsubscribeApi = {
  /**
   * Get all unsubscribe records
   * GET /emails/unsubscribe/all
   */
  async getAllUnsubscribes(): Promise<ApiResponse<UnsubscribeListItem[]>> {
    try {
      const response = await apiClient.get<UnsubscribeListItem[]>(`/emails/unsubscribe/all`)
      return response
    } catch (error) {
      console.error('Error fetching unsubscribe list:', error)
      throw error
    }
  },

  /**
   * Get unsubscribe history for a contact by token
   * This can be used to check unsubscribe status programmatically
   * GET /emails/unsubscribe/history/:token
   */
  async getUnsubscribeHistory(token: string): Promise<ApiResponse<UnsubscribeHistory>> {
    try {
      const response = await apiClient.get<UnsubscribeHistory>(`/emails/unsubscribe/history/${token}`)
      return response
    } catch (error) {
      console.error('Error getting unsubscribe history:', error)
      throw error
    }
  },

  /**
   * Process unsubscribe request
   * Note: Backend returns HTML confirmation page, but this method can be used for programmatic unsubscribe
   * POST /emails/unsubscribe/:token
   */
  async processUnsubscribe(token: string, reason?: string): Promise<ApiResponse<UnsubscribeResponse>> {
    try {
      const body: UnsubscribeDto = reason ? { reason } : {}
      // Note: Backend may return HTML. For JSON response, backend should be updated to accept Accept: application/json header
      const response = await apiClient.post<UnsubscribeResponse>(`/emails/unsubscribe/${token}`, body)
      return response
    } catch (error) {
      console.error('Error processing unsubscribe:', error)
      throw error
    }
  },

  /**
   * Resubscribe a contact
   * Note: Backend returns HTML confirmation page, but this method can be used for programmatic resubscribe
   * POST /emails/unsubscribe/resubscribe/:token
   */
  async resubscribe(token: string): Promise<ApiResponse<UnsubscribeResponse>> {
    try {
      // Note: Backend may return HTML. For JSON response, backend should be updated to accept Accept: application/json header
      const response = await apiClient.post<UnsubscribeResponse>(`/emails/unsubscribe/resubscribe/${token}`, {})
      return response
    } catch (error) {
      console.error('Error resubscribing:', error)
      throw error
    }
  },

  /**
   * Resubscribe contact by contactId (dashboard/admin action)
   * POST /emails/unsubscribe/admin/resubscribe/:contactId
   */
  async resubscribeByContact(contactId: number): Promise<ApiResponse<UnsubscribeResponse>> {
    try {
      const response = await apiClient.post<UnsubscribeResponse>(
        `/emails/unsubscribe/admin/resubscribe/${contactId}`,
        {}
      )
      return response
    } catch (error) {
      console.error('Error resubscribing contact:', error)
      throw error
    }
  },

  /**
   * Get unsubscribe page URL (for redirecting users to the backend HTML page)
   * GET /emails/unsubscribe/:token returns HTML page
   */
  getUnsubscribePageUrl(token: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    return `${baseUrl}/emails/unsubscribe/${token}`
  },

  /**
   * Get unsubscribe history page URL (for redirecting users to the backend HTML page)
   * GET /emails/unsubscribe/history/:token
   */
  getUnsubscribeHistoryPageUrl(token: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    return `${baseUrl}/emails/unsubscribe/history/${token}`
  },
}

