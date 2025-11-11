import { apiClient, ApiResponse } from './ApiClient';
import { CsvUploadResponse, CsvUpload, AllClientContactsResponse } from '@/types/ingestion';

export const ingestionApi = {
  /**
   * Upload a CSV file to the ingestion service
   */
  async uploadCsv(file: File, clientId: number): Promise<ApiResponse<CsvUploadResponse>> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientId', clientId.toString());
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/ingestion/upload`,
        {
          method: 'POST',
          body: formData,
          credentials: 'include', // Include cookies for authentication
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        data: data as CsvUploadResponse
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'CSV upload failed'
      };
    }
  },

  /**
   * Get all CSV uploads for a client
   */
  async getClientUploads(): Promise<ApiResponse<CsvUpload[]>> {
    try {
      // Backend: GET /ingestion/uploads returns { message, count, uploads }
      const response = await apiClient.get<{ message: string; count: number; uploads: CsvUpload[] }>(`/ingestion/uploads`);
      if (response.success && response.data) {
        return { success: true, data: response.data.uploads };
      }
      return { success: false, error: response.error || 'Failed to fetch uploads' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch uploads'
      };
    }
  },

  /**
   * Get details of a specific CSV upload
   */
  async getUploadDetails(uploadId: number): Promise<ApiResponse<CsvUpload>> {
    try {
      // Backend: GET /ingestion/upload/:id returns { message, upload }
      const response = await apiClient.get<{ message: string; upload: CsvUpload }>(`/ingestion/upload/${uploadId}`);
      if (response.success && response.data) {
        return { success: true, data: response.data.upload };
      }
      return { success: false, error: response.error || 'Failed to fetch upload details' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch upload details'
      };
    }
  },

  /**
   * Get all client contacts (from all CSV uploads)
   */
  async getAllClientContacts(
    limit?: number,
    status?: string,
    valid?: boolean
  ): Promise<ApiResponse<AllClientContactsResponse>> {
    try {
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());
      if (status) params.append('status', status);
      if (valid !== undefined) params.append('valid', valid.toString());
      
      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await apiClient.get<AllClientContactsResponse>(`/ingestion/contacts/all${query}`);
      
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      return { success: false, error: response.error || 'Failed to fetch all client contacts' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch all client contacts'
      };
    }
  }
};

