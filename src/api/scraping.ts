import { apiClient, ApiResponse } from './ApiClient'
import {
  ReadyContactsResponse,
  ScrapeSingleResponse,
  BatchScrapeResponse,
  StatsResponse,
  BatchDiscoveryResponse,
} from '@/types/scraping'

export const scrapingApi = {
  async discoverWebsite(contactId: number): Promise<ApiResponse<{
    discoveredWebsite: string
    confidence: 'high' | 'medium' | 'low'
    method: 'business_search'
    businessName: string
    searchQuery: string
  }>> {
    return apiClient.post(`/scraping/discover-website/${contactId}`)
  },

  async discoverBatchWebsites(uploadId: number, limit?: number): Promise<ApiResponse<BatchDiscoveryResponse>> {
    const body = limit ? { uploadId, limit } : { uploadId }
    return apiClient.post<BatchDiscoveryResponse>(`/scraping/discover-batch`, body)
  },

  async scrapeSingle(contactId: number, confirmedWebsite?: string): Promise<ApiResponse<ScrapeSingleResponse>> {
    const body = confirmedWebsite ? { confirmedWebsite } : undefined
    return apiClient.post<ScrapeSingleResponse>(`/scraping/scrape/${contactId}`, body)
  },

  async scrapeBatch(uploadId: number, limit: number = 20, confirmedWebsites?: { [contactId: number]: string }): Promise<ApiResponse<BatchScrapeResponse>> {
    const body: { uploadId: number; limit: number; confirmedWebsites?: { [contactId: number]: string } } = { uploadId, limit }
    if (confirmedWebsites) {
      body.confirmedWebsites = confirmedWebsites
    }
    return apiClient.post<BatchScrapeResponse>(`/scraping/batch`, body)
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
