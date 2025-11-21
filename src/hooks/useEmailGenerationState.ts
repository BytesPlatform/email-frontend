import { useState, useCallback } from 'react'
import type { EmailGenerationState, ScrapedRecord, SpamCheckResult, OptimizationSuggestions } from '@/types/emailGeneration'

/**
 * Custom hook for email generation state management
 */
export const useEmailGenerationState = () => {
  const [state, setState] = useState<EmailGenerationState>({
    scrapedRecords: [],
    isLoadingRecords: false,
    isLoadingBulkStatus: false,
    error: null,
    currentPage: 1,
    recordsPerPage: 8
  })

  // Detail drawer state
  const [selectedRecord, setSelectedRecord] = useState<ScrapedRecord | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [drawerViewMode, setDrawerViewMode] = useState<'full' | 'summary-only'>('full')
  
  // Mode toggle state (Email or SMS)
  const [mode, setMode] = useState<'email' | 'sms'>('email')
  
  // Email body overlay state
  const [emailBodyOverlay, setEmailBodyOverlay] = useState<{
    isOpen: boolean
    subject: string
    body: string
    isEditMode?: boolean
    smsDraftId?: number
    emailDraftId?: number
    spamCheckResult?: SpamCheckResult
    optimizationSuggestions?: OptimizationSuggestions
  } | null>(null)

  // Drawer handlers
  const openDrawer = useCallback((record: ScrapedRecord, viewMode: 'full' | 'summary-only' = 'full') => {
    setSelectedRecord(record)
    setDrawerViewMode(viewMode)
    setIsDrawerOpen(true)
    // Prevent body scrolling when drawer is open
    document.body.style.overflow = 'hidden'
  }, [])

  const closeDrawer = useCallback(() => {
    setSelectedRecord(null)
    setDrawerViewMode('full')
    setIsDrawerOpen(false)
    // Restore body scrolling when drawer is closed
    document.body.style.overflow = 'unset'
  }, [])

  const handlePageChange = useCallback((page: number) => {
    setState(prev => ({ ...prev, currentPage: page }))
    // Note: Actual refetch is handled by useEffect in parent component
  }, [])

  const handlePreviousPage = useCallback(() => {
    setState(prev => {
      if (prev.currentPage > 1) {
        return { ...prev, currentPage: prev.currentPage - 1 }
      }
      return prev
    })
  }, [])

  const handleNextPage = useCallback(() => {
    setState(prev => {
      // Use totalItems for server-side pagination, fallback to records.length for client-side
      const totalItems = prev.totalItems || prev.scrapedRecords.length
      const totalPages = Math.ceil(totalItems / prev.recordsPerPage)
      if (prev.currentPage < totalPages) {
        return { ...prev, currentPage: prev.currentPage + 1 }
      }
      return prev
    })
  }, [])

  return {
    // State
    state,
    setState,
    selectedRecord,
    setSelectedRecord,
    isDrawerOpen,
    setIsDrawerOpen,
    drawerViewMode,
    setDrawerViewMode,
    mode,
    setMode,
    emailBodyOverlay,
    setEmailBodyOverlay,
    // Actions
    openDrawer,
    closeDrawer,
    handlePageChange,
    handlePreviousPage,
    handleNextPage,
  }
}

