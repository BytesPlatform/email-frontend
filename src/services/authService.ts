import { LoginCredentials, RegisterData, AuthResponse, User } from '@/types/auth'

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

// localStorage-based authentication service
export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Initialize demo data if not exists
      this.initializeDemoData()

      // Get stored users from localStorage
      const storedUsersStr = safeLocalStorage.getItem('users')
      const storedUsers = storedUsersStr ? JSON.parse(storedUsersStr) : []
      
      // Find user by email
      const user = storedUsers.find((u: User) => u.email === credentials.email)
      
      if (!user) {
        return { success: false, error: 'User not found' }
      }

      // In a real app, you'd hash and compare passwords
      // For demo purposes, we'll just check if password matches
      if (user.password !== credentials.password) {
        return { success: false, error: 'Invalid password' }
      }

      // Create session token
      const token = `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Store token and user in localStorage
      safeLocalStorage.setItem('auth_token', token)
      safeLocalStorage.setItem('current_user', JSON.stringify(user))
      
      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: new Date().toISOString()
        },
        token
      }
    } catch {
      return { success: false, error: 'Login failed' }
    }
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Get stored users from localStorage
      const storedUsersStr = safeLocalStorage.getItem('users')
      const storedUsers = storedUsersStr ? JSON.parse(storedUsersStr) : []
      
      // Check if user already exists
      const existingUser = storedUsers.find((u: User) => u.email === data.email)
      if (existingUser) {
        return { success: false, error: 'User already exists with this email' }
      }

      // Create new user
      const newUser: User = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email: data.email,
        name: data.name,
        role: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        password: data.password
      }

      // Store user in localStorage
      storedUsers.push(newUser)
      safeLocalStorage.setItem('users', JSON.stringify(storedUsers))

      // Create session token
      const token = `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Store token and user in localStorage
      safeLocalStorage.setItem('auth_token', token)
      safeLocalStorage.setItem('current_user', JSON.stringify(newUser))

      return {
        success: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          createdAt: newUser.createdAt,
          updatedAt: newUser.updatedAt
        },
        token
      }
    } catch {
      return { success: false, error: 'Registration failed' }
    }
  },

  async logout(): Promise<void> {
    safeLocalStorage.removeItem('auth_token')
    safeLocalStorage.removeItem('current_user')
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      const token = safeLocalStorage.getItem('auth_token')
      const userStr = safeLocalStorage.getItem('current_user')
      
      if (!token || !userStr) return null

      const user = JSON.parse(userStr)
      return user
    } catch {
      return null
    }
  },

  async updateProfile(data: { name?: string; email?: string; currentPassword?: string; newPassword?: string }): Promise<AuthResponse> {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))

      const token = safeLocalStorage.getItem('auth_token')
      const userStr = safeLocalStorage.getItem('current_user')
      
      if (!token || !userStr) {
        return { success: false, error: 'Not authenticated' }
      }

      const currentUser = JSON.parse(userStr)
      
      // Get stored users from localStorage
      const storedUsersStr = safeLocalStorage.getItem('users')
      const storedUsers = storedUsersStr ? JSON.parse(storedUsersStr) : []
      
      // Find user in stored users
      const userIndex = storedUsers.findIndex((u: User) => u.id === currentUser.id)
      if (userIndex === -1) {
        return { success: false, error: 'User not found' }
      }

      // If changing password, verify current password
      if (data.currentPassword && data.newPassword) {
        if (storedUsers[userIndex].password !== data.currentPassword) {
          return { success: false, error: 'Current password is incorrect' }
        }
        storedUsers[userIndex].password = data.newPassword
      }

      // Update user data
      if (data.name) {
        storedUsers[userIndex].name = data.name
      }
      if (data.email) {
        // Check if email is already taken by another user
        const emailExists = storedUsers.find((u: User, index: number) => 
          u.email === data.email && index !== userIndex
        )
        if (emailExists) {
          return { success: false, error: 'Email is already taken' }
        }
        storedUsers[userIndex].email = data.email
      }
      
      storedUsers[userIndex].updatedAt = new Date().toISOString()

      // Update stored users
      safeLocalStorage.setItem('users', JSON.stringify(storedUsers))

      // Update current user in localStorage
      const updatedUser = storedUsers[userIndex]
      safeLocalStorage.setItem('current_user', JSON.stringify(updatedUser))

      return {
        success: true,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt
        }
      }
    } catch {
      return { success: false, error: 'Profile update failed' }
    }
  },

  isAuthenticated(): boolean {
    return !!safeLocalStorage.getItem('auth_token')
  },

  // Helper method to initialize demo data
  initializeDemoData(): void {
    const existingUsers = safeLocalStorage.getItem('users')
    if (!existingUsers) {
      const demoUsers = [
        {
          id: 'demo_user_1',
          email: 'bytes@test.com',
          name: 'Demo User',
          role: 'user',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          password: 'Aq123456'
        }
      ]
      safeLocalStorage.setItem('users', JSON.stringify(demoUsers))
    }
  }
}
