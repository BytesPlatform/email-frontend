import { apiClient, ApiResponse } from './ApiClient';
import {
  CsvUploadResponse,
  CsvUpload,
  AllClientContactsResponse,
  ClientContact,
  ClientContactsListResponse,
  ClientContactsQuery,
  UpdateContactPayload,
  UpdateContactResponse,
  BulkUpdateContactItem,
  BulkUpdateContactsPayload,
  BulkUpdateResult
} from '@/types/ingestion';

export const ingestionApi = {
  /**
   * Upload a CSV file to the ingestion service
   */
  async uploadCsv(file: File, clientId: number): Promise<ApiResponse<CsvUploadResponse>> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientId', clientId.toString());
      
      // Try to include Authorization header (same idea as ApiClient) so this
      // works even if cross-site cookies are not sent in production (Vercel).
      let authHeader: HeadersInit = {};
      if (typeof window !== 'undefined') {
        try {
          const token = localStorage.getItem('access_token');
          if (token) {
            authHeader = {
              Authorization: `Bearer ${token}`,
            };
          }
        } catch (err) {
          console.warn('[ingestionApi.uploadCsv] Failed to read access_token from localStorage', err);
        }
      }
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/ingestion/upload`,
        {
          method: 'POST',
          body: formData,
          credentials: 'include', // Include cookies for authentication (if available)
          headers: authHeader,
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
   * Get paginated contacts for the authenticated client
   */
  async listContacts(query: ClientContactsQuery = {}): Promise<ApiResponse<ClientContactsListResponse>> {
    try {
      const params = new URLSearchParams();

      if (query.page && query.page > 0) {
        params.append('page', query.page.toString());
      }
      if (query.limit && query.limit > 0) {
        params.append('limit', query.limit.toString());
      }
      if (query.status && query.status !== 'all') {
        params.append('status', query.status);
      }
      if (typeof query.csvUploadId === 'number') {
        params.append('csvUploadId', query.csvUploadId.toString());
      }
      if (typeof query.validOnly === 'boolean') {
        params.append('validOnly', String(query.validOnly));
      }
      if (typeof query.invalidOnly === 'boolean') {
        params.append('invalidOnly', String(query.invalidOnly));
      }
      const trimmedSearch = query.search?.trim();
      if (trimmedSearch) {
        params.append('search', trimmedSearch);
      }
      if (query.searchField && query.searchField !== 'all') {
        params.append('searchField', query.searchField);
      }
      if (query.sortBy) {
        params.append('sortBy', query.sortBy);
      }
      if (query.sortOrder) {
        params.append('sortOrder', query.sortOrder);
      }

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const response = await apiClient.get<ClientContactsListResponse>(`/ingestion/contacts${queryString}`);

      if (response.success && response.data) {
        return { success: true, data: response.data };
      }

      return { success: false, error: response.error || 'Failed to fetch contacts' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch contacts'
      };
    }
  },

  /**
   * Get a single contact by id for the authenticated client
   */
  async getContactById(contactId: number): Promise<ApiResponse<ClientContact>> {
    try {
      const response = await apiClient.get<ClientContact>(`/ingestion/contacts/${contactId}`);

      if (response.success && response.data) {
        return { success: true, data: response.data };
      }

      return { success: false, error: response.error || 'Failed to fetch contact details' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch contact details'
      };
    }
  },

  /**
   * Update a single contact (fix invalid contact info)
   */
  async updateContact(
    contactId: number,
    payload: UpdateContactPayload
  ): Promise<ApiResponse<UpdateContactResponse>> {
    try {
      const response = await apiClient.patch<UpdateContactResponse>(
        `/ingestion/contacts/${contactId}`,
        payload
      );

      if (response.success && response.data) {
        const raw = response.data as UpdateContactResponse | ClientContact;
        const contact =
          (raw as UpdateContactResponse)?.contact ?? (raw as ClientContact);
        if (contact && typeof contact.id === 'number') {
          const message = (raw as UpdateContactResponse)?.message;
          return {
            success: true,
            data: {
              contact,
              message
            }
          };
        }

        return {
          success: true,
          data: {
            contact: contact as ClientContact
          }
        };
      }

      return { success: false, error: response.error || 'Failed to update contact' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update contact'
      };
    }
  },

  /**
   * Bulk update multiple contacts
   */
  async bulkUpdateContacts(
    payload: BulkUpdateContactsPayload
  ): Promise<ApiResponse<BulkUpdateResult>> {
    try {
      const response = await apiClient.patch<BulkUpdateResult>(
        `/ingestion/contacts/bulk`,
        payload
      );

      if (response.success && response.data) {
        const raw = response.data as BulkUpdateResult | { updated?: ClientContact[]; failed?: unknown[] };
        const updated = Array.isArray(raw.updated) ? raw.updated : [];
        const failed = Array.isArray(raw.failed) ? raw.failed : [];

        return {
          success: true,
          data: {
            updated,
            failed: failed as Array<{ id: number; error: string }>
          }
        };
      }

      return { success: false, error: response.error || 'Failed to bulk update contacts' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to bulk update contacts'
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
  },

  /**
   * Get all invalid contacts (no email AND no phone in E.164 format) for the authenticated client
   * No pagination - returns all invalid contacts
   * @param csvUploadId Optional CSV upload ID to filter invalid contacts from a specific upload
   */
  async getAllInvalidContacts(csvUploadId?: number): Promise<ApiResponse<AllClientContactsResponse>> {
    try {
      let url = `/ingestion/contacts/invalid`;
      
      if (csvUploadId) {
        // Use the new separate endpoint
        url = `/ingestion/contacts/invalid/${csvUploadId}`;
      }
      
      const response = await apiClient.get<AllClientContactsResponse>(url);
      
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      return { success: false, error: response.error || 'Failed to fetch invalid contacts' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch invalid contacts'
      };
    }
  },

  /**
   * Bulk delete all invalid contacts (no email AND no phone) for the authenticated client
   */
  async bulkDeleteInvalidContacts(): Promise<ApiResponse<{ message: string; deletedCount: number }>> {
    try {
      const response = await apiClient.delete<{ message: string; deletedCount: number }>(
        `/ingestion/contacts/invalid/bulk`
      );
      
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      return { success: false, error: response.error || 'Failed to delete invalid contacts' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete invalid contacts'
      };
    }
  },

  /**
   * Delete a single contact by ID
   */
  async deleteContact(contactId: number): Promise<ApiResponse<{ message: string; deleted: boolean }>> {
    try {
      const response = await apiClient.delete<{ message: string; deleted: boolean }>(
        `/ingestion/contacts/${contactId}`
      );
      
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      return { success: false, error: response.error || 'Failed to delete contact' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete contact'
      };
    }
  },

  /**
   * Validate email address in real-time
   */
  async validateEmail(email: string): Promise<ApiResponse<{ valid: boolean; message: string }>> {
    try {
      const response = await apiClient.post<{ valid: boolean; message: string }>('/validation/email', { email });
      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate email'
      };
    }
  },

  /**
   * Validate website URL in real-time
   */
  async validateWebsite(website: string): Promise<ApiResponse<{ valid: boolean; message: string }>> {
    try {
      const response = await apiClient.post<{ valid: boolean; message: string }>('/validation/website', { website });
      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate website'
      };
    }
  }
};

