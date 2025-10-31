import type { ScrapedRecord } from '@/types/emailGeneration'

/**
 * Helper function to truncate business name to 10 characters
 */
export const truncateBusinessName = (name: string | undefined | null): string => {
  if (!name) return 'Unknown Business'
  if (name.length <= 10) return name
  return name.substring(0, 10) + '...'
}

/**
 * Copy text to clipboard
 */
export const copyToClipboard = (text: string): void => {
  navigator.clipboard.writeText(text)
  // You could add a toast notification here
}

/**
 * Get records for the current page
 */
export const getCurrentPageRecords = (
  records: ScrapedRecord[],
  currentPage: number,
  recordsPerPage: number
): ScrapedRecord[] => {
  const startIndex = (currentPage - 1) * recordsPerPage
  const endIndex = startIndex + recordsPerPage
  return records.slice(startIndex, endIndex)
}

/**
 * Calculate total pages for pagination
 */
export const getTotalPages = (recordsCount: number, recordsPerPage: number): number => {
  return Math.ceil(recordsCount / recordsPerPage)
}
