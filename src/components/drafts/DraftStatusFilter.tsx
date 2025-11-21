'use client'

import React, { useState, useRef, useEffect } from 'react'

interface DraftDateFilterProps {
  dateRange: 'all' | 'today' | 'week' | 'month'
  onDateRangeChange: (range: 'all' | 'today' | 'week' | 'month') => void
}

const dateRangeOptions = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
] as const

export function DraftStatusFilter({
  dateRange,
  onDateRangeChange,
}: DraftDateFilterProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  const selectedOption = dateRangeOptions.find(opt => opt.value === dateRange) || dateRangeOptions[0]

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center justify-between gap-2 bg-white border border-gray-300 rounded-lg px-4 py-2.5 min-w-[140px] text-sm text-gray-700 hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
      >
        <span className="font-medium">{selectedOption.label}</span>
        <svg
          className={`h-4 w-4 text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-full min-w-[140px] bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
          {dateRangeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onDateRangeChange(option.value)
                setIsDropdownOpen(false)
              }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                dateRange === option.value
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{option.label}</span>
                {dateRange === option.value && (
                  <svg className="h-4 w-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

