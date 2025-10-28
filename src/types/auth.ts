export interface Client {
  id: number
  email: string
  name: string
  phone?: string
  city?: string
  country?: string
  address?: string
  createdAt: string
  updatedAt?: string
}

export interface ProfileResponse {
  message: string
  profile: Client
}

export interface UpdateProfileDto {
  name?: string
  phone?: string
  city?: string
  country?: string
  address?: string
}

export interface UpdateProfileResponse {
  message: string
  profile: Client
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  name: string
  phone?: string
  city?: string
  country?: string
  address?: string
}

export interface AuthResponse {
  success: boolean
  client?: Client
  message?: string
  error?: string
}

export interface AuthState {
  client: Client | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

// Legacy User interface for backward compatibility
export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'user'
  createdAt: string
  updatedAt: string
  password?: string
}
