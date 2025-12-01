/**
 * Analytics Cache Utility
 * 
 * Provides browser-side caching for analytics data using localStorage.
 * Cache keys are based on: email address + time range + endpoint type
 * Cache entries expire after a configurable TTL (default: 5 minutes)
 */

export interface CachedAnalyticsData<T> {
  data: T
  timestamp: number
  cacheKey: string
}

export type AnalyticsEndpoint = 'overview' | 'timeline' | 'events'

const CACHE_PREFIX = 'analytics_cache:'
const DEFAULT_TTL_MS = 30 * 60 * 1000 // 30 minutes (increased from 5 minutes for better caching)

/**
 * Generate a cache key from client ID, email, time range, and endpoint
 * Client ID is included to ensure cache is user-specific
 */
export function generateCacheKey(
  endpoint: AnalyticsEndpoint,
  email: string,
  from: string,
  to: string,
  clientId?: number
): string {
  // Normalize email (empty string for "all emails")
  const normalizedEmail = email || 'all'
  
  // Normalize client ID (required for user-specific caching)
  const normalizedClientId = clientId ? `client_${clientId}` : 'no_client'
  
  // Normalize dates - extract just the date part (YYYY-MM-DD) for consistency
  // This ensures cache keys match even if dates are generated at slightly different times
  // For analytics, we care about the date range, not the exact timestamp
  const normalizeDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      // Extract just the date part (YYYY-MM-DD) - this makes cache keys consistent
      // regardless of the exact time the date was generated
      const year = date.getUTCFullYear()
      const month = String(date.getUTCMonth() + 1).padStart(2, '0')
      const day = String(date.getUTCDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    } catch {
      // Fallback: try to extract date part from ISO string
      return dateStr.split('T')[0] || dateStr
    }
  }
  
  const normalizedFrom = normalizeDate(from)
  const normalizedTo = normalizeDate(to)
  const cacheKey = `${CACHE_PREFIX}${endpoint}:${normalizedClientId}:${normalizedEmail}:${normalizedFrom}:${normalizedTo}`
  console.log(`[AnalyticsCache] Generated cache key: ${cacheKey} from dates: ${from} -> ${to}, clientId: ${clientId}`)
  return cacheKey
}

/**
 * Get cached data if it exists and is still valid
 */
export function getCachedData<T>(
  cacheKey: string,
  ttlMs: number = DEFAULT_TTL_MS
): T | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const cached = localStorage.getItem(cacheKey)
    if (!cached) {
      console.log(`[AnalyticsCache] Cache miss - no entry for key: ${cacheKey}`)
      return null
    }

    const parsed: CachedAnalyticsData<T> = JSON.parse(cached)
    const now = Date.now()
    const age = now - parsed.timestamp
    const ageSeconds = Math.floor(age / 1000)
    const ttlSeconds = Math.floor(ttlMs / 1000)

    // Check if cache is still valid
    if (age > ttlMs) {
      // Cache expired, remove it
      console.log(`[AnalyticsCache] Cache expired - age: ${ageSeconds}s, TTL: ${ttlSeconds}s, key: ${cacheKey}`)
      localStorage.removeItem(cacheKey)
      return null
    }

    console.log(`[AnalyticsCache] Cache hit! Age: ${ageSeconds}s, key: ${cacheKey}`)
    return parsed.data
  } catch (error) {
    console.error('[AnalyticsCache] Error reading cache:', error, 'key:', cacheKey)
    // If cache is corrupted, remove it
    try {
      localStorage.removeItem(cacheKey)
    } catch {
      // Ignore removal errors
    }
    return null
  }
}

/**
 * Store data in cache
 */
export function setCachedData<T>(
  cacheKey: string,
  data: T
): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const cached: CachedAnalyticsData<T> = {
      data,
      timestamp: Date.now(),
      cacheKey,
    }
    const dataSize = JSON.stringify(cached).length
    localStorage.setItem(cacheKey, JSON.stringify(cached))
    console.log(`[AnalyticsCache] Cached data - key: ${cacheKey}, size: ${dataSize} bytes`)
  } catch (error) {
    console.error('[AnalyticsCache] Error writing cache:', error, 'key:', cacheKey)
    // If storage is full, try to clear old entries
    try {
      clearExpiredCache()
      // Retry once
      const cached: CachedAnalyticsData<T> = {
        data,
        timestamp: Date.now(),
        cacheKey,
      }
      localStorage.setItem(cacheKey, JSON.stringify(cached))
      console.log(`[AnalyticsCache] Successfully cached after cleanup - key: ${cacheKey}`)
    } catch (retryError) {
      console.error('[AnalyticsCache] Failed to write cache after cleanup:', retryError, 'key:', cacheKey)
    }
  }
}

/**
 * Clear expired cache entries
 */
export function clearExpiredCache(ttlMs: number = DEFAULT_TTL_MS): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const now = Date.now()
    const keysToRemove: string[] = []

    // Iterate through all localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key)
          if (cached) {
            const parsed: CachedAnalyticsData<unknown> = JSON.parse(cached)
            const age = now - parsed.timestamp
            if (age > ttlMs) {
              keysToRemove.push(key)
            }
          }
        } catch {
          // If parsing fails, mark for removal
          keysToRemove.push(key)
        }
      }
    }

    // Remove expired entries
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key)
      } catch {
        // Ignore removal errors
      }
    })

    if (keysToRemove.length > 0) {
      console.log(`[AnalyticsCache] Cleared ${keysToRemove.length} expired cache entries`)
    }
  } catch (error) {
    console.error('[AnalyticsCache] Error clearing expired cache:', error)
  }
}

/**
 * Clear all analytics cache entries
 */
export function clearAllAnalyticsCache(): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const keysToRemove: string[] = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key)
      }
    }

    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key)
      } catch {
        // Ignore removal errors
      }
    })

    console.log(`[AnalyticsCache] Cleared all analytics cache (${keysToRemove.length} entries)`)
  } catch (error) {
    console.error('[AnalyticsCache] Error clearing all cache:', error)
  }
}

/**
 * Clear cache for a specific email and time range
 */
export function clearCacheForEmail(
  email: string,
  from: string,
  to: string,
  clientId?: number
): void {
  if (typeof window === 'undefined') {
    return
  }

  const endpoints: AnalyticsEndpoint[] = ['overview', 'timeline', 'events']
  const normalizedEmail = email || 'all'

  endpoints.forEach(endpoint => {
    const cacheKey = generateCacheKey(endpoint, normalizedEmail, from, to, clientId)
    try {
      localStorage.removeItem(cacheKey)
    } catch {
      // Ignore removal errors
    }
  })
}

/**
 * Get cache statistics (for debugging)
 */
export function getCacheStats(): {
  totalEntries: number
  entries: Array<{ key: string; age: number; size: number }>
} {
  if (typeof window === 'undefined') {
    return { totalEntries: 0, entries: [] }
  }

  const entries: Array<{ key: string; age: number; size: number }> = []
  const now = Date.now()

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key)
          if (cached) {
            const parsed: CachedAnalyticsData<unknown> = JSON.parse(cached)
            const age = now - parsed.timestamp
            entries.push({
              key,
              age,
              size: cached.length,
            })
          }
        } catch {
          // Skip corrupted entries
        }
      }
    }
  } catch (error) {
    console.error('[AnalyticsCache] Error getting cache stats:', error)
  }

  return {
    totalEntries: entries.length,
    entries,
  }
}

