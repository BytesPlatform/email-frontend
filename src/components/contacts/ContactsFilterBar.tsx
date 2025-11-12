import { ChangeEvent } from 'react'

import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

type ValidityFilter = 'all' | 'valid' | 'invalid'

interface ContactsFilterBarProps {
  validityFilter: ValidityFilter
  onValidityChange: (value: ValidityFilter) => void
  statusFilter: string
  onStatusChange: (value: string) => void
  statusOptions: string[]
  searchValue: string
  onSearchChange: (value: string) => void
  perPage: number
  onPerPageChange: (value: number) => void
  perPageOptions: number[]
  totalCount: number
  validCount: number
  invalidCount: number
}

const validityOptions: Array<{ label: string; value: ValidityFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Valid', value: 'valid' },
  { label: 'Invalid', value: 'invalid' }
]

export function ContactsFilterBar({
  validityFilter,
  onValidityChange,
  statusFilter,
  onStatusChange,
  statusOptions,
  searchValue,
  onSearchChange,
  perPage,
  onPerPageChange,
  perPageOptions,
  totalCount,
  validCount,
  invalidCount
}: ContactsFilterBarProps) {
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSearchChange(event.target.value)
  }

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Contacts</h2>
          <p className="text-sm text-slate-500">
            {totalCount.toLocaleString()} total • {validCount.toLocaleString()} valid •{' '}
            {invalidCount.toLocaleString()} invalid
          </p>
        </div>

        <div className="flex items-center gap-2">
          {validityOptions.map(option => (
            <Button
              key={option.value}
              variant={validityFilter === option.value ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => onValidityChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="md:col-span-2">
          <Input
            placeholder="Search by business, email, or website"
            value={searchValue}
            onChange={handleSearchChange}
            size="sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={event => onStatusChange(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All statuses</option>
            {statusOptions.map(status => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Rows per page
          </label>
          <select
            value={perPage}
            onChange={event => onPerPageChange(Number(event.target.value))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {perPageOptions.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}

