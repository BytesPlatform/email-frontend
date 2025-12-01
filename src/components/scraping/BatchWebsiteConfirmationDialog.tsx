'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { BatchDiscoveryResult } from '@/types/scraping'

interface BatchWebsiteConfirmationDialogProps {
  isOpen: boolean
  results: BatchDiscoveryResult[]
  onConfirm: (confirmedWebsites: { [contactId: number]: string }) => void
  onCancel: () => void
  isLoading?: boolean
}

export function BatchWebsiteConfirmationDialog({
  isOpen,
  results,
  onConfirm,
  onCancel,
  isLoading = false
}: BatchWebsiteConfirmationDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [confirmedWebsites, setConfirmedWebsites] = useState<{ [contactId: number]: string }>({})
  const [removedContactIds, setRemovedContactIds] = useState<Set<number>>(new Set())

  if (!isOpen || results.length === 0) return null

  // Filter to only show successful discoveries that haven't been removed
  const successfulResults = results.filter(r => r.success && r.data && !removedContactIds.has(r.contactId))
  const totalCount = successfulResults.length
  const currentResult = successfulResults[currentIndex]

  const confidenceColors = {
    high: 'bg-emerald-100 text-emerald-800',
    medium: 'bg-amber-100 text-amber-800',
    low: 'bg-rose-100 text-rose-800'
  }

  const confidenceLabels = {
    high: 'High Confidence',
    medium: 'Medium Confidence',
    low: 'Low Confidence'
  }

  const handleNext = () => {
    if (currentIndex < totalCount - 1) {
      setCurrentIndex(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
    }
  }

  const handleRemoveCurrent = () => {
    if (currentResult) {
      setRemovedContactIds(prev => new Set([...prev, currentResult.contactId]))
      // Remove from confirmed websites if it was confirmed
      setConfirmedWebsites(prev => {
        const updated = { ...prev }
        delete updated[currentResult.contactId]
        return updated
      })
      // Adjust index if needed
      if (currentIndex >= totalCount - 1 && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1)
      }
    }
  }

  const handleConfirmCurrent = () => {
    if (currentResult && currentResult.data) {
      setConfirmedWebsites(prev => ({
        ...prev,
        [currentResult.contactId]: currentResult.data!.discoveredWebsite
      }))
      // Auto-advance to next if available
      if (currentIndex < totalCount - 1) {
        setCurrentIndex(prev => prev + 1)
      }
    }
  }

  const handleSkipCurrent = () => {
    // Auto-advance to next if available
    if (currentIndex < totalCount - 1) {
      setCurrentIndex(prev => prev + 1)
    }
  }

  const handleStartScrap = () => {
    // Only include confirmed websites, excluding removed contacts
    // Only scrape contacts that have been explicitly confirmed
    const finalConfirmed: { [contactId: number]: string } = {}
    successfulResults.forEach(result => {
      if (result.data && !removedContactIds.has(result.contactId)) {
        // Only include if it's been confirmed
        if (confirmedWebsites[result.contactId]) {
          finalConfirmed[result.contactId] = confirmedWebsites[result.contactId]
        }
      }
    })
    onConfirm(finalConfirmed)
  }

  const handleVisitWebsite = () => {
    if (currentResult?.data?.discoveredWebsite) {
      window.open(currentResult.data.discoveredWebsite, '_blank', 'noopener,noreferrer')
    }
  }

  const isCurrentConfirmed = currentResult && confirmedWebsites[currentResult.contactId]
  const allViewed = totalCount === 0 || currentIndex === totalCount - 1
  const confirmedCount = Object.keys(confirmedWebsites).filter(id => !removedContactIds.has(Number(id))).length
  const remainingCount = totalCount

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onCancel()
        }
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-slate-900">Confirm Websites to Scrape</h3>
            <p className="text-sm text-slate-600 mt-1">
              {totalCount > 0 ? `${currentIndex + 1} of ${totalCount}` : 'No contacts remaining'} • {confirmedCount} confirmed • {removedContactIds.size} removed
            </p>
          </div>
          {/* Close Button */}
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
            disabled={isLoading}
            title="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {currentResult && currentResult.data ? (
          <div className="space-y-4">
            {/* Business Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Business Name</label>
              <p className="text-sm text-slate-900 font-medium">{currentResult.businessName || 'Unknown Business'}</p>
            </div>

            {/* Discovered Website */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Discovered Website</label>
              <div className="flex items-center space-x-2">
                <a
                  href={currentResult.data.discoveredWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline flex-1 truncate"
                  onClick={(e) => e.stopPropagation()}
                >
                  {currentResult.data.discoveredWebsite}
                </a>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleVisitWebsite()
                  }}
                  className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded p-1 transition-colors"
                  title="Visit Website"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Confidence Badge */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Confidence</label>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${confidenceColors[currentResult.data.confidence]}`}>
                {confidenceLabels[currentResult.data.confidence]}
              </span>
            </div>

            {/* Search Query (if available) */}
            {currentResult.data.searchQuery && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Search Query</label>
                <p className="text-xs text-slate-500 italic">{currentResult.data.searchQuery}</p>
              </div>
            )}

            {/* Confirmation Status */}
            {isCurrentConfirmed && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-green-700 flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  This website has been confirmed
                </p>
              </div>
            )}

            {/* Info Message */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-700">
                Please verify this is the correct website. You can visit the website to confirm.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-slate-600">No website discovered for this contact</p>
          </div>
        )}

        {/* Navigation and Actions */}
        <div className="space-y-3 pt-4 border-t border-slate-200">
          {/* Navigation Buttons - Top Row */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevious}
              disabled={totalCount === 0 || currentIndex === 0 || isLoading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium text-sm hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>
            <button
              onClick={handleNext}
              disabled={totalCount === 0 || currentIndex >= totalCount - 1 || isLoading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium text-sm hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
            >
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Action Buttons - Middle Row */}
          {currentResult && currentResult.data && totalCount > 0 && (
            <div className="flex items-center gap-2">
              {!isCurrentConfirmed ? (
                <button
                  onClick={handleConfirmCurrent}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Confirm
                </button>
              ) : (
                <button
                  disabled
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-green-100 text-green-700 font-medium text-sm cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Confirmed
                </button>
              )}
              <button
                onClick={handleRemoveCurrent}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-red-300 bg-white text-red-700 font-medium text-sm hover:bg-red-50 hover:border-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Remove this contact from scraping"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Remove
              </button>
            </div>
          )}

          {/* No contacts message */}
          {totalCount === 0 && (
            <div className="text-center py-6 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-sm text-slate-600 mb-2">All contacts have been removed</p>
              <p className="text-xs text-slate-500">Click Cancel to exit or Start Scrap to proceed with remaining contacts</p>
            </div>
          )}

          {/* Start Scrap Button - Bottom */}
          {remainingCount > 0 && (
            <button
              onClick={handleStartScrap}
              disabled={isLoading || confirmedCount === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
            >
              {isLoading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Starting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Start Scrap ({confirmedCount} {confirmedCount === 1 ? 'confirmed contact' : 'confirmed contacts'})
                </>
              )}
            </button>
          )}

        </div>
      </div>
    </div>
  )
}

