import { apiClient, ApiResponse } from './ApiClient'
import { CsvUploadResponse, CsvUpload } from '@/types/ingestion'

export const ingestionApi = {
  /**
   * Upload a CSV file to the ingestion service
   */
  async uploadCsv(file: File, clientId: number): Promise<ApiResponse<CsvUploadResponse>> {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('clientId', clientId.toString())
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/ingestion/upload`,
        {
          method: 'POST',
          body: formData,
          credentials: 'include', // Include cookies for authentication
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      return {
        success: true,
        data: data as CsvUploadResponse
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'CSV upload failed'
      }
    }
  },

  /**
   * Get all CSV uploads for a client
   */
  async getClientUploads(clientId: number): Promise<ApiResponse<CsvUpload[]>> {
    try {
      const response = await apiClient.get<CsvUpload[]>(`/ingestion/uploads/${clientId}`)
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch uploads'
      }
    }
  },

  /**
   * Get details of a specific CSV upload
   */
  async getUploadDetails(uploadId: number): Promise<ApiResponse<CsvUpload>> {
    try {
      const response = await apiClient.get<CsvUpload>(`/ingestion/upload/${uploadId}`)
      return response
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch upload details'
      }
    }
  }
}

