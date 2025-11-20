import { apiClient, ApiResponse } from './ApiClient'
import {
  AnalyticsQueryParams,
  EmailAnalyticsOverview,
  EmailAnalyticsTimelinePoint,
  EmailAnalyticsEvent,
} from '@/types/analytics'

const buildQueryString = (params?: AnalyticsQueryParams) => {
  if (!params) return ''
  const search = new URLSearchParams()

  if (params.from) {
    search.set('from', params.from)
  }

  if (params.to) {
    search.set('to', params.to)
  }

  if (params.fromEmail) {
    search.set('fromEmail', params.fromEmail)
  }

  return search.toString() ? `?${search.toString()}` : ''
}

export const sendgridAnalyticsApi = {
  async getOverview(params?: AnalyticsQueryParams): Promise<ApiResponse<EmailAnalyticsOverview>> {
    const query = buildQueryString(params)
    return apiClient.get<EmailAnalyticsOverview>(`/emails/analytics/overview${query}`)
  },

  async getTimeline(
    params?: AnalyticsQueryParams,
  ): Promise<ApiResponse<EmailAnalyticsTimelinePoint[]>> {
    const query = buildQueryString(params)
    return apiClient.get<EmailAnalyticsTimelinePoint[]>(`/emails/analytics/timeline${query}`)
  },

  async getRecentEvents(
    params?: AnalyticsQueryParams,
  ): Promise<ApiResponse<EmailAnalyticsEvent[]>> {
    const query = buildQueryString(params)
    return apiClient.get<EmailAnalyticsEvent[]>(`/emails/analytics/events${query}`)
  },

  async getSenders(): Promise<ApiResponse<string[]>> {
    try {
      const response = await apiClient.get<{ success: true; data: string[] }>('/emails/analytics/senders')
      if (response.success && response.data) {
        // Handle nested response structure
        if ('data' in response.data && Array.isArray(response.data.data)) {
          return {
            success: true,
            data: response.data.data
          }
        }
        // Handle direct array response
        if (Array.isArray(response.data)) {
          return {
            success: true,
            data: response.data
          }
        }
      }
      return {
        success: false,
        error: 'Failed to fetch senders',
        data: []
      }
    } catch (error) {
      console.error('Error fetching senders:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch senders',
        data: []
      }
    }
  },
}

export interface DashboardStats {
  csvUploads: {
    value: string
    change: string
  }
  scrapingJobs: {
    value: string
    change: string
  }
  totalRecords: {
    value: string
    change: string
  }
  successRate: {
    value: string
    change: string
  }
}

export const dashboardApi = {
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    try {
      const response = await apiClient.get<{ stats: DashboardStats }>('/analytics/dashboard/stats')
      // The API returns { stats: DashboardStats }, but we want to return DashboardStats directly
      if (response.success && response.data && 'stats' in response.data) {
        return {
          success: true,
          data: response.data.stats
        }
      }
      return {
        success: false,
        error: 'Invalid response format from dashboard stats API'
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch dashboard stats'
      }
    }
  },
}


