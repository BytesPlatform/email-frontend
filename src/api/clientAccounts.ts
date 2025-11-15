import { apiClient, ApiResponse } from './ApiClient';

export interface ClientEmail {
  id: number;
  emailAddress: string;
  status: 'active' | 'inactive';
  currentCounter: number;
  totalCounter: number;
  limit: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClientSms {
  id: number;
  phoneNumber: string;
  status: 'active' | 'inactive';
  currentCounter: number;
  totalCounter: number;
  limit: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientEmailRequest {
  emailAddress: string;
  providerSettings?: string;
}

export interface CreateClientSmsRequest {
  phoneNumber: string;
  providerSettings?: string;
}

export const clientAccountsApi = {
  /**
   * Get all client emails
   */
  async getClientEmails(): Promise<ApiResponse<ClientEmail[]>> {
    return apiClient.get<ClientEmail[]>('/emails/client-emails');
  },

  /**
   * Create a new client email
   */
  async createClientEmail(data: CreateClientEmailRequest): Promise<ApiResponse<ClientEmail>> {
    return apiClient.post<ClientEmail>('/emails/client-emails', data);
  },

  /**
   * Delete a client email
   */
  async deleteClientEmail(id: number): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/emails/client-emails/${id}`);
  },

  /**
   * Get all client SMS numbers
   */
  async getClientSms(): Promise<ApiResponse<ClientSms[]>> {
    return apiClient.get<ClientSms[]>('/sms/client-sms');
  },

  /**
   * Create a new client SMS number
   */
  async createClientSms(data: CreateClientSmsRequest): Promise<ApiResponse<ClientSms>> {
    return apiClient.post<ClientSms>('/sms/client-sms', data);
  },

  /**
   * Delete a client SMS number
   */
  async deleteClientSms(id: number): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/sms/client-sms/${id}`);
  },
};

