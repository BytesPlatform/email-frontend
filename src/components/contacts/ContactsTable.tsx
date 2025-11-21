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
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
      <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <table className="w-full divide-y divide-slate-200 table-fixed">
          <colgroup>
            {showCheckboxes && <col style={{ width: '40px' }} />}
            <col style={{ width: '18%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '12%' }} />
          </colgroup>
          <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
            <tr>
              {showCheckboxes && (
                <th className="px-4 py-4">
                  <span className="sr-only">Select</span>
                </th>
              )}
              <th className="px-3 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-700">
                Business
              </th>
              <th className="px-2 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-700">
                State
              </th>
              <th className="px-2 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-700">
                Zip
              </th>
              <th className="px-2 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-700">
                Phone
              </th>
              <th className="px-2 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-700">
                Website
              </th>
              <th className="px-3 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-700">
                Email
              </th>
              <th className="px-3 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-700">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {isLoading && (
              <>
                {[...Array(10)].map((_, index) => (
                  <tr key={`skeleton-${index}`} className="animate-pulse">
                    {showCheckboxes && (
                      <td className="px-3 py-4">
                        <div className="h-4 w-4 bg-slate-200 rounded"></div>
                      </td>
                    )}
                    <td className="px-3 py-4">
                      <div className="h-5 bg-slate-200 rounded w-3/4"></div>
                    </td>
                    <td className="px-2 py-4">
                      <div className="h-6 bg-slate-200 rounded-full w-16"></div>
                    </td>
                    <td className="px-2 py-4">
                      <div className="h-4 bg-slate-200 rounded w-12"></div>
                    </td>
                    <td className="px-2 py-4">
                      <div className="h-4 bg-slate-200 rounded w-24"></div>
                    </td>
                    <td className="px-2 py-4">
                      <div className="h-4 bg-slate-200 rounded w-32"></div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="h-4 bg-slate-200 rounded w-40"></div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="h-6 bg-slate-200 rounded-full w-20"></div>
                    </td>
                  </tr>
                ))}
              </>
            )}

            {error && !isLoading && (
              <tr>
                <td colSpan={showCheckboxes ? 8 : 7} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <svg className="w-12 h-12 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm font-semibold text-rose-600">{error}</p>
                  </div>
                </td>
              </tr>
            )}

            {!isLoading && !error && contacts.length === 0 && (
              <tr>
                <td colSpan={showCheckboxes ? 8 : 7} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p className="text-sm text-slate-500 font-medium">
                      {emptyState || 'No contacts match the current filters.'}
                    </p>
                  </div>
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
                    className={`transition-all duration-150 ${
                      isSelected 
                        ? 'bg-indigo-50 border-l-4 border-l-indigo-500 shadow-sm' 
                        : isChecked
                        ? 'bg-blue-50/50 hover:bg-blue-50'
                        : 'hover:bg-slate-50 hover:shadow-sm'
                    }`}
                  >
                    {showCheckboxes && (
                      <td className="px-3 py-4" onClick={event => event.stopPropagation()}>
                        {isInvalid ? (
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => onToggleContactSelection?.(contact.id)}
                              onClick={event => event.stopPropagation()}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 cursor-pointer transition-all"
                            />
                          </label>
                        ) : (
                          <span className="inline-block h-4 w-4" />
                        )}
                      </td>
                    )}
                    <td
                      className="px-3 py-4 cursor-pointer group"
                      onClick={() => onSelectContact(contact.id)}
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                          {contact.businessName || '—'}
                        </div>
                        {isSelected && (
                          <svg className="w-4 h-4 text-indigo-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </td>
                    <td
                      className="px-2 py-4 text-slate-700 cursor-pointer"
                      onClick={() => onSelectContact(contact.id)}
                    >
                      {contact.state ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                          {contact.state}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td
                      className="px-2 py-4 text-slate-600 cursor-pointer text-sm"
                      onClick={() => onSelectContact(contact.id)}
                    >
                      {contact.zipCode ? (() => {
                        const zipStr = String(contact.zipCode)
                        // Remove trailing .0 if present (e.g., "2138.0" -> "2138")
                        return zipStr.replace(/\.0+$/, '')
                      })() : <span className="text-slate-400">—</span>}
                    </td>
                    <td
                      className="px-2 py-4 cursor-pointer"
                      onClick={() => onSelectContact(contact.id)}
                    >
                      {contact.phone ? (
                        <div className="flex items-center space-x-1.5 text-slate-700 min-w-0">
                          <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span className="text-sm truncate">{contact.phone}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td
                      className="px-2 py-4 cursor-pointer"
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
                          className="flex items-center space-x-1.5 text-indigo-600 hover:text-indigo-700 hover:underline transition-colors group min-w-0"
                        >
                          <svg className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          <span className="text-sm truncate">{contact.website}</span>
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td
                      className="px-3 py-4 cursor-pointer"
                      onClick={() => onSelectContact(contact.id)}
                    >
                      {contact.email ? (
                        <div className="flex items-center space-x-1.5 text-slate-700 min-w-0">
                          <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm truncate">{contact.email}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td
                      className="px-3 py-4 cursor-pointer"
                      onClick={() => onSelectContact(contact.id)}
                    >
                      <span
                        className={`inline-flex items-center rounded-full border-2 px-2.5 py-1 text-xs font-semibold shadow-sm whitespace-nowrap ${validity.className}`}
                        title={validity.reason}
                      >
                        {validity.label === 'Valid' && (
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                        {validity.label === 'Invalid' && (
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        )}
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
        <div className="flex items-center justify-between border-t border-slate-200 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
          <div className="flex items-center space-x-2 text-sm text-slate-600">
            <span className="font-medium">
              Page {currentPage} of {pagination.totalPages}
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500">
              {pagination.totalItems.toLocaleString()} total contacts
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={currentPage <= 1 || isLoading}
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              }
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              disabled={currentPage >= pagination.totalPages || isLoading}
              rightIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              }
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

