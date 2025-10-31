import { useCallback } from 'react'
import { emailGenerationApi } from '@/api/emailGeneration'
import { smsGenerationApi } from '@/api/smsGeneration'
import type { BusinessSummary } from '@/types/emailGeneration'

/**
 * Custom hook for email generation API calls
 */
export const useEmailGenerationAPI = () => {
  /**
   * Fetch full summary for a specific contact (only when View is clicked)
   */
  const fetchSummaryForContact = useCallback(async (contactId: number): Promise<BusinessSummary | null> => {
    try {
      const res = await emailGenerationApi.getContactSummary(contactId)
      if (res.success && res.data && 'summaryText' in res.data) {
        return res.data as BusinessSummary
      }
      return null
    } catch (error) {
      console.log(`No summary found for contact ${contactId}:`, error)
      return null
    }
  }, [])

  /**
   * Fetch email draft ID for a specific contact (only called when View Body is clicked)
   */
  const fetchEmailDraftIdForContact = useCallback(async (contactId: number): Promise<number | null> => {
    try {
      const res = await emailGenerationApi.getContactEmailDrafts(contactId)
      if (res.success && res.data && Array.isArray(res.data) && res.data.length > 0) {
        // Return the most recent draft ID (first one since backend orders by createdAt desc)
        return res.data[0].id
      }
      return null
    } catch (error) {
      console.log(`No email draft found for contact ${contactId}:`, error)
      return null
    }
  }, [])

  /**
   * Fetch SMS draft ID for a specific contact (only called when View SMS is clicked)
   */
  const fetchSMSDraftIdForContact = useCallback(async (contactId: number): Promise<number | null> => {
    try {
      const res = await smsGenerationApi.getContactSmsDrafts(contactId)
      if (res.success && res.data && Array.isArray(res.data) && res.data.length > 0) {
        // Return the most recent draft ID (first one since backend orders by createdAt desc)
        return res.data[0].id
      }
      return null
    } catch (error) {
      console.log(`No SMS draft found for contact ${contactId}:`, error)
      return null
    }
  }, [])

  return {
    fetchSummaryForContact,
    fetchEmailDraftIdForContact,
    fetchSMSDraftIdForContact,
  }
}
