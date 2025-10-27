import { LoginCredentials, RegisterData, AuthResponse, Client } from '@/types/auth'
import { apiClient } from './apiClient'
import { STORAGE_KEYS } from '@/lib/constants'

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

// Backend API-based authentication service with HTTP-only cookies
export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await apiClient.login(credentials)
      
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

  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await apiClient.signup(data)
      
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

  async logout(): Promise<void> {
    try {
      // Call backend logout endpoint
      await apiClient.logout()
    } catch (error) {
      // Even if backend call fails, clear local storage
      console.warn('Logout API call failed:', error)
    } finally {
      // Always clear local storage
      safeLocalStorage.removeItem(STORAGE_KEYS.currentUser)
    }
  },

  async getCurrentUser(): Promise<Client | null> {
    try {
      // For now, just get from localStorage since we removed getProfile API
      const clientStr = safeLocalStorage.getItem(STORAGE_KEYS.currentUser)
      if (clientStr) {
        return JSON.parse(clientStr)
      }
      return null
    } catch {
      // If parsing fails, return null
      return null
    }
  },

  isAuthenticated(): boolean {
    // Since we're using HTTP-only cookies, we need to check if we have client data
    // The actual authentication is handled by the backend via cookies
    const clientStr = safeLocalStorage.getItem(STORAGE_KEYS.currentUser)
    return !!clientStr
  },

  // Helper method to verify authentication with backend
  async verifyAuthentication(): Promise<boolean> {
    try {
      const response = await apiClient.verifyToken()
      return response.success && (response.data as { valid?: boolean })?.valid === true
    } catch {
      return false
    }
  }
}
