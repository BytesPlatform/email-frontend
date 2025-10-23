import { useState, useEffect } from 'react'
import { User, AuthState } from '@/types/auth'
import { authService } from '@/services/authService'

export function useAuth(): AuthState & {
  login: (email: string, password: string) => Promise<boolean>
  register: (email: string, password: string, name: string) => Promise<boolean>
  updateProfile: (data: { name?: string; email?: string; currentPassword?: string; newPassword?: string }) => Promise<boolean>
  logout: () => void
} {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  const isAuthenticated = !!user

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Only check auth on client side
        if (typeof window !== 'undefined') {
          const currentUser = await authService.getCurrentUser()
          setUser(currentUser)
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
      
      if (result.success && result.user) {
        setUser(result.user)
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

  const register = async (email: string, password: string, name: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await authService.register({ email, password, name })
      
      if (result.success && result.user) {
        setUser(result.user)
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

  const updateProfile = async (data: { name?: string; email?: string; currentPassword?: string; newPassword?: string }): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await authService.updateProfile(data)
      
      if (result.success && result.user) {
        setUser(result.user)
        return true
      } else {
        setError(result.error || 'Profile update failed')
        return false
      }
    } catch {
      setError('Profile update failed')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    authService.logout()
    setUser(null)
    setError(null)
  }

  return {
    user,
    isAuthenticated,
    isLoading: isLoading || !isInitialized,
    error,
    login,
    register,
    updateProfile,
    logout
  }
}
