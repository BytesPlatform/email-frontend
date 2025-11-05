'use client'

import React from 'react'

interface DraftsToggleProps {
  activeTab: 'email' | 'sms'
  onTabChange: (tab: 'email' | 'sms') => void
  emailCount?: number
  smsCount?: number
}

export function DraftsToggle({ activeTab, onTabChange, emailCount = 0, smsCount = 0 }: DraftsToggleProps) {
  return (
    <div className="inline-flex items-center bg-gray-100 rounded-lg p-0.5">
      <button
        onClick={() => onTabChange('email')}
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
          activeTab === 'email'
            ? 'bg-white text-indigo-700 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <span className="flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span>Email</span>
          {emailCount > 0 && (
            <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full text-xs font-semibold">
              {emailCount}
            </span>
          )}
        </span>
      </button>
      
      <button
        onClick={() => onTabChange('sms')}
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
          activeTab === 'sms'
            ? 'bg-white text-indigo-700 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <span className="flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>SMS</span>
          {smsCount > 0 && (
            <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full text-xs font-semibold">
              {smsCount}
            </span>
          )}
        </span>
      </button>
    </div>
  )
}

