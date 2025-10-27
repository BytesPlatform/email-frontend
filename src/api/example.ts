import { apiClient, ApiResponse } from './ApiClient'

// Example API functions for other features
export const userApi = {
  // Get user profile
  async getProfile(): Promise<ApiResponse> {
    return apiClient.get('/user/profile')
  },

  // Update user profile
  async updateProfile(data: { name?: string; email?: string; phone?: string }): Promise<ApiResponse> {
    return apiClient.put('/user/profile', data)
  },

  // Change password
  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse> {
    return apiClient.post('/user/change-password', { currentPassword, newPassword })
  }
}

export const dataApi = {
  // Get CSV data
  async getCsvData(): Promise<ApiResponse> {
    return apiClient.get('/data/csv')
  },

  // Upload CSV file
  async uploadCsv(file: File): Promise<ApiResponse> {
    const formData = new FormData()
    formData.append('file', file)
    
    return apiClient.post('/data/csv/upload', formData)
  },

  // Get scraping history
  async getScrapingHistory(): Promise<ApiResponse> {
    return apiClient.get('/data/scraping/history')
  },

  // Start scraping
  async startScraping(config: any): Promise<ApiResponse> {
    return apiClient.post('/data/scraping/start', config)
  }
}
