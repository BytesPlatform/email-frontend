'use client'

import React from 'react'

interface HistoryFiltersProps {
  search: string
  onSearchChange: (search: string) => void
  dateRange: 'all' | 'today' | 'week' | 'month'
  onDateRangeChange: (range: 'all' | 'today' | 'week' | 'month') => void
}

export function HistoryFilters({
  search,
  onSearchChange,
  dateRange,
  onDateRangeChange,
}: HistoryFiltersProps) {
  return (
    <>
      {/* Search Bar */}
      <div className="flex-1 relative max-w-2xl">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search history..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
        />
        <button
          className="absolute inset-y-0 right-0 pr-3 flex items-center"
          title="Show search options"
        >
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        </button>
      </div>
      {/* Date Range Dropdown */}
      <div className="relative">
        <select
          value={dateRange}
          onChange={(e) => onDateRangeChange(e.target.value as 'all' | 'today' | 'week' | 'month')}
          className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2.5 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </>
  )
}
