import { apiClient, ApiResponse } from './ApiClient'
import {
  AnalyticsQueryParams,
  EmailAnalyticsOverview,
  EmailAnalyticsTimelinePoint,
  EmailAnalyticsEvent,
} from '@/types/analytics'
import {
  generateCacheKey,
  getCachedData,
  setCachedData,
  type AnalyticsEndpoint,
} from '@/utils/analyticsCache'

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
  async getOverview(
    params?: AnalyticsQueryParams,
    bypassCache = false
  ): Promise<ApiResponse<EmailAnalyticsOverview>> {
    const query = buildQueryString(params)
    const email = params?.fromEmail || ''
    const from = params?.from || ''
    const to = params?.to || ''

    // Check cache first (unless bypassing)
    if (!bypassCache && from && to) {
      const cacheKey = generateCacheKey('overview', email, from, to)
      console.log(`[AnalyticsAPI] Checking cache for overview - key: ${cacheKey}`)
      const cached = getCachedData<EmailAnalyticsOverview>(cacheKey)
      if (cached) {
        console.log('[AnalyticsAPI] ✅ Cache HIT - Returning cached overview data')
        return {
          success: true,
          data: cached,
        }
      }
      console.log('[AnalyticsAPI] ❌ Cache MISS - Fetching overview from API')
    } else if (bypassCache) {
      console.log('[AnalyticsAPI] ⏭️ Bypassing cache - Fetching overview from API')
    } else {
      console.log('[AnalyticsAPI] ⚠️ Missing date params - Fetching overview from API (from:', from, 'to:', to, ')')
    }

    // Fetch from API
    const startTime = performance.now()
    const response = await apiClient.get<EmailAnalyticsOverview>(`/emails/analytics/overview${query}`)
    const fetchTime = Math.round(performance.now() - startTime)
    console.log(`[AnalyticsAPI] API call completed in ${fetchTime}ms`)
    
    // Cache successful responses
    if (response.success && response.data && from && to) {
      const cacheKey = generateCacheKey('overview', email, from, to)
      setCachedData(cacheKey, response.data)
      console.log('[AnalyticsAPI] ✅ Cached overview data')
    } else {
      console.log('[AnalyticsAPI] ⚠️ Not caching overview - success:', response.success, 'hasData:', !!response.data, 'hasDates:', !!(from && to))
    }

    return response
  },

  async getTimeline(
    params?: AnalyticsQueryParams,
    bypassCache = false
  ): Promise<ApiResponse<EmailAnalyticsTimelinePoint[]>> {
    const query = buildQueryString(params)
    const email = params?.fromEmail || ''
    const from = params?.from || ''
    const to = params?.to || ''

    // Check cache first (unless bypassing)
    if (!bypassCache && from && to) {
      const cacheKey = generateCacheKey('timeline', email, from, to)
      console.log(`[AnalyticsAPI] Checking cache for timeline - key: ${cacheKey}`)
      const cached = getCachedData<EmailAnalyticsTimelinePoint[]>(cacheKey)
      if (cached) {
        console.log('[AnalyticsAPI] ✅ Cache HIT - Returning cached timeline data')
        return {
          success: true,
          data: cached,
        }
      }
      console.log('[AnalyticsAPI] ❌ Cache MISS - Fetching timeline from API')
    } else if (bypassCache) {
      console.log('[AnalyticsAPI] ⏭️ Bypassing cache - Fetching timeline from API')
    }

    // Fetch from API
    const startTime = performance.now()
    const response = await apiClient.get<EmailAnalyticsTimelinePoint[]>(`/emails/analytics/timeline${query}`)
    const fetchTime = Math.round(performance.now() - startTime)
    console.log(`[AnalyticsAPI] Timeline API call completed in ${fetchTime}ms`)
    
    // Cache successful responses
    if (response.success && response.data && from && to) {
      const cacheKey = generateCacheKey('timeline', email, from, to)
      setCachedData(cacheKey, response.data)
      console.log('[AnalyticsAPI] ✅ Cached timeline data')
    }

    return response
  },

  async getRecentEvents(
    params?: AnalyticsQueryParams,
    bypassCache = false
  ): Promise<ApiResponse<EmailAnalyticsEvent[]>> {
    const query = buildQueryString(params)
    const email = params?.fromEmail || ''
    const from = params?.from || ''
    const to = params?.to || ''

    // Check cache first (unless bypassing)
    if (!bypassCache && from && to) {
      const cacheKey = generateCacheKey('events', email, from, to)
      console.log(`[AnalyticsAPI] Checking cache for events - key: ${cacheKey}`)
      const cached = getCachedData<EmailAnalyticsEvent[]>(cacheKey)
      if (cached) {
        console.log('[AnalyticsAPI] ✅ Cache HIT - Returning cached events data')
        return {
          success: true,
          data: cached,
        }
      }
      console.log('[AnalyticsAPI] ❌ Cache MISS - Fetching events from API')
    } else if (bypassCache) {
      console.log('[AnalyticsAPI] ⏭️ Bypassing cache - Fetching events from API')
    }

    // Fetch from API
    const startTime = performance.now()
    const response = await apiClient.get<EmailAnalyticsEvent[]>(`/emails/analytics/events${query}`)
    const fetchTime = Math.round(performance.now() - startTime)
    console.log(`[AnalyticsAPI] Events API call completed in ${fetchTime}ms`)
    
    // Cache successful responses
    if (response.success && response.data && from && to) {
      const cacheKey = generateCacheKey('events', email, from, to)
      setCachedData(cacheKey, response.data)
      console.log('[AnalyticsAPI] ✅ Cached events data')
    }

    return response
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


