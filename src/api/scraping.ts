import { apiClient, ApiResponse } from './ApiClient'
import {
  ReadyContactsResponse,
  ScrapeSingleResponse,
  BatchScrapeResponse,
  StatsResponse,
} from '@/types/scraping'

export const scrapingApi = {
  async scrapeSingle(contactId: number): Promise<ApiResponse<ScrapeSingleResponse>> {
    return apiClient.post<ScrapeSingleResponse>(`/scraping/scrape/${contactId}`)
  },

  async scrapeBatch(uploadId: number, limit: number = 20): Promise<ApiResponse<BatchScrapeResponse>> {
    return apiClient.post<BatchScrapeResponse>(`/scraping/batch`, { uploadId, limit })
  },

  async getStats(uploadId: number): Promise<ApiResponse<StatsResponse>> {
    return apiClient.get<StatsResponse>(`/scraping/stats/${uploadId}`)
  },

  async getReadyContacts(uploadId: number, limit?: number): Promise<ApiResponse<ReadyContactsResponse>> {
    const query = typeof limit === 'number' ? `?limit=${limit}` : ''
    return apiClient.get<ReadyContactsResponse>(`/scraping/ready/${uploadId}${query}`)
  },

  async getAllContacts(uploadId: number, limit?: number): Promise<ApiResponse<ReadyContactsResponse>> {
    const query = typeof limit === 'number' ? `?limit=${limit}` : ''
    return apiClient.get<ReadyContactsResponse>(`/scraping/all/${uploadId}${query}`)
  },

  async resetContact(contactId: number): Promise<ApiResponse<{ message: string; contactId: number; status: string }>> {
    return apiClient.post<{ message: string; contactId: number; status: string }>(`/scraping/reset/${contactId}`)
  }
}
