'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

import { AuthGuard } from '@/components/auth/AuthGuard'
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ingestionApi } from '@/api/ingestion'
import type {
  ClientContact,
  ClientContactsListResponse,
  ClientContactsMeta,
  ClientContactsQuery
} from '@/types/ingestion'
import { useAuthContext } from '@/contexts/AuthContext'
import { ContactsFilterBar } from '@/components/contacts/ContactsFilterBar'
import { ContactsTable } from '@/components/contacts/ContactsTable'
import { ContactModal } from '@/components/contacts/ContactModal'

type ValidityFilter = 'all' | 'valid' | 'invalid'

const limitOptions = [10, 25, 50, 100]

const formatDateTime = (value?: string) => {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString()
  } catch (error) {
    return value
  }
}

const deriveContactValidity = (contact: ClientContact) => {
  if (typeof contact.computedValid === 'boolean') {
    return {
      isValid: contact.computedValid,
      reason:
        contact.computedValidationReason ||
        contact.validationReason ||
        (contact.computedValid
          ? 'Marked as valid by ingestion service'
          : 'Marked as invalid by ingestion service')
    }
  }

  if (typeof contact.valid === 'boolean') {
    return {
      isValid: contact.valid,
      reason:
        contact.validationReason ||
        (contact.valid ? 'Contact flagged as valid' : 'Contact flagged as invalid')
    }
  }

  const emailValid = contact.emailValid === true
  const hasEmail = Boolean(contact.email?.trim())
  const hasPhone = Boolean(contact.phone?.trim())

  if (emailValid && hasPhone) {
    return {
      isValid: true,
      reason: 'Valid email and phone number present'
    }
  }

  if (emailValid) {
    return {
      isValid: true,
      reason: 'Valid email address present'
    }
  }

  if (hasPhone) {
    return {
      isValid: true,
      reason: 'Phone number present (email not validated)'
    }
  }

  if (!hasEmail && !hasPhone) {
    return {
      isValid: false,
      reason: contact.validationReason || 'Missing email address and phone number'
    }
  }

  return {
    isValid: false,
    reason: contact.validationReason || 'Missing validated contact information'
  }
}

const getValidityDisplay = (contact: ClientContact) => {
  const validity = deriveContactValidity(contact)

  if (validity.isValid === true) {
    return {
      label: 'Valid',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      reason: validity.reason
    }
  }

  if (validity.isValid === false) {
    return {
      label: 'Invalid',
      className: 'bg-rose-50 text-rose-700 border-rose-200',
      reason: validity.reason
    }
  }

  return {
    label: 'Unknown',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
    reason: validity.reason
  }
}

export default function ContactsPage() {
  const { client } = useAuthContext()

  const [contacts, setContacts] = useState<ClientContact[]>([])
  const [meta, setMeta] = useState<ClientContactsMeta | null>(null)
  const [query, setQuery] = useState<ClientContactsQuery>({ page: 1, limit: 10 })
  const [validityFilter, setValidityFilter] = useState<ValidityFilter>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchInput, setSearchInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedContactId, setSelectedContactId] = useState<number | null>(null)
  const [selectedContact, setSelectedContact] = useState<ClientContact | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [isSavingContact, setIsSavingContact] = useState(false)
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [editSuccess, setEditSuccess] = useState<string | null>(null)
  const [selectedContactIds, setSelectedContactIds] = useState<Set<number>>(new Set())
  const [bulkContactData, setBulkContactData] = useState<Map<number, { email: string; phone: string }>>(new Map())
  const [isBulkSaving, setIsBulkSaving] = useState(false)
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [bulkResult, setBulkResult] = useState<{ updated: number; failed: number } | null>(null)

  const filteredContacts = useMemo(() => {
    if (validityFilter === 'all') {
      return contacts
    }

    return contacts.filter(contact => {
      const validity = deriveContactValidity(contact)
      if (validityFilter === 'valid') {
        return validity.isValid === true
      }
      return validity.isValid === false
    })
  }, [contacts, validityFilter])

  const currentValidOnPage = useMemo(
    () =>
      contacts.filter(contact => deriveContactValidity(contact).isValid === true).length,
    [contacts]
  )

  const currentInvalidOnPage = useMemo(
    () =>
      contacts.filter(contact => deriveContactValidity(contact).isValid === false).length,
    [contacts]
  )

  const selectedContactValidity = useMemo(
    () => (selectedContact ? getValidityDisplay(selectedContact) : null),
    [selectedContact]
  )

  const hasValidBulkSelection = useMemo(() => {
    if (selectedContactIds.size === 0) return false
    for (const id of selectedContactIds) {
      const data = bulkContactData.get(id)
      if (data && (data.email.trim() !== '' || data.phone.trim() !== '')) {
        return true
      }
    }
    return false
  }, [selectedContactIds.size, bulkContactData])

  const statusOptions = useMemo(() => {
    const uniqueStatuses = new Set<string>()
    contacts.forEach(contact => {
      if (contact.status) {
        uniqueStatuses.add(contact.status)
      }
    })
    return Array.from(uniqueStatuses).sort((a, b) => a.localeCompare(b))
  }, [contacts])

  // Remove valid contacts from selection (only invalid contacts can be selected)
  useEffect(() => {
    setSelectedContactIds(prev => {
      const invalidIds = new Set<number>()
      prev.forEach(id => {
        const contact = contacts.find(c => c.id === id)
        if (contact) {
          const validity = deriveContactValidity(contact)
          if (validity.isValid === false) {
            invalidIds.add(id)
          }
        }
      })
      return invalidIds
    })
    
    // Also clean up contact data for valid contacts
    setBulkContactData(prev => {
      const next = new Map(prev)
      prev.forEach((_, id) => {
        const contact = contacts.find(c => c.id === id)
        if (contact) {
          const validity = deriveContactValidity(contact)
          if (validity.isValid === true) {
            next.delete(id)
          }
        }
      })
      return next
    })
  }, [contacts])

  useEffect(() => {
    const nextStatus = statusFilter === 'all' ? undefined : statusFilter
    setQuery(prev => {
      if (prev.status === nextStatus && prev.page === 1) {
        return prev
      }
      return {
        ...prev,
        page: 1,
        status: nextStatus
      }
    })
  }, [statusFilter])

  useEffect(() => {
    const nextValidOnly = validityFilter === 'valid' ? true : undefined
    const nextInvalidOnly = validityFilter === 'invalid' ? true : undefined

    setQuery(prev => {
      if (
        prev.validOnly === nextValidOnly &&
        prev.invalidOnly === nextInvalidOnly &&
        prev.page === 1
      ) {
        return prev
      }

      return {
        ...prev,
        page: 1,
        validOnly: nextValidOnly,
        invalidOnly: nextInvalidOnly
      }
    })
  }, [validityFilter])

  useEffect(() => {
    const handler = setTimeout(() => {
      const trimmed = searchInput.trim()
      const nextSearch = trimmed.length > 0 ? trimmed : undefined
      setQuery(prev => {
        if (prev.search === nextSearch && prev.page === 1) {
          return prev
        }
        return {
          ...prev,
          page: 1,
          search: nextSearch
        }
      })
    }, 400)

    return () => {
      clearTimeout(handler)
    }
  }, [searchInput])

  useEffect(() => {
    let ignore = false

    const fetchContacts = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await ingestionApi.listContacts(query)
        if (!ignore) {
          if (response.success && response.data) {
            const payload = response.data as ClientContactsListResponse
            setContacts(payload.data)
            setMeta(payload.meta)
          } else {
            setContacts([])
            setMeta(null)
            setError(response.error || 'Failed to load contacts')
          }
        }
      } catch (fetchError) {
        if (!ignore) {
          setContacts([])
          setMeta(null)
          setError(fetchError instanceof Error ? fetchError.message : 'Failed to load contacts')
        }
      } finally {
        if (!ignore) {
          setIsLoading(false)
        }
      }
    }

    fetchContacts()

    return () => {
      ignore = true
    }
  }, [query])

  const handleLimitChange = (value: number) => {
    setQuery(prev => {
      if (prev.limit === value && prev.page === 1) {
        return prev
      }
      return {
        ...prev,
        page: 1,
        limit: value
      }
    })
  }

  const handlePageChange = (page: number) => {
    setQuery(prev => {
      if (prev.page === page) {
        return prev
      }
      return {
        ...prev,
        page
      }
    })
  }

  const handleSelectContact = async (contactId: number) => {
    if (selectedContactId === contactId) {
      return
    }

    setSelectedContactId(contactId)
    setSelectedContact(null)
    setDetailError(null)
    setIsLoadingDetail(true)

    try {
      const response = await ingestionApi.getContactById(contactId)
      if (response.success && response.data) {
        const contact = response.data
        setSelectedContact(contact)
        setEditEmail(contact.email || '')
        setEditPhone(contact.phone || '')
        setEditError(null)
        setEditSuccess(null)
      } else {
        setDetailError(response.error || 'Unable to load contact details')
      }
    } catch (detailErr) {
      setDetailError(detailErr instanceof Error ? detailErr.message : 'Unable to load contact details')
    } finally {
      setIsLoadingDetail(false)
    }
  }

  const handleClearSelection = () => {
    setSelectedContactId(null)
    setSelectedContact(null)
    setDetailError(null)
    setEditEmail('')
    setEditPhone('')
    setEditError(null)
    setEditSuccess(null)
  }

  const handleSaveContact = async () => {
    if (!selectedContactId) {
      setEditError('Select a contact first.')
      return
    }

    const trimmedEmail = editEmail.trim()
    const trimmedPhone = editPhone.trim()

    if (!trimmedEmail && !trimmedPhone) {
      setEditError('Please provide at least an email address or phone number.')
      return
    }

    setIsSavingContact(true)
    setEditError(null)
    setEditSuccess(null)

    try {
      const payload = {
        email: trimmedEmail || null,
        phone: trimmedPhone || null
      }

      const response = await ingestionApi.updateContact(selectedContactId, payload)
      if (!response.success || !response.data || !response.data.contact) {
        setEditError(response.error || 'Unable to update contact. Please try again.')
        return
      }

      const updatedContact = response.data.contact
      if (!updatedContact || typeof updatedContact.id !== 'number') {
        setEditError('Contact updated but response was missing contact details.')
        return
      }

      setContacts(prev => {
        if (!Array.isArray(prev) || prev.length === 0) {
          return prev
        }
        return prev.map(contact =>
          contact.id === updatedContact.id ? updatedContact : contact
        )
      })
      setSelectedContact(updatedContact)
      setEditSuccess(response.data.message || 'Contact updated successfully.')
    } catch (error) {
      setEditError(
        error instanceof Error ? error.message : 'Unable to update contact. Please try again.'
      )
    } finally {
      setIsSavingContact(false)
    }
  }

  const handleToggleContactSelection = (contactId: number) => {
    // Only allow selecting invalid contacts
    const contact = contacts.find(c => c.id === contactId)
    if (!contact) return
    
    const validity = deriveContactValidity(contact)
    if (validity.isValid === true) {
      // Don't allow selecting valid contacts
      return
    }

    setSelectedContactIds(prev => {
      const next = new Set(prev)
      if (next.has(contactId)) {
        next.delete(contactId)
        // Remove contact data when deselected
        setBulkContactData(prevData => {
          const nextData = new Map(prevData)
          nextData.delete(contactId)
          return nextData
        })
      } else {
        next.add(contactId)
        // Initialize contact data with existing email/phone
        setBulkContactData(prevData => {
          const nextData = new Map(prevData)
          nextData.set(contactId, {
            email: contact.email || '',
            phone: contact.phone || ''
          })
          return nextData
        })
      }
      return next
    })
  }

  const handleSelectAllInvalid = () => {
    const invalidIds = new Set<number>()
    const contactDataMap = new Map<number, { email: string; phone: string }>()
    
    filteredContacts.forEach(contact => {
      const validity = deriveContactValidity(contact)
      if (validity.isValid === false) {
        invalidIds.add(contact.id)
        contactDataMap.set(contact.id, {
          email: contact.email || '',
          phone: contact.phone || ''
        })
      }
    })
    
    setSelectedContactIds(invalidIds)
    setBulkContactData(contactDataMap)
  }

  const handleClearBulkSelection = () => {
    setSelectedContactIds(new Set())
    setBulkContactData(new Map())
    setBulkError(null)
    setBulkResult(null)
  }

  const handleSubmitBulkUpdates = async () => {
    if (selectedContactIds.size === 0) {
      setBulkError('Please select at least one contact.')
      return
    }

    // Build payload from contact data map
    const contactsPayload = Array.from(selectedContactIds)
      .map(id => {
        const data = bulkContactData.get(id)
        if (!data) return null
        
        const trimmedEmail = data.email.trim()
        const trimmedPhone = data.phone.trim()
        
        // Only include if at least one field has a value
        if (!trimmedEmail && !trimmedPhone) return null
        
        return {
          id,
          email: trimmedEmail || null,
          phone: trimmedPhone || null
        }
      })
      .filter((item): item is { id: number; email: string | null; phone: string | null } => item !== null)

    if (contactsPayload.length === 0) {
      setBulkError('Please provide at least an email address or phone number for at least one contact.')
      return
    }

    setIsBulkSaving(true)
    setBulkError(null)
    setBulkResult(null)

    try {
      const response = await ingestionApi.bulkUpdateContacts({ contacts: contactsPayload })
      if (!response.success || !response.data) {
        setBulkError(response.error || 'Failed to update contacts. Please try again.')
        return
      }

      const { updated, failed } = response.data

      const safeUpdated = Array.isArray(updated)
        ? updated.filter((contact): contact is ClientContact => Boolean(contact && contact.id))
        : []
      const safeFailed = Array.isArray(failed)
        ? failed.filter(
            (item): item is { id: number; error: string } =>
              Boolean(item && typeof item.id === 'number' && item.error)
          )
        : []

      if (safeUpdated.length > 0) {
        setContacts(prev => {
          if (!prev.length) return prev
          const lookup = new Map(safeUpdated.map(contact => [contact.id, contact]))
          return prev.map(contact => lookup.get(contact.id) ?? contact)
        })
      }

      if (
        selectedContact &&
        safeUpdated.some(contact => contact.id === selectedContact.id)
      ) {
        const refreshed = safeUpdated.find(contact => contact.id === selectedContact.id)
        if (refreshed) {
          setSelectedContact(refreshed)
          setEditEmail(refreshed.email || '')
          setEditPhone(refreshed.phone || '')
          setEditSuccess('Contact updated successfully.')
          setEditError(null)
        }
      }

      if (safeFailed.length > 0) {
        const failureSummary = safeFailed
          .slice(0, 5)
          .map(item => `#${item.id}: ${item.error}`)
          .join(', ')
        setBulkError(
          safeFailed.length > 5
            ? `${failureSummary}, and ${safeFailed.length - 5} more.`
            : failureSummary
        )
      } else {
        setBulkError(null)
        // Clear selection and form on success
        setSelectedContactIds(new Set())
        setBulkContactData(new Map())
      }

      setBulkResult({ updated: safeUpdated.length, failed: safeFailed.length })
    } catch (error) {
      setBulkError(
        error instanceof Error ? error.message : 'Failed to update contacts. Please try again.'
      )
    } finally {
      setIsBulkSaving(false)
    }
  }

  return (
    <AuthGuard>
      <div className="bg-gray-50 min-h-screen">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 pb-24">
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <Link
                    href="/dashboard"
                    className="text-white/80 hover:text-white text-sm mb-2 inline-flex items-center cursor-pointer"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Dashboard
                  </Link>
                  <h1 className="text-3xl font-bold mb-2">Contacts</h1>
                  <p className="text-indigo-100 text-lg">
                    Review and manage all contacts processed from your CSV uploads.
                  </p>
                </div>
                <div className="hidden md:block">
                  <div className="h-20 w-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                </div>
              </div>
              {client?.name && (
                <p className="text-sm text-white/70 mt-4">
                  Signed in as <span className="font-semibold text-white">{client.name}</span>
                </p>
              )}
            </div>

            {meta && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl shadow-md border border-indigo-100 p-5">
                  <p className="text-sm text-slate-500">Total Contacts</p>
                  <p className="text-2xl font-semibold text-indigo-700 mt-1">{meta.total.toLocaleString()}</p>
                  <p className="text-xs text-slate-400 mt-2">
                    Across {meta.totalPages.toLocaleString()} page{meta.totalPages === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="bg-white rounded-xl shadow-md border border-emerald-100 p-5">
                  <p className="text-sm text-slate-500">Valid on This Page</p>
                  <p className="text-2xl font-semibold text-emerald-600 mt-1">{currentValidOnPage}</p>
                  <p className="text-xs text-slate-400 mt-2">Contacts marked as valid in the current results</p>
                </div>
                <div className="bg-white rounded-xl shadow-md border border-rose-100 p-5">
                  <p className="text-sm text-slate-500">Invalid on This Page</p>
                  <p className="text-2xl font-semibold text-rose-600 mt-1">{currentInvalidOnPage}</p>
                  <p className="text-xs text-slate-400 mt-2">Contacts that require review or corrections</p>
                </div>
              </div>
            )}

            <div className="space-y-6">
              <Card variant="filled" hover>
                <CardHeader
                  title="Contacts"
                  subtitle="Browse, filter, and inspect the contacts generated from your ingestion pipeline."
                >
                  <ContactsFilterBar
                    validityFilter={validityFilter}
                    onValidityChange={setValidityFilter}
                    statusFilter={statusFilter}
                    onStatusChange={setStatusFilter}
                    statusOptions={statusOptions}
                    searchValue={searchInput}
                    onSearchChange={setSearchInput}
                    perPage={query.limit || 10}
                    onPerPageChange={handleLimitChange}
                    perPageOptions={limitOptions}
                    totalCount={meta?.total || 0}
                    validCount={currentValidOnPage}
                    invalidCount={currentInvalidOnPage}
                  />
                </CardHeader>

                <CardContent className="space-y-4">
                  <ContactsTable
                    contacts={filteredContacts}
                    isLoading={isLoading}
                    error={error}
                    selectedContactId={selectedContactId}
                    onSelectContact={handleSelectContact}
                    getValidityDisplay={getValidityDisplay}
                    currentPage={query.page || 1}
                    onPageChange={handlePageChange}
                    pagination={meta ? {
                      page: meta.page,
                      totalPages: meta.totalPages,
                      totalItems: meta.total,
                      limit: meta.limit
                    } : null}
                    selectedContactIds={selectedContactIds}
                    onToggleContactSelection={handleToggleContactSelection}
                    showCheckboxes={true}
                  />
                </CardContent>
              </Card>

              <Card variant="filled">
                <CardHeader
                  title="Bulk Fix Contacts"
                  subtitle="Select contacts from the table above, then add email or phone for each contact individually."
                />
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-700">
                        {selectedContactIds.size} contact{selectedContactIds.size !== 1 ? 's' : ''} selected
                      </span>
                      {selectedContactIds.size > 0 && (
                        <Button variant="ghost" size="sm" onClick={handleClearBulkSelection}>
                          Clear selection
                        </Button>
                      )}
                    </div>
                    <Button variant="outline" size="sm" onClick={handleSelectAllInvalid}>
                      Select All Invalid
                    </Button>
                  </div>

                  {selectedContactIds.size > 0 && (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {Array.from(selectedContactIds).map(contactId => {
                        const contact = contacts.find(c => c.id === contactId)
                        const contactData = bulkContactData.get(contactId) || { email: '', phone: '' }
                        if (!contact) return null

                        return (
                          <div
                            key={contactId}
                            className="rounded-lg border border-slate-200 bg-white p-4 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-sm font-semibold text-slate-900">
                                  {contact.businessName || `Contact #${contactId}`}
                                </h4>
                                <p className="text-xs text-slate-500">ID: {contactId}</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleContactSelection(contactId)}
                                className="text-xs"
                              >
                                Remove
                              </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                  Email Address
                                </label>
                                <Input
                                  placeholder="name@example.com"
                                  value={contactData.email}
                                  onChange={event => {
                                    setBulkContactData(prev => {
                                      const next = new Map(prev)
                                      const current = next.get(contactId) || { email: '', phone: '' }
                                      next.set(contactId, {
                                        ...current,
                                        email: event.target.value
                                      })
                                      return next
                                    })
                                  }}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                  Phone Number
                                </label>
                                <Input
                                  placeholder="(555) 123-4567"
                                  value={contactData.phone}
                                  onChange={event => {
                                    setBulkContactData(prev => {
                                      const next = new Map(prev)
                                      const current = next.get(contactId) || { email: '', phone: '' }
                                      next.set(contactId, {
                                        ...current,
                                        phone: event.target.value
                                      })
                                      return next
                                    })
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {selectedContactIds.size === 0 && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-8 text-center">
                      <p className="text-sm text-slate-500">
                        Select contacts from the table above to add email or phone numbers.
                      </p>
                    </div>
                  )}

                  {selectedContactIds.size > 0 && (
                    <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleSubmitBulkUpdates}
                        disabled={!hasValidBulkSelection || isBulkSaving}
                        isLoading={isBulkSaving}
                      >
                        Update {selectedContactIds.size} Contact{selectedContactIds.size !== 1 ? 's' : ''}
                      </Button>
                      <span className="text-xs text-slate-500">
                        Add email or phone for each contact, then click to update all.
                      </span>
                    </div>
                  )}

                  {bulkError && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-medium text-rose-600">
                      {bulkError}
                    </div>
                  )}

                  {bulkResult && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-600">
                      Updated {bulkResult.updated} contact{bulkResult.updated === 1 ? '' : 's'}
                      {bulkResult.failed > 0
                        ? ` • ${bulkResult.failed} failed`
                        : ' • All updates succeeded'}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Contact Modal */}
            <ContactModal
              contact={selectedContact}
              validity={selectedContactValidity}
              isLoading={isLoadingDetail}
              isSaving={isSavingContact}
              editEmail={editEmail}
              editPhone={editPhone}
              onEditEmailChange={setEditEmail}
              onEditPhoneChange={setEditPhone}
              onSave={handleSaveContact}
              onReset={() => {
                if (selectedContact) {
                  setEditEmail(selectedContact.email || '')
                  setEditPhone(selectedContact.phone || '')
                  setEditError(null)
                  setEditSuccess(null)
                }
              }}
              onClose={handleClearSelection}
              error={detailError || editError}
              success={editSuccess}
              formatDateTime={formatDateTime}
            />
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}

