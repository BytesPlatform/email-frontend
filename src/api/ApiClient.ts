export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface ApiError {
  message: string
  status?: number
  code?: string
}

class ApiClient {
  private baseUrl: string
  private timeout: number

  constructor() {
    // Use environment variable if set (for Vercel deployments), otherwise use localhost
    // This allows:
    // - Local development: uses localhost (no env var needed)
    // - Local production testing: uses localhost (no env var needed)
    // - Vercel deployments: uses Render URL (set via NEXT_PUBLIC_API_URL env var)
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    this.timeout = 100000 // 100 seconds
  }

  /**
   * Get authentication token from localStorage or cookies
   * This provides fallback if cookies don't work in production
   */
  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null
    
    try {
      // Try to get token from localStorage first (if stored)
      const token = localStorage.getItem('access_token')
      if (token) {
        // Log in production for debugging (can be removed later)
        console.log('[ApiClient] Token found in localStorage, length:', token.length)
        return token
      }
      
      // If not in localStorage, cookies should be sent automatically with credentials: 'include'
      // But we can't read httpOnly cookies from JavaScript, so return null
      console.warn('[ApiClient] No token found in localStorage')
      return null
    } catch (error) {
      console.error('[ApiClient] Error accessing localStorage:', error)
      return null
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit & { timeout?: number } = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // CRITICAL: Always try to get token from localStorage and add Authorization header
    // This is essential for production cross-origin requests
    const token = this.getAuthToken()
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`
      console.log('[ApiClient] Authorization header added with token')
    } else {
      console.warn('[ApiClient] No token in localStorage - requests may fail if cookies also fail')
    }

    // Merge headers: defaultHeaders first, then options.headers
    // This ensures Authorization header is set, but allows it to be overridden if needed
    const customHeaders = options.headers ? (typeof options.headers === 'object' && !(options.headers instanceof Headers) 
      ? (Array.isArray(options.headers) 
          ? Object.fromEntries(options.headers as [string, string][])
          : options.headers as Record<string, string>)
      : {}) : {}
    
    const mergedHeaders: Record<string, string> = {
      ...defaultHeaders,
      ...customHeaders,
    }
    
    // CRITICAL: Ensure Authorization header is never removed by custom headers
    // If token exists, always include it (unless explicitly set to empty/null)
    if (token && !customHeaders['Authorization'] && !customHeaders['authorization']) {
      mergedHeaders['Authorization'] = `Bearer ${token}`
    }

    const config: RequestInit = {
      ...options,
      credentials: 'include', // Always include cookies for authentication
      headers: mergedHeaders,
    }

    try {
      const controller = new AbortController()
      const requestTimeout = options.timeout || this.timeout
      const timeoutId = setTimeout(() => controller.abort(), requestTimeout)

      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      // CRITICAL: Extract and store access_token from ANY response format
      // This ensures token is always available for Authorization header
      let access_token: string | undefined = undefined
      
      // Check for access_token in various possible locations
      if (data.access_token) {
        access_token = data.access_token
      } else if (data.data?.access_token) {
        access_token = data.data.access_token
      } else if (typeof data === 'object' && 'access_token' in data) {
        access_token = (data as Record<string, unknown>).access_token as string | undefined
      }
      
      // If token found, store it immediately (for future requests)
      if (access_token && typeof window !== 'undefined') {
        try {
          localStorage.setItem('access_token', access_token)
          console.log('[ApiClient] Token extracted and stored from response')
        } catch (error) {
          console.error('[ApiClient] Failed to store token:', error)
        }
      }
      
      // Handle different response formats
      if (data.message && data.client) {
        // Backend format: { message: 'Login successful', client: {...}, access_token: '...' }
        return {
          success: true,
          data: {
            message: data.message,
            client: data.client,
            access_token: access_token || data.access_token // Include access_token if present
          }
        } as ApiResponse<T>
      } else if (data.success !== undefined) {
        // Standard format: { success: true, data: {...} }
        // OR: { success: true, emailDraftId: ..., ... } (when backend returns directly)
        // If data.data exists, use it; otherwise, use the entire data object
        const responseData = data.data !== undefined ? data.data : data
        // Ensure access_token is included in the response data
        if (access_token && typeof responseData === 'object' && responseData !== null) {
          (responseData as Record<string, unknown>).access_token = access_token
        }
        return {
          success: data.success,
          data: responseData,
          error: data.error
        } as ApiResponse<T>
      } else {
        // Direct data response - ensure access_token is included
        if (access_token && typeof data === 'object' && data !== null) {
          (data as Record<string, unknown>).access_token = access_token
        }
        return {
          success: true,
          data
        } as ApiResponse<T>
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: 'Request timeout',
          }
        }
        return {
          success: false,
          error: error.message,
        }
      }
      return {
        success: false,
        error: 'An unexpected error occurred',
      }
    }
  }

  // Generic HTTP methods
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async getWithTimeout<T>(endpoint: string, timeoutMs: number): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET', timeout: timeoutMs })
  }

  async post<T>(endpoint: string, data?: unknown, timeout?: number): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      timeout,
    })
  }

  async put<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }
}

export const apiClient = new ApiClient()
