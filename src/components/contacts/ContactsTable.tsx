import { ReactNode } from 'react'

import { Button } from '@/components/ui/Button'
import type { ClientContact } from '@/types/ingestion'

interface ValidityDisplay {
  label: string
  className: string
  reason?: string
}

interface PaginationInfo {
  page: number
  totalPages: number
  totalItems: number
  limit: number
}

interface ContactsTableProps {
  contacts: ClientContact[]
  isLoading: boolean
  error?: string | null
  emptyState?: ReactNode
  pagination?: PaginationInfo | null
  currentPage: number
  onPageChange: (page: number) => void
  selectedContactId: number | null
  onSelectContact: (id: number) => void
  getValidityDisplay: (contact: ClientContact) => ValidityDisplay
  selectedContactIds?: Set<number>
  onToggleContactSelection?: (id: number) => void
  showCheckboxes?: boolean
}

export function ContactsTable({
  contacts,
  isLoading,
  error,
  emptyState,
  pagination,
  currentPage,
  onPageChange,
  selectedContactId,
  onSelectContact,
  getValidityDisplay,
  selectedContactIds,
  onToggleContactSelection,
  showCheckboxes = false
}: ContactsTableProps) {
  const handlePrev = () => {
    if (!pagination) return
    onPageChange(Math.max(currentPage - 1, 1))
  }

  const handleNext = () => {
    if (!pagination) return
    onPageChange(Math.min(currentPage + 1, pagination.totalPages))
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              {showCheckboxes && (
                <th className="px-4 py-3 w-12">
                  <span className="sr-only">Select</span>
                </th>
              )}
              <th className="pl-3 pr-4 py-3">Business</th>
              <th className="px-4 py-3">State</th>
              <th className="px-4 py-3">Zip</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Website</th>
              <th className="px-4 py-3">Email</th>
              <th className="pl-4 pr-6 py-3">Validity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white text-sm">
            {isLoading && (
              <tr>
                <td colSpan={showCheckboxes ? 8 : 7} className="px-4 py-6 text-center text-slate-500">
                  Loading contacts…
                </td>
              </tr>
            )}

            {error && !isLoading && (
              <tr>
                <td colSpan={showCheckboxes ? 8 : 7} className="px-4 py-6 text-center text-rose-600">
                  {error}
                </td>
              </tr>
            )}

            {!isLoading && !error && contacts.length === 0 && (
              <tr>
                <td colSpan={showCheckboxes ? 8 : 7} className="px-4 py-6 text-center text-slate-500">
                  {emptyState || 'No contacts match the current filters.'}
                </td>
              </tr>
            )}

            {!isLoading &&
              !error &&
              contacts.map(contact => {
                const validity = getValidityDisplay(contact)
                const isSelected = selectedContactId === contact.id
                const isChecked = selectedContactIds?.has(contact.id) || false
                const isInvalid = validity.label === 'Invalid'
                return (
                  <tr
                    key={contact.id}
                    className={`transition-colors ${
                      isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    {showCheckboxes && (
                      <td className="px-4 py-3" onClick={event => event.stopPropagation()}>
                        {isInvalid ? (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => onToggleContactSelection?.(contact.id)}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            onClick={event => event.stopPropagation()}
                          />
                        ) : (
                          <span className="inline-block h-4 w-4" />
                        )}
                      </td>
                    )}
                    <td
                      className="pl-3 pr-4 py-3 cursor-pointer"
                      onClick={() => onSelectContact(contact.id)}
                    >
                      <div className="font-medium text-slate-900">
                        {contact.businessName || '—'}
                      </div>
                    </td>
                    <td
                      className="px-4 py-3 text-slate-600 cursor-pointer"
                      onClick={() => onSelectContact(contact.id)}
                    >
                      {contact.state || '—'}
                    </td>
                    <td
                      className="px-4 py-3 text-slate-600 cursor-pointer"
                      onClick={() => onSelectContact(contact.id)}
                    >
                      {contact.zipCode || '—'}
                    </td>
                    <td
                      className="px-4 py-3 text-slate-600 cursor-pointer"
                      onClick={() => onSelectContact(contact.id)}
                    >
                      {contact.phone || '—'}
                    </td>
                    <td
                      className="px-4 py-3 text-slate-600 cursor-pointer"
                      onClick={() => onSelectContact(contact.id)}
                    >
                      {contact.website ? (
                        <a
                          href={
                            contact.website.startsWith('http')
                              ? contact.website
                              : `https://${contact.website}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          onClick={event => event.stopPropagation()}
                          className="text-indigo-600 hover:underline"
                        >
                          {contact.website}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td
                      className="px-4 py-3 text-slate-600 cursor-pointer"
                      onClick={() => onSelectContact(contact.id)}
                    >
                      {contact.email || '—'}
                    </td>
                    <td
                      className="pl-4 pr-6 py-3 text-slate-600 cursor-pointer"
                      onClick={() => onSelectContact(contact.id)}
                    >
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${validity.className}`}
                        title={validity.reason}
                      >
                        {validity.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <div>
            Page {currentPage} of {pagination.totalPages} •{' '}
            {pagination.totalItems.toLocaleString()} contacts
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={currentPage <= 1 || isLoading}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              disabled={currentPage >= pagination.totalPages || isLoading}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

