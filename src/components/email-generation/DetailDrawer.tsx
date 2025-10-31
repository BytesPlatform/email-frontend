import React from 'react'
import type { ScrapedRecord } from '@/types/emailGeneration'

interface DetailDrawerProps {
  isOpen: boolean
  record: ScrapedRecord | null
  viewMode?: 'full' | 'summary-only' // Made optional since it's not used yet
  onClose: () => void
  children?: React.ReactNode
}

export const DetailDrawer: React.FC<DetailDrawerProps> = ({
  isOpen,
  record,
  viewMode,
  onClose,
  children,
}) => {
  if (!isOpen || !record) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="relative w-full max-w-5xl h-[85vh] bg-white rounded-2xl shadow-2xl border border-gray-200 transform transition-transform overflow-hidden">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 rounded-t-2xl flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-semibold text-lg">
                  {record.businessName?.[0]?.toUpperCase() || 'B'}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {record.businessName || 'Unknown Business'}
                </h2>
                <p className="text-sm text-gray-500">Contact ID: {record.contactId}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-b from-gray-200 to-transparent z-10 pointer-events-none"></div>
            <div className="h-full p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
