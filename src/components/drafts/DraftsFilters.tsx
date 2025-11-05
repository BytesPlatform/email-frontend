'use client'

import React from 'react'

interface DraftsFiltersProps {
  type: 'email' | 'sms'
  filters: {
    status?: string
    search?: string
  }
  onFilterChange: (filters: { status?: string; search?: string }) => void
}

export function DraftsFilters({ type, filters, onFilterChange }: DraftsFiltersProps) {
  const handleStatusChange = (status: string) => {
    onFilterChange({ ...filters, status: status === 'all' ? undefined : status })
  }

  const handleSearchChange = (search: string) => {
    onFilterChange({ ...filters, search: search || undefined })
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <input
          type="text"
          placeholder={`Search ${type === 'email' ? 'email' : 'SMS'} drafts...`}
          value={filters.search || ''}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>
      
      <select
        value={filters.status || 'all'}
        onChange={(e) => handleStatusChange(e.target.value)}
        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
      >
        <option value="all">All Status</option>
        <option value="draft">Draft</option>
        <option value="sent">Sent</option>
        <option value="delivered">Delivered</option>
      </select>
    </div>
  )
}

