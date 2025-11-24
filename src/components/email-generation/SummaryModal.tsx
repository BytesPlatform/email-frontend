'use client'

import React from 'react'
import type { BusinessSummary } from '@/types/emailGeneration'

interface SummaryModalProps {
  isOpen: boolean
  summary: BusinessSummary | null
  businessName?: string
  onClose: () => void
}

export const SummaryModal: React.FC<SummaryModalProps> = ({
  isOpen,
  summary,
  businessName,
  onClose,
}) => {
  if (!isOpen || !summary) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-gray-200 transform transition-transform overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-semibold text-lg">
                {(businessName || summary.businessName || 'B')?.[0]?.toUpperCase() || 'B'}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {businessName || summary.businessName || 'Business Summary'}
              </h2>
              <p className="text-sm text-gray-500">Contact ID: {summary.contactId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Scraped Data Info */}
          {summary.scrapedData && (
            <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-1">Scraped Data</h3>
                  <a 
                    href={summary.scrapedData.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline"
                  >
                    {summary.scrapedData.url}
                  </a>
                  <p className="text-xs text-slate-500 mt-1">
                    Scraped: {new Date(summary.scrapedData.scrapedAt).toLocaleString()}
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  summary.scrapedData.scrapeSuccess 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {summary.scrapedData.scrapeSuccess ? 'Success' : 'Failed'}
                </div>
              </div>
            </div>
          )}

          {/* Summary Text */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Summary</h3>
            <p className="text-gray-700 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200">
              {summary.summaryText}
            </p>
          </div>

          {/* Pain Points */}
          {summary.painPoints && summary.painPoints.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Pain Points
              </h3>
              <ul className="space-y-2">
                {summary.painPoints.map((point, index) => (
                  <li key={index} className="flex items-start text-gray-700 bg-red-50 p-3 rounded-lg border border-red-100">
                    <span className="text-red-500 mr-2 mt-1">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Strengths */}
          {summary.strengths && summary.strengths.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Strengths
              </h3>
              <ul className="space-y-2">
                {summary.strengths.map((strength, index) => (
                  <li key={index} className="flex items-start text-gray-700 bg-green-50 p-3 rounded-lg border border-green-100">
                    <span className="text-green-500 mr-2 mt-1">•</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Opportunities */}
          {summary.opportunities && summary.opportunities.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Opportunities
              </h3>
              <ul className="space-y-2">
                {summary.opportunities.map((opportunity, index) => (
                  <li key={index} className="flex items-start text-gray-700 bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <span className="text-blue-500 mr-2 mt-1">•</span>
                    <span>{opportunity}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Keywords */}
          {/* {summary.keywords && summary.keywords.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Keywords</h3>
              <div className="flex flex-wrap gap-2">
                {summary.keywords.map((keyword, index) => (
                  <span 
                    key={index}
                    className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )} */}

          {/* AI Model & Metadata */}
          {/* <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center space-x-4">
                {summary.aiModel && (
                  <span>AI Model: <span className="font-medium text-gray-700">{summary.aiModel}</span></span>
                )}
                {summary.createdAt && (
                  <span>Created: <span className="font-medium text-gray-700">{new Date(summary.createdAt).toLocaleString()}</span></span>
                )}
              </div>
              {summary.updatedAt && (
                <span>Updated: <span className="font-medium text-gray-700">{new Date(summary.updatedAt).toLocaleString()}</span></span>
              )}
            </div>
          </div> */}
        </div>
      </div>
    </div>
  )
}

