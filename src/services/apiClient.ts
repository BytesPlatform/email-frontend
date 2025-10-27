import { API_CONFIG } from '@/lib/constants'

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
  private timeout: number

  constructor() {
    this.timeout = API_CONFIG.timeout
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_CONFIG.baseUrl}${endpoint}`
    
    // Debug logging
    console.log('🔍 API Client Debug:', {
      endpoint,
      url,
      method: options.method || 'GET',
      body: options.body
    })
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
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
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      console.log('🚀 Making request to:', url)
      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      
      console.log('📡 Response received:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        ok: response.ok
      })

      if (!response.ok) {
        console.log('❌ Response not OK:', response.status, response.statusText)
        const errorData = await response.json().catch(() => ({}))
        console.log('❌ Error data:', errorData)
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('📦 Response data:', data)
      
      // Handle your backend's response format
      if (data.message && data.client) {
        // Your backend returns: { message: 'Login successful', client: {...} }
        console.log('✅ Backend format detected:', { message: data.message, client: data.client })
        return {
          success: true,
          data: {
            message: data.message,
            client: data.client
          }
        } as ApiResponse<T>
      } else if (data.success !== undefined) {
        // Standard format: { success: true, data: {...} }
        console.log('✅ Standard format detected:', data)
        return {
          success: data.success,
          data: data.data,
          error: data.error
        } as ApiResponse<T>
      } else {
        // Direct data response
        console.log('✅ Direct data response:', data)
        return {
          success: true,
          data
        } as ApiResponse<T>
      }
    } catch (error) {
      console.log('💥 API Client Error:', error)
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.log('⏰ Request timeout')
          return {
            success: false,
            error: 'Request timeout',
          }
        }
        console.log('❌ Error message:', error.message)
        return {
          success: false,
          error: error.message,
        }
      }
      console.log('❌ Unknown error')
      return {
        success: false,
        error: 'An unexpected error occurred',
      }
    }
  }


  // Auth endpoints
  async login(credentials: { email: string; password: string }): Promise<ApiResponse> {
    console.log('🔐 Login method called with credentials:', { email: credentials.email, password: '[HIDDEN]' })
    const result = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
      credentials: 'include', // Important for HTTP-only cookies
    })
    console.log('🔐 Login result:', result)
    return result
  }

  async signup(data: { email: string; password: string; name: string; phone?: string; city?: string; country?: string; address?: string }): Promise<ApiResponse> {
    console.log('📝 Signup method called with data:', { 
      email: data.email, 
      name: data.name, 
      phone: data.phone,
      city: data.city,
      country: data.country,
      address: data.address,
      password: '[HIDDEN]' 
    })
    const result = await this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
      credentials: 'include',
    })
    console.log('📝 Signup result:', result)
    return result
  }

  async logout(): Promise<ApiResponse> {
    return this.request('/auth/logout', {
      method: 'POST',
      credentials: 'include',
    })
  }

  async verifyToken(): Promise<ApiResponse> {
    return this.request('/auth/verify', {
      method: 'GET',
      credentials: 'include',
    })
  }

  // Generic methods for other API calls
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
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
}

export const apiClient = new ApiClient()
