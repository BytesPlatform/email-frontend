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
}


