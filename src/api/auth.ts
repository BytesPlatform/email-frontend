import { apiClient, ApiResponse } from './ApiClient'
import { LoginCredentials, RegisterData, AuthResponse, Client } from '@/types/auth'

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
        const data = response.data as { client?: Client; message?: string }
        const { client, message } = data
        
        // Store client data in localStorage for UI state management
        if (client) {
          safeLocalStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(client))
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
        const client = response.data as Client
        
        // Store client data in localStorage for UI state management
        if (client) {
          safeLocalStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(client))
        }
        
        return {
          success: true,
          client
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
  }
}
