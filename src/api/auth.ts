import { apiClient, ApiResponse } from './ApiClient'
import { LoginCredentials, RegisterData, AuthResponse, Client, ProfileResponse, UpdateProfileDto, UpdateProfileResponse } from '@/types/auth'

// Helper function to safely access localStorage
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(key, value)
    } catch {
      // Silently fail if localStorage is not available
    }
  },
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(key)
    } catch {
      // Silently fail if localStorage is not available
    }
  }
}

const STORAGE_KEYS = {
  currentUser: 'currentUser'
}

// Authentication API functions
export const auth = {
  // Login user
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await apiClient.post('/auth/login', credentials)
      
      if (response.success && response.data) {
        const data = response.data as { client?: Client; message?: string; access_token?: string }
        const { client, message, access_token } = data
        
        // Store client data in localStorage for UI state management
        if (client) {
          safeLocalStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(client))
        }
        
        // CRITICAL: Store token in localStorage - this is essential for production
        // ApiClient also stores it, but we do it here too to ensure it's always stored
        if (access_token) {
          safeLocalStorage.setItem('access_token', access_token)
          console.log('[Auth] Token stored in localStorage:', access_token.substring(0, 20) + '...')
          // Verify it was stored
          const stored = safeLocalStorage.getItem('access_token')
          if (stored === access_token) {
            console.log('[Auth] Token storage verified successfully')
          } else {
            console.error('[Auth] Token storage verification failed!')
            // Retry once
            safeLocalStorage.setItem('access_token', access_token)
            const retryStored = safeLocalStorage.getItem('access_token')
            if (retryStored === access_token) {
              console.log('[Auth] Token storage succeeded on retry')
            } else {
              console.error('[Auth] Token storage failed even after retry - localStorage may be disabled')
            }
          }
        } else {
          console.warn('[Auth] No access_token received in login response')
          // Try to get it from response.data directly (in case it's nested differently)
          const responseData = response.data as any
          if (responseData?.access_token) {
            console.log('[Auth] Found access_token in nested location, storing...')
            safeLocalStorage.setItem('access_token', responseData.access_token)
          }
        }
        
        return {
          success: true,
          client,
          message
        }
      } else {
        return {
          success: false,
          error: response.error || 'Login failed'
        }
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Login failed' 
      }
    }
  },

  // Register new user
  async signup(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await apiClient.post('/auth/signup', data)
      
      if (response.success && response.data) {
        const data = response.data as Client | { client?: Client; access_token?: string }
        
        // Handle different response formats
        const client = 'client' in data ? data.client : data
        const access_token = 'access_token' in data ? data.access_token : undefined
        
        // Store client data in localStorage for UI state management
        if (client) {
          safeLocalStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(client))
        }
        
        // CRITICAL: Store token in localStorage - this is essential for production
        if (access_token) {
          safeLocalStorage.setItem('access_token', access_token)
          console.log('[Auth] Token stored in localStorage during signup:', access_token.substring(0, 20) + '...')
          // Verify it was stored
          const stored = safeLocalStorage.getItem('access_token')
          if (stored === access_token) {
            console.log('[Auth] Token storage verified successfully during signup')
          } else {
            console.error('[Auth] Token storage verification failed during signup!')
            // Retry once
            safeLocalStorage.setItem('access_token', access_token)
            const retryStored = safeLocalStorage.getItem('access_token')
            if (retryStored === access_token) {
              console.log('[Auth] Token storage succeeded on retry during signup')
            } else {
              console.error('[Auth] Token storage failed even after retry during signup - localStorage may be disabled')
            }
          }
        } else {
          console.warn('[Auth] No access_token received in signup response')
          // Try to get it from response.data directly (in case it's nested differently)
          const responseData = response.data as any
          if (responseData?.access_token) {
            console.log('[Auth] Found access_token in nested location during signup, storing...')
            safeLocalStorage.setItem('access_token', responseData.access_token)
          }
        }
        
        return {
          success: true,
          client: client as Client
        }
      } else {
        return {
          success: false,
          error: response.error || 'Registration failed'
        }
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Registration failed' 
      }
    }
  },

  // Logout user
  async logout(): Promise<void> {
    try {
      // Call backend logout endpoint
      await apiClient.post('/auth/logout')
    } catch (error) {
      // Even if backend call fails, clear local storage
      console.warn('Logout API call failed:', error)
    } finally {
      // Always clear local storage
      safeLocalStorage.removeItem(STORAGE_KEYS.currentUser)
      safeLocalStorage.removeItem('access_token') // Also remove token
    }
  },

  // Verify authentication token
  async verifyToken(): Promise<ApiResponse<{ valid: boolean }>> {
    try {
      const response = await apiClient.get<{ valid: boolean }>('/auth/verify')
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token verification failed'
      }
    }
  },

  // Forgot password
  async forgotPassword(email: string): Promise<ApiResponse> {
    try {
      const response = await apiClient.post('/auth/forgot-password', { email })
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Forgot password request failed'
      }
    }
  },

  // Reset password
  async resetPassword(token: string, newPassword: string): Promise<ApiResponse> {
    try {
      const response = await apiClient.post('/auth/reset-password', { 
        token, 
        password: newPassword 
      })
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Password reset failed'
      }
    }
  },

  // Get current user from localStorage
  getCurrentUser(): Client | null {
    try {
      const clientStr = safeLocalStorage.getItem(STORAGE_KEYS.currentUser)
      if (clientStr) {
        return JSON.parse(clientStr)
      }
      return null
    } catch {
      return null
    }
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const clientStr = safeLocalStorage.getItem(STORAGE_KEYS.currentUser)
    return !!clientStr
  },

  // Verify authentication with backend
  async verifyAuthentication(): Promise<boolean> {
    try {
      const response = await this.verifyToken()
      return response.success && (response.data as { valid?: boolean })?.valid === true
    } catch {
      return false
    }
  },

  // Get user profile
  async getProfile(): Promise<ApiResponse<ProfileResponse>> {
    try {
      const response = await apiClient.get<{ message: string; profile: Client }>('/auth/profile')
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get profile'
      }
    }
  },

  // Update user profile
  async updateProfile(updateData: UpdateProfileDto): Promise<ApiResponse<UpdateProfileResponse>> {
    try {
      const response = await apiClient.put<{ message: string; profile: Client }>('/auth/profile', updateData)
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update profile'
      }
    }
  }
}
