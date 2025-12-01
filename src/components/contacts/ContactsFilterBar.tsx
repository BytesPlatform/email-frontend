import { ChangeEvent } from 'react'

import { Button } from '@/components/ui/Button'

type ValidityFilter = 'all' | 'valid' | 'invalid'

type SearchField = 'all' | 'businessName' | 'email' | 'website'

interface ContactsFilterBarProps {
  validityFilter: ValidityFilter
  onValidityChange: (value: ValidityFilter) => void
  searchValue: string
  onSearchChange: (value: string) => void
  searchField: SearchField
  onSearchFieldChange: (value: SearchField) => void
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

const searchFieldOptions: Array<{ label: string; value: SearchField }> = [
  { label: 'All Fields', value: 'all' },
  { label: 'Business Name', value: 'businessName' },
  { label: 'Email', value: 'email' },
  { label: 'Website', value: 'website' }
]

const getSearchPlaceholder = (field: SearchField): string => {
  switch (field) {
    case 'businessName':
      return 'Search by business name'
    case 'email':
      return 'Search by email address'
    case 'website':
      return 'Search by website URL'
    default:
      return 'Search by business, email, or website'
  }
}

export function ContactsFilterBar({
  validityFilter,
  onValidityChange,
  searchValue,
  onSearchChange,
  searchField,
  onSearchFieldChange,
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

      <div className="grid gap-3 md:grid-cols-4 md:items-end">
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Search
          </label>
          <input
            type="text"
            placeholder={getSearchPlaceholder(searchField)}
            value={searchValue}
            onChange={handleSearchChange}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 h-[38px]"
          />
        </div>
        <div className="md:col-span-1">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Search By
          </label>
          <select
            value={searchField}
            onChange={event => onSearchFieldChange(event.target.value as SearchField)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 h-[38px]"
          >
            {searchFieldOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
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
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 h-[38px]"
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

