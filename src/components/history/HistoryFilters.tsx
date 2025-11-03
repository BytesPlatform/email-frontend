'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { ClientHistoryFilters } from '@/types/history'

interface HistoryFiltersProps {
  filters: ClientHistoryFilters
  onFilterChange: (filters: Partial<ClientHistoryFilters>) => void
}

export function HistoryFilters({ filters, onFilterChange }: HistoryFiltersProps) {
  const handleStatusChange = (status: string) => {
    onFilterChange({ status: status as 'all' | 'success' | 'failed' })
  }

  const handleMethodChange = (method: string) => {
    onFilterChange({ method: method === 'all' ? undefined : method })
  }

  const handleDateFromChange = (date: string) => {
    onFilterChange({ dateFrom: date || undefined })
  }

  const handleDateToChange = (date: string) => {
    onFilterChange({ dateTo: date || undefined })
  }

  const handleBusinessNameChange = (name: string) => {
    onFilterChange({ businessName: name || undefined })
  }

  const clearFilters = () => {
    onFilterChange({
      status: 'all',
      method: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      businessName: undefined
    })
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-medium text-gray-900">Filters</h3>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filters.status || 'all'}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Method
            </label>
            <select
              value={filters.method || 'all'}
              onChange={(e) => handleMethodChange(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All Methods</option>
              <option value="direct_url">Direct URL</option>
              <option value="email_domain">Email Domain</option>
              <option value="business_search">Business Search</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Name
            </label>
            <input
              type="text"
              value={filters.businessName || ''}
              onChange={(e) => handleBusinessNameChange(e.target.value)}
              placeholder="Search business..."
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date From
            </label>
            <input
              type="date"
              value={filters.dateFrom || ''}
              onChange={(e) => handleDateFromChange(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date To
            </label>
            <input
              type="date"
              value={filters.dateTo || ''}
              onChange={(e) => handleDateToChange(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <Button
              onClick={clearFilters}
              variant="outline"
              className="w-full cursor-pointer"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
