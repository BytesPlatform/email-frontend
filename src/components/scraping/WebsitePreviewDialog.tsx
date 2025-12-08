'use client'

import { Button } from '@/components/ui/Button'

interface WebsitePreviewDialogProps {
  isOpen: boolean
  businessName: string
  discoveredWebsite: string
  confidence: 'high' | 'medium' | 'low'
  searchQuery?: string
  onConfirm: () => void
  onCancel: () => void
  onVisitWebsite: () => void
  isLoading?: boolean
}

export function WebsitePreviewDialog({
  isOpen,
  businessName,
  discoveredWebsite,
  confidence,
  searchQuery,
  onConfirm,
  onCancel,
  onVisitWebsite,
  isLoading = false
}: WebsitePreviewDialogProps) {
  if (!isOpen) return null

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel()
        }
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-slate-900">Confirm Website to Scrape</h3>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            title={isLoading ? "Close (scraping will continue in background)" : "Close"}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Business Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Business Name</label>
            <p className="text-sm text-slate-900 font-medium">{businessName}</p>
          </div>

          {/* Discovered Website */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Discovered Website</label>
            <div className="flex items-center space-x-2">
              <a
                href={discoveredWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline flex-1 truncate"
                onClick={(e) => e.stopPropagation()}
              >
                {discoveredWebsite}
              </a>
              <svg className="w-4 h-4 text-indigo-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </div>
          </div>

          {/* Confidence Badge */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Confidence</label>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${confidenceColors[confidence]}`}>
              {confidenceLabels[confidence]}
            </span>
          </div>

          {/* Search Query (if available) */}
          {searchQuery && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Search Query</label>
              <p className="text-xs text-slate-500 italic">{searchQuery}</p>
            </div>
          )}

          {/* Info Message */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-700">
              Please verify this is the correct website before proceeding with scraping. You can visit the website to confirm.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={onVisitWebsite}
            disabled={isLoading}
            className="flex-1"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Visit Website
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            title={isLoading ? "Close (scraping will continue in background)" : "Cancel"}
          >
            {isLoading ? "Close" : "Cancel"}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
            disabled={isLoading}
            className="flex-1"
          >
            OK / Confirm & Scrape
          </Button>
        </div>
      </div>
    </div>
  )
}

