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
      if (token) return token
      
      // If not in localStorage, cookies should be sent automatically with credentials: 'include'
      // But we can't read httpOnly cookies from JavaScript, so return null
      return null
    } catch {
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

    // Try to get token from localStorage (if stored) or cookies
    // This provides fallback if cookies don't work in production
    const token = this.getAuthToken()
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`
    }

    const config: RequestInit = {
      ...options,
      credentials: 'include', // Always include cookies for authentication
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
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
      
      // Handle different response formats
      if (data.message && data.client) {
        // Backend format: { message: 'Login successful', client: {...} }
        return {
          success: true,
          data: {
            message: data.message,
            client: data.client
          }
        } as ApiResponse<T>
      } else if (data.success !== undefined) {
        // Standard format: { success: true, data: {...} }
        // OR: { success: true, emailDraftId: ..., ... } (when backend returns directly)
        // If data.data exists, use it; otherwise, use the entire data object
        return {
          success: data.success,
          data: data.data !== undefined ? data.data : data,
          error: data.error
        } as ApiResponse<T>
      } else {
        // Direct data response
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
