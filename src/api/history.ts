import { apiClient, ApiResponse } from './ApiClient'
import {
  ClientScrapingHistoryResponse,
  UploadScrapingHistoryResponse,
  ContactScrapingHistoryResponse,
  ScrapingAnalytics,
  ClientHistoryFilters,
} from '@/types/history'

export const historyApi = {
  /**
   * Get scraping history for a specific client
   * GET /scraping/history/client/:clientId
   */
  async getClientScrapingHistory(
    clientId: number,
    filters?: ClientHistoryFilters
  ): Promise<ApiResponse<ClientScrapingHistoryResponse>> {
    const queryParams = new URLSearchParams()
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value))
        }
      })
    }
    
    const query = queryParams.toString()
    const url = `/scraping/history/client/${clientId}${query ? `?${query}` : ''}`
    
    // Increase timeout for potentially heavier history queries
    return apiClient.getWithTimeout<ClientScrapingHistoryResponse>(url, 60000)
  },

  /**
   * Get scraping history for a specific upload
   * GET /scraping/history/upload/:uploadId
   */
  async getUploadScrapingHistory(
    uploadId: number
  ): Promise<ApiResponse<UploadScrapingHistoryResponse>> {
    return apiClient.get<UploadScrapingHistoryResponse>(`/scraping/history/upload/${uploadId}`)
  },

  /**
   * Get scraping history for a specific contact
   * GET /scraping/history/contact/:contactId
   */
  async getContactScrapingHistory(
    contactId: number
  ): Promise<ApiResponse<ContactScrapingHistoryResponse>> {
    return apiClient.get<ContactScrapingHistoryResponse>(`/scraping/history/contact/${contactId}`)
  },

  /**
   * Get scraping analytics for a specific client
   * GET /scraping/analytics/:clientId
   */
  async getScrapingAnalytics(
    clientId: number
  ): Promise<ApiResponse<ScrapingAnalytics>> {
    return apiClient.get<ScrapingAnalytics>(`scraping/history/analytics/${clientId}`)
  },
}

