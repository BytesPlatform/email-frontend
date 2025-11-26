import { useState, useEffect } from 'react'
import { Client, AuthState, ProductServiceInput } from '@/types/auth'
import { auth } from '@/api/auth'

export function useAuth(): AuthState & {
  user: Client | null
  login: (email: string, password: string) => Promise<boolean>
  register: (
    email: string,
    password: string,
    name: string,
    phone?: string,
    city?: string,
    country?: string,
    address?: string,
    companyName?: string,
    companyDescription?: string,
    businessName?: string,
    productsServices?: ProductServiceInput[]
  ) => Promise<boolean>
  logout: () => Promise<void>
  updateProfile: (data: { name?: string; email?: string; currentPassword?: string; newPassword?: string }) => Promise<boolean>
} {
  const [client, setClient] = useState<Client | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  const isAuthenticated = !!client

  useEffect(() => {
    const checkAuth = () => {
      try {
        // Only check auth on client side
        if (typeof window !== 'undefined') {
          // getCurrentUser is synchronous - reads from localStorage
          const currentClient = auth.getCurrentUser()
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
      const result = await auth.login({ email, password })
      
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

  const register = async (
    email: string,
    password: string,
    name: string,
    phone?: string,
    city?: string,
    country?: string,
    address?: string,
    companyName?: string,
    companyDescription?: string,
    businessName?: string,
    productsServices?: ProductServiceInput[]
  ): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      // Filter out undefined or empty values to avoid sending them to backend
      const registerData: {
        email: string
        password: string
        name: string
        phone?: string
        city?: string
        country?: string
        address?: string
        companyName?: string
        companyDescription?: string
        businessName?: string
        productsServices?: ProductServiceInput[]
      } = { email, password, name }
      
      if (phone && phone.trim()) registerData.phone = phone.trim()
      if (city && city.trim()) registerData.city = city.trim()
      if (country && country.trim()) registerData.country = country.trim()
      if (address && address.trim()) registerData.address = address.trim()
      if (companyName && companyName.trim()) registerData.companyName = companyName.trim()
      if (companyDescription && companyDescription.trim()) registerData.companyDescription = companyDescription.trim()
      if (businessName && businessName.trim()) registerData.businessName = businessName.trim()
      if (productsServices && productsServices.length > 0) registerData.productsServices = productsServices
      
      const result = await auth.signup(registerData)
      
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

  const logout = async () => {
    // Clear state immediately for responsive UI
    setClient(null)
    setError(null)
    
    // Await logout to ensure all cleanup completes
    // This ensures localStorage is cleared before any redirect happens
    try {
      await auth.logout()
      console.log('[AUTH] Logout completed successfully')
    } catch (error) {
      // Even if logout fails, state is already cleared
      console.warn('[AUTH] Logout error (state already cleared):', error)
    }
  }

  const updateProfile = async (): Promise<boolean> => {
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
