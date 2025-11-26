import { apiClient, ApiResponse } from './ApiClient';

export interface ClientEmail {
  id: number | null; // null for pending verifications (before ClientEmail is created)
  emailAddress: string;
  status: 'active' | 'inactive';
  verificationStatus: 'pending' | 'verified' | 'expired' | 'rejected';
  verificationMethod: 'otp';
  verifiedAt?: string | null;
  lastOtpSentAt?: string | null;
  currentCounter: number;
  totalCounter: number;
  limit: number;
  createdAt: string;
  updatedAt: string;
  verificationId?: number; // Present for pending verifications (before ClientEmail is created)
}

export interface ClientSms {
  id: number | null; // null for pending verifications (before ClientSms is created)
  phoneNumber: string; // E.164 format (e.g., "+923117243792")
  status: 'active' | 'inactive';
  verificationStatus: 'pending' | 'verified' | 'expired' | 'rejected';
  verificationMethod: 'otp';
  verifiedAt?: string | null;
  lastOtpSentAt?: string | null;
  currentCounter: number;
  totalCounter: number;
  limit: number | null;
  createdAt: string;
  updatedAt: string;
  verificationId?: number; // Present for pending verifications (before ClientSms is created)
}

export interface CreateClientEmailRequest {
  emailAddress: string;
  providerSettings?: string;
}

export interface CreateClientSmsRequest {
  phoneNumber: string;
  providerSettings?: string;
  countryCode?: string;
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

  async requestEmailOtp(id: number): Promise<ApiResponse<unknown>> {
    return apiClient.post(`/emails/client-emails/${id}/request-otp`);
  },

  async verifyEmailOtp(id: number, code: string): Promise<ApiResponse<unknown>> {
    return apiClient.post(`/emails/client-emails/${id}/verify-otp`, { code });
  },

  async requestSmsOtp(id: number): Promise<ApiResponse<unknown>> {
    return apiClient.post(`/sms/client-sms/${id}/request-otp`);
  },

  async verifySmsOtp(id: number, code: string): Promise<ApiResponse<unknown>> {
    return apiClient.post(`/sms/client-sms/${id}/verify-otp`, { code });
  },

  /**
   * Delete a pending email verification
   */
  async deletePendingEmailVerification(verificationId: number): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/emails/pending-verifications/${verificationId}`);
  },

  /**
   * Delete a pending SMS verification
   */
  async deletePendingSmsVerification(verificationId: number): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/sms/pending-verifications/${verificationId}`);
  },
};

