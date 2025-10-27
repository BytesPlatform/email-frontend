import { useState, useEffect } from 'react'
import { Client, AuthState } from '@/types/auth'
import { authService } from '@/services/authService'

export function useAuth(): AuthState & {
  user: Client | null
  login: (email: string, password: string) => Promise<boolean>
  register: (email: string, password: string, name: string, phone?: string, city?: string, country?: string, address?: string) => Promise<boolean>
  logout: () => void
  updateProfile: (data: { name?: string; email?: string; currentPassword?: string; newPassword?: string }) => Promise<boolean>
} {
  const [client, setClient] = useState<Client | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  const isAuthenticated = !!client

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Only check auth on client side
        if (typeof window !== 'undefined') {
          const currentClient = await authService.getCurrentUser()
          setClient(currentClient)
        }
      } catch {
        setError('Failed to check authentication')
      } finally {
        setIsLoading(false)
        setIsInitialized(true)
      }
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await authService.login({ email, password })
      
      if (result.success && result.client) {
        setClient(result.client)
        return true
      } else {
        setError(result.error || 'Login failed')
        return false
      }
    } catch {
      setError('Login failed')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (email: string, password: string, name: string, phone?: string, city?: string, country?: string, address?: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      // Filter out undefined or empty values to avoid sending them to backend
      const registerData: { email: string; password: string; name: string; phone?: string; city?: string; country?: string; address?: string } = { email, password, name }
      
      if (phone && phone.trim()) registerData.phone = phone.trim()
      if (city && city.trim()) registerData.city = city.trim()
      if (country && country.trim()) registerData.country = country.trim()
      if (address && address.trim()) registerData.address = address.trim()
      
      const result = await authService.register(registerData)
      
      if (result.success && result.client) {
        setClient(result.client)
        return true
      } else {
        setError(result.error || 'Registration failed')
        return false
      }
    } catch {
      setError('Registration failed')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    authService.logout()
    setClient(null)
    setError(null)
  }

  const updateProfile = async (data: { name?: string; email?: string; currentPassword?: string; newPassword?: string }): Promise<boolean> => {
    // Placeholder implementation - no backend API yet
    return false
  }

  return {
    client,
    user: client, // Alias for backward compatibility
    isAuthenticated,
    isLoading: isLoading || !isInitialized,
    error,
    login,
    register,
    logout,
    updateProfile
  }
}
