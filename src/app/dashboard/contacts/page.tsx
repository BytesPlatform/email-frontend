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
import { parsePhoneNumberFromString } from 'libphonenumber-js'
import PhoneInput from 'react-phone-number-input'
import type { E164Number } from 'libphonenumber-js/core'
import 'react-phone-number-input/style.css'
import { ContactsFilterBar } from '@/components/contacts/ContactsFilterBar'
import { ContactsTable } from '@/components/contacts/ContactsTable'
import { ContactModal } from '@/components/contacts/ContactModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

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
  // Priority 0: Check if website is invalid (force user to fix it)
  // If website exists but is invalid, contact must be marked invalid
  if (contact.website && contact.websiteValid === false) {
    return {
      isValid: false,
      reason: 'Website is unreachable - please update or remove the website URL'
    }
  }

  // Priority 1: Check email/phone presence first (most important for display)
  // This ensures contacts with email/phone show as valid even if valid field is false
  const hasEmail = Boolean(contact.email?.trim())
  const hasPhone = Boolean(contact.phone?.trim())

  if (hasEmail || hasPhone) {
    if (hasEmail && hasPhone) {
      return {
        isValid: true,
        reason: 'Email and phone number present'
      }
    }
    if (hasEmail) {
      // Check if email is validated (emailValid field)
      if (contact.emailValid === true) {
        return {
          isValid: true,
          reason: 'Valid email address present'
        }
      }
      // Email exists but not yet validated (might be newly added)
      return {
        isValid: true,
        reason: 'Email address present (validation pending)'
      }
    }
    if (hasPhone) {
      return {
        isValid: true,
        reason: 'Phone number present'
      }
    }
  }

  // Priority 2: If no email/phone, check computedValid (from backend computation)
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

  // Priority 3: Check valid field (used for scraping validation, not contact info completeness)
  if (typeof contact.valid === 'boolean') {
    return {
      isValid: contact.valid,
      reason:
        contact.validationReason ||
        (contact.valid ? 'Contact flagged as valid' : 'Contact flagged as invalid')
    }
  }

  // If both email and phone are null/empty, contact is invalid
  return {
    isValid: false,
    reason: contact.validationReason || 'Missing email address and phone number'
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

// Add these validation functions after getValidityDisplay (around line 125)
const validateWebsite = (website: string): string | null => {
  if (!website.trim()) return null // Empty is allowed
  
  // Remove http:// or https:// for validation (user can enter plain domain)
  const normalized = website.trim().replace(/^https?:\/\//i, '')
  
  // Must have a valid domain extension (.com, .org, .net, country codes, etc.)
  const domainPattern = /^[^\s\/]+\.[a-z]{2,}(\/.*)?$/i
  if (!domainPattern.test(normalized)) {
    return 'Website must have a valid domain extension (e.g., .com, .org, .net, .by, etc.)'
  }
  
  return null
}

// Helper function to normalize website URL (add https:// if not present)
const normalizeWebsite = (website: string): string => {
  const trimmed = website.trim()
  if (!trimmed) return trimmed
  
  // If it already starts with http:// or https://, return as is
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }
  
  // Otherwise, prepend https://
  return `https://${trimmed}`
}

const validateEmail = (email: string): string | null => {
  if (!email.trim()) return null // Empty is allowed
  
  // Should not be just numbers
  if (/^\d+$/.test(email)) {
    return 'Email cannot be only numbers'
  }
  
  // Must have @ symbol
  if (!email.includes('@')) {
    return 'Email must contain @ symbol'
  }
  
  // Must have valid domain after @
  const emailPattern = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i
  if (!emailPattern.test(email)) {
    return 'Email must have a valid format (e.g., name@domain.com)'
  }
  
  return null
}

const validateBusinessName = (name: string): string | null => {
  if (!name.trim()) return null // Empty is allowed
  
  // Should not be only numbers/integers
  if (/^\d+$/.test(name.trim())) {
    return 'Business name cannot be only numbers'
  }
  
  // Must contain at least one letter
  if (!/[a-zA-Z]/.test(name)) {
    return 'Business name must contain at least one letter'
  }
  
  return null
}

const validateZipCode = (zipCode: string): string | null => {
  if (!zipCode.trim()) return null // Empty is allowed
  
  // Must be exactly 5 digits
  if (!/^\d{5}$/.test(zipCode.trim())) {
    return 'Zip code must be exactly 5 digits'
  }
  
  return null
}

const validateState = (state: string): string | null => {
  if (!state.trim()) return null // Empty is allowed
  
  // Must not be only numbers
  if (/^\d+$/.test(state.trim())) {
    return 'State cannot be only numbers'
  }
  
  // Must be a string (contains at least one letter)
  if (!/[a-zA-Z]/.test(state)) {
    return 'State must contain at least one letter'
  }
  
  // Maximum 20 characters
  if (state.trim().length > 20) {
    return 'State must be maximum 20 characters'
  }
  
  return null
}

const validatePhone = (phone: string): string | null => {
  if (!phone.trim()) return null // Empty is allowed
  
  // Use libphonenumber-js to validate (same approach as PhoneAccountsCard)
  const parsed = parsePhoneNumberFromString(phone.trim())
  
  if (!parsed || !parsed.isValid()) {
    return 'Please enter a valid phone number'
  }
  
  // Check minimum length (at least 7 digits for national number)
  const nationalNumber = parsed.nationalNumber
  if (nationalNumber.length < 7) {
    return 'Phone number is too short. Please enter a complete phone number.'
  }
  
  // Check maximum length (ITU-T E.164 standard allows up to 15 digits)
  if (nationalNumber.length > 15) {
    return 'Phone number is too long. Please check and try again.'
  }
  
  return null
}

export default function ContactsPage() {
  const { client } = useAuthContext()

  const [contacts, setContacts] = useState<ClientContact[]>([])
  const [meta, setMeta] = useState<ClientContactsMeta | null>(null)
  const [query, setQuery] = useState<ClientContactsQuery>({ page: 1, limit: 10 })
  const [validityFilter, setValidityFilter] = useState<ValidityFilter>('all')
  const [searchInput, setSearchInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  const [selectedContactId, setSelectedContactId] = useState<number | null>(null)
  const [selectedContact, setSelectedContact] = useState<ClientContact | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [isSavingContact, setIsSavingContact] = useState(false)
  const [editBusinessName, setEditBusinessName] = useState('')
  const [editWebsite, setEditWebsite] = useState('')
  const [editStateValue, setEditStateValue] = useState('')
  const [editZipCode, setEditZipCode] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [editValidFlag, setEditValidFlag] = useState<boolean | null>(null)
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [editSuccess, setEditSuccess] = useState<string | null>(null)
  const [detailsError, setDetailsError] = useState<string | null>(null)
  const [detailsSuccess, setDetailsSuccess] = useState<string | null>(null)
  const [selectedContactIds, setSelectedContactIds] = useState<Set<number>>(new Set())
  const [bulkContactData, setBulkContactData] = useState<Map<number, { email: string; phone: string; website: string }>>(new Map())
  const [bulkValidationErrors, setBulkValidationErrors] = useState<Map<number, { email?: string | null; phone?: string | null; website?: string | null }>>(new Map())
  const [isBulkSaving, setIsBulkSaving] = useState(false)
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [bulkResult, setBulkResult] = useState<{ updated: number; failed: number } | null>(null)
  const [isLoadingInvalid, setIsLoadingInvalid] = useState(false)
  const [isDeletingInvalid, setIsDeletingInvalid] = useState(false)
  const [isDeletingSingle, setIsDeletingSingle] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null)
  const [invalidContacts, setInvalidContacts] = useState<ClientContact[]>([]) // Store fetched invalid contacts separately
  const [isSavingDetails, setIsSavingDetails] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    type: 'single' | 'bulk' | null
    contactId?: number
    contactName?: string
  }>({
    isOpen: false,
    type: null,
  })

  // Ensure component is mounted and client is available before rendering content
  useEffect(() => {
    // Only set mounted on client side
    if (typeof window !== 'undefined') {
      setIsMounted(true)
    }
  }, [])

  // Use total valid/invalid counts from backend (across all pages, independent of filter)
  const totalValid = meta?.totalValid ?? 0
  const totalInvalid = meta?.totalInvalid ?? 0

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
    setQuery(prev => {
      let nextValidOnly: boolean | undefined
      let nextInvalidOnly: boolean | undefined

      if (validityFilter === 'valid') {
        nextValidOnly = true
        nextInvalidOnly = undefined
      } else if (validityFilter === 'invalid') {
        nextValidOnly = undefined
        nextInvalidOnly = true
      } else {
        // 'all' - remove both filters
        nextValidOnly = undefined
        nextInvalidOnly = undefined
      }

      // Check if the values actually changed
      if (
        prev.validOnly === nextValidOnly &&
        prev.invalidOnly === nextInvalidOnly
      ) {
        return prev
      }

      // Create new query object, preserving all existing properties
      const newQuery: ClientContactsQuery = {
        ...prev,
        page: 1
      }

      // Set or remove validOnly/invalidOnly
      if (nextValidOnly !== undefined) {
        newQuery.validOnly = nextValidOnly
      } else {
        delete newQuery.validOnly
      }

      if (nextInvalidOnly !== undefined) {
        newQuery.invalidOnly = nextInvalidOnly
      } else {
        delete newQuery.invalidOnly
      }

      return newQuery
    })
  }, [validityFilter])

  useEffect(() => {
    const handler = setTimeout(() => {
      const trimmed = searchInput.trim()
      
      if (!trimmed) {
        setQuery(prev => {
          if (prev.search === undefined && prev.page === 1) {
            return prev
          }
          return {
            ...prev,
            page: 1,
            search: undefined
          }
        })
        return
      }
      
      // Normalize URL search terms: remove protocol and trailing slashes
      // This allows "https://www.sunrisebakery.com" to match "www.sunrisebakery.com" or "sunrisebakery.com"
      let normalizedSearch = trimmed
      
      // Remove http:// or https:// prefix if present
      if (/^https?:\/\//i.test(normalizedSearch)) {
        normalizedSearch = normalizedSearch.replace(/^https?:\/\//i, '')
      }
      
      // Remove trailing slashes
      normalizedSearch = normalizedSearch.replace(/\/+$/, '')
      
      // Trim again after normalization
      normalizedSearch = normalizedSearch.trim()
      
      const nextSearch = normalizedSearch.length > 0 ? normalizedSearch : undefined
      
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
    // Don't fetch until component is mounted
    if (!isMounted || !client) return

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
  }, [query, isMounted, client])

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
        setEditBusinessName(contact.businessName || '')
        setEditWebsite(contact.website || '')
        setEditStateValue(contact.state || '')
        setEditZipCode(contact.zipCode ? String(contact.zipCode) : '')
        setEditValidFlag(
          typeof contact.valid === 'boolean'
            ? contact.valid
            : typeof contact.computedValid === 'boolean'
            ? contact.computedValid
            : null
        )
        setEditEmail(contact.email || '')
        setEditPhone(contact.phone || '')
        setEditError(null)
        setEditSuccess(null)
        setDetailsError(null)
        setDetailsSuccess(null)
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
    setDetailsError(null)
    setDetailsSuccess(null)
    setEditEmail('')
    setEditPhone('')
    setEditError(null)
    setEditSuccess(null)
    setEditBusinessName('')
        setEditWebsite('')
        setEditStateValue('')
        setEditZipCode('')
        setEditValidFlag(null)
  }

  const handleSaveContact = async () => {
    if (!selectedContactId) {
      setEditError('Select a contact first.')
      return
    }

    const trimmedEmail = editEmail.trim()
    const trimmedPhone = editPhone.trim()
    const trimmedWebsite = editWebsite.trim()

    if (!trimmedEmail && !trimmedPhone && !trimmedWebsite) {
      setEditError('Please provide at least an email address, phone number, or website URL.')
      return
    }

    // Validate email format first
    if (trimmedEmail) {
      const emailFormatError = validateEmail(trimmedEmail)
      if (emailFormatError) {
        setEditError(emailFormatError)
        return
      }
    }

    // Validate phone if provided
    if (trimmedPhone) {
      const phoneError = validatePhone(trimmedPhone)
      if (phoneError) {
        setEditError(phoneError)
        return
      }
    }

    // Validate website format first
    if (trimmedWebsite) {
      const websiteFormatError = validateWebsite(trimmedWebsite)
      if (websiteFormatError) {
        setEditError(websiteFormatError)
        return
      }
    }

    setIsSavingContact(true)
    setEditError(null)
    setEditSuccess(null)

    // Real-time validation: Check email and website reachability
    try {
      if (trimmedEmail) {
        const emailValidation = await ingestionApi.validateEmail(trimmedEmail)
        if (!emailValidation.success || !emailValidation.data?.valid) {
          setEditError(emailValidation.data?.message || 'Email is invalid or unreachable. Please check the email address.')
          setIsSavingContact(false)
          return
        }
      }

      if (trimmedWebsite) {
        const websiteValidation = await ingestionApi.validateWebsite(trimmedWebsite)
        if (!websiteValidation.success || !websiteValidation.data?.valid) {
          setEditError(websiteValidation.data?.message || 'Website is unreachable. Please check the website URL.')
          setIsSavingContact(false)
          return
        }
      }
    } catch (validationError) {
      setEditError('Validation check failed. Please try again.')
      setIsSavingContact(false)
      return
    }

    try {
      const payload = {
        email: trimmedEmail || null,
        phone: trimmedPhone || null,
        website: trimmedWebsite || null
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
      setInvalidContacts(prev => prev.filter(contact => contact.id !== updatedContact.id))
      setSelectedContactIds(prev => {
        if (!prev.has(updatedContact.id)) {
          return prev
        }
        const next = new Set(prev)
        next.delete(updatedContact.id)
        return next
      })
      setBulkContactData(prev => {
        if (!prev.has(updatedContact.id)) {
          return prev
        }
        const next = new Map(prev)
        next.delete(updatedContact.id)
        return next
      })
      setEditBusinessName(updatedContact.businessName || '')
      setEditWebsite(updatedContact.website || '')
      setEditStateValue(updatedContact.state || '')
      setEditZipCode(updatedContact.zipCode ? String(updatedContact.zipCode) : '')
      setEditValidFlag(
        typeof updatedContact.valid === 'boolean'
          ? updatedContact.valid
          : typeof updatedContact.computedValid === 'boolean'
          ? updatedContact.computedValid
          : null
      )
      setEditSuccess(response.data.message || 'Contact updated successfully.')
      setDetailsError(null)
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
    // Check both contacts (paginated) and invalidContacts (fetched invalid)
    const contact = invalidContacts.find(c => c.id === contactId) || contacts.find(c => c.id === contactId)
    if (!contact) return
    
    const validity = deriveContactValidity(contact)
    if (validity.isValid === true) {
      // Don't allow selecting valid contacts
      return
    }

    // If contact is from regular contacts (not already in invalidContacts), add it to invalidContacts
    // This ensures we can display it in the edit section even if it's not on the current page
    const isInInvalidContacts = invalidContacts.some(c => c.id === contactId)
    if (!isInInvalidContacts && contact) {
      setInvalidContacts(prev => [...prev, contact])
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
        // Clear validation errors when deselected
        setBulkValidationErrors(prev => {
          const next = new Map(prev)
          next.delete(contactId)
          return next
        })
      } else {
        next.add(contactId)
        // Initialize contact data with existing email/phone/website
        setBulkContactData(prevData => {
          const nextData = new Map(prevData)
          nextData.set(contactId, {
            email: contact.email || '',
            phone: contact.phone || '',
            website: contact.website || ''
          })
          return nextData
        })
      }
      return next
    })
  }

  const handleSelectAllInvalid = async () => {
    setIsLoadingInvalid(true)
    setBulkError(null)
    setDeleteError(null)
    setDeleteSuccess(null)
    
    try {
      const response = await ingestionApi.getAllInvalidContacts()
      
      if (!response.success || !response.data) {
        setBulkError(response.error || 'Failed to fetch invalid contacts. Please try again.')
        return
      }
      
      const fetchedInvalidContacts = response.data.contacts || []
      const invalidIds = new Set<number>()
      const contactDataMap = new Map<number, { email: string; phone: string; website: string }>()
      
      // Store the fetched invalid contacts so we can render them
      setInvalidContacts(fetchedInvalidContacts)
      
      fetchedInvalidContacts.forEach((contact: ClientContact) => {
        invalidIds.add(contact.id)
        contactDataMap.set(contact.id, {
          email: contact.email || '',
          phone: contact.phone || '',
          website: contact.website || ''
        })
      })
      
      setSelectedContactIds(invalidIds)
      setBulkContactData(contactDataMap)
      
      if (invalidIds.size === 0) {
        setBulkError('No invalid contacts found.')
      }
    } catch (error) {
      setBulkError(error instanceof Error ? error.message : 'Failed to fetch invalid contacts')
    } finally {
      setIsLoadingInvalid(false)
    }
  }

  const handleClearBulkSelection = () => {
    setSelectedContactIds(new Set())
    setBulkContactData(new Map())
    setBulkValidationErrors(new Map()) // Clear validation errors
    setInvalidContacts([]) // Clear invalid contacts when clearing selection
    setBulkError(null)
    setBulkResult(null)
    setDeleteError(null)
    setDeleteSuccess(null)
  }

  const handleDeleteAllInvalid = () => {
    // Open confirmation dialog
    setConfirmDialog({
      isOpen: true,
      type: 'bulk',
    })
  }

  const handleConfirmDeleteAllInvalid = async () => {
    setIsDeletingInvalid(true)
    setDeleteError(null)
    setDeleteSuccess(null)
    setBulkError(null)
    
    try {
      const response = await ingestionApi.bulkDeleteInvalidContacts()
      
      if (!response.success || !response.data) {
        setDeleteError(response.error || 'Failed to delete invalid contacts. Please try again.')
        setConfirmDialog({ isOpen: false, type: null })
        return
      }
      
      const { deletedCount } = response.data
      setDeleteSuccess(`Successfully deleted ${deletedCount} invalid contact(s).`)
      
      // Close dialog after successful deletion
      setConfirmDialog({ isOpen: false, type: null })
      
      // Clear selection and invalid contacts
      setSelectedContactIds(new Set())
      setBulkContactData(new Map())
      setInvalidContacts([])
      
      // Refresh contacts list by manually refetching
      // This ensures the list is updated after deletion
      setIsLoading(true)
      setError(null)
      try {
        const refreshResponse = await ingestionApi.listContacts(query)
        if (refreshResponse.success && refreshResponse.data) {
          const payload = refreshResponse.data as ClientContactsListResponse
          setContacts(payload.data)
          setMeta(payload.meta)
        }
      } catch (refreshError) {
        console.error('Failed to refresh contacts after deletion:', refreshError)
        // Don't show error to user since deletion was successful
      } finally {
        setIsLoading(false)
      }
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setDeleteSuccess(null)
      }, 5000)
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete invalid contacts')
      setConfirmDialog({ isOpen: false, type: null })
    } finally {
      setIsDeletingInvalid(false)
    }
  }

  const handleDeleteSingleContact = (contactId: number) => {
    // Find contact to get name for confirmation dialog
    const contact = invalidContacts.find(c => c.id === contactId) || contacts.find(c => c.id === contactId)
    const contactName = contact?.businessName || `Contact #${contactId}`
    
    // Open confirmation dialog
    setConfirmDialog({
      isOpen: true,
      type: 'single',
      contactId,
      contactName,
    })
  }

  const handleConfirmDeleteSingleContact = async () => {
    const { contactId } = confirmDialog
    if (!contactId) return

    setIsDeletingSingle(true)
    setDeleteError(null)
    setDeleteSuccess(null)
    setBulkError(null)
    
    try {
      const response = await ingestionApi.deleteContact(contactId)
      
      if (!response.success || !response.data) {
        setDeleteError(response.error || 'Failed to delete contact. Please try again.')
        setConfirmDialog({ isOpen: false, type: null })
        return
      }
      
      setDeleteSuccess('Contact deleted successfully.')
      
      // Close dialog after successful deletion
      setConfirmDialog({ isOpen: false, type: null })
      
      // Remove from regular contacts if present (will be refetched below)
      setContacts(prev => prev.filter(c => c.id !== contactId))
      
      // Refresh contacts list to update meta (total counts)
      setIsLoading(true)
      setError(null)
      try {
        const refreshResponse = await ingestionApi.listContacts(query)
        if (refreshResponse.success && refreshResponse.data) {
          const payload = refreshResponse.data as ClientContactsListResponse
          setContacts(payload.data)
          setMeta(payload.meta)
        }
      } catch (refreshError) {
        console.error('Failed to refresh contacts after deletion:', refreshError)
        // Don't show error to user since deletion was successful
      } finally {
        setIsLoading(false)
      }
      
      // Refetch all invalid contacts to show all remaining invalid contacts
      // This ensures that after deletion, all invalid contacts are visible, not just the ones in state
      try {
        const invalidResponse = await ingestionApi.getAllInvalidContacts()
        if (invalidResponse.success && invalidResponse.data) {
          const fetchedInvalidContacts = invalidResponse.data.contacts || []
          setInvalidContacts(fetchedInvalidContacts)
          
          // If we have invalid contacts in state (meaning "Select All Invalid" was used),
          // auto-select all remaining invalid contacts so they're all displayed
          if (fetchedInvalidContacts.length > 0) {
            // Auto-select all remaining invalid contacts
            const allInvalidIds = new Set(fetchedInvalidContacts.map(c => c.id))
            setSelectedContactIds(allInvalidIds)
            
            // Update bulk contact data to include all remaining invalid contacts
            const updatedBulkData = new Map<number, { email: string; phone: string; website: string }>()
            fetchedInvalidContacts.forEach(contact => {
              // Preserve any existing edits, or initialize with empty values
              const existingData = bulkContactData.get(contact.id)
              updatedBulkData.set(contact.id, {
                email: existingData?.email || contact.email || '',
                phone: existingData?.phone || contact.phone || '',
                website: existingData?.website || contact.website || ''
              })
            })
            setBulkContactData(updatedBulkData)
          } else {
            // No invalid contacts remaining, clear selection
            setSelectedContactIds(new Set())
            setBulkContactData(new Map())
          }
        }
      } catch (refreshError) {
        console.error('Failed to refresh invalid contacts after deletion:', refreshError)
        // Don't show error to user since deletion was successful
      }
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setDeleteSuccess(null)
      }, 5000)
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete contact')
      setConfirmDialog({ isOpen: false, type: null })
    } finally {
      setIsDeletingSingle(false)
    }
  }

  const handleCancelDelete = () => {
    setConfirmDialog({ isOpen: false, type: null })
  }

  const handleSaveContactDetails = async () => {
    if (!selectedContactId) {
      setDetailsError('Select a contact first.')
      return
    }

    // Validation before saving
    const websiteError = editWebsite.trim() ? validateWebsite(editWebsite) : null
    const emailError = editEmail.trim() ? validateEmail(editEmail) : null
    const businessNameError = editBusinessName.trim() ? validateBusinessName(editBusinessName) : null
    const zipCodeError = editZipCode.trim() ? validateZipCode(editZipCode) : null
    const stateError = editStateValue.trim() ? validateState(editStateValue) : null

    // Check if there are any validation errors
    if (websiteError || emailError || businessNameError || zipCodeError || stateError) {
      setDetailsError('Please fix validation errors before saving.')
      return
    }

    setIsSavingDetails(true)
    setDetailsError(null)
    setDetailsSuccess(null)

    const normalizeNullable = (value: string) => {
      const trimmed = value.trim()
      return trimmed.length > 0 ? trimmed : null
    }

    const normalizeString = (value: string) => {
      const trimmed = value.trim()
      return trimmed.length > 0 ? trimmed : undefined
    }

    try {
      // Normalize website: add https:// if not present
      const normalizedWebsite = editWebsite.trim() ? normalizeWebsite(editWebsite) : null
      
      const payload = {
        businessName: normalizeString(editBusinessName),
        email: normalizeNullable(editEmail),
        phone: normalizeNullable(editPhone),
        website: normalizedWebsite,
        state: normalizeNullable(editStateValue),
        zipCode: editZipCode ? String(editZipCode).trim() || null : null,
        valid: typeof editValidFlag === 'boolean' ? editValidFlag : undefined
      }

      const response = await ingestionApi.updateContact(selectedContactId, payload)
      if (!response.success || !response.data || !response.data.contact) {
        setDetailsError(response.error || 'Unable to update contact. Please try again.')
        return
      }

      const updatedContact = response.data.contact
      if (!updatedContact || typeof updatedContact.id !== 'number') {
        setDetailsError('Contact updated but response was missing contact details.')
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
      setEditBusinessName(updatedContact.businessName || '')
      setEditWebsite(updatedContact.website || '')
      setEditStateValue(updatedContact.state || '')
      setEditZipCode(updatedContact.zipCode ? String(updatedContact.zipCode) : '')
      setEditValidFlag(
        typeof updatedContact.valid === 'boolean'
          ? updatedContact.valid
          : typeof updatedContact.computedValid === 'boolean'
          ? updatedContact.computedValid
          : null
      )
      setEditEmail(updatedContact.email || '')
      setEditPhone(updatedContact.phone || '')
      setDetailsSuccess(response.data.message || 'Contact details updated successfully.')
      setEditError(null)
      setEditSuccess(null)
    } catch (error) {
      setDetailsError(
        error instanceof Error ? error.message : 'Unable to update contact. Please try again.'
      )
    } finally {
      setIsSavingDetails(false)
    }
  }

  const handleSubmitBulkUpdates = async () => {
    if (selectedContactIds.size === 0) {
      setBulkError('Please select at least one contact.')
      return
    }

    // Validate all emails, phones, and websites before building payload
    let hasValidationErrors = false
    const validationErrorsMap = new Map<number, { email?: string | null; phone?: string | null; website?: string | null }>()
    
    selectedContactIds.forEach(id => {
      const data = bulkContactData.get(id)
      if (!data) return
      
      const trimmedEmail = data.email.trim()
      const trimmedPhone = data.phone.trim()
      const trimmedWebsite = data.website.trim()
      
      if (trimmedEmail) {
        const emailError = validateEmail(trimmedEmail)
        if (emailError) {
          hasValidationErrors = true
          validationErrorsMap.set(id, { email: emailError })
        }
      }
      
      if (trimmedPhone) {
        const phoneError = validatePhone(trimmedPhone)
        if (phoneError) {
          hasValidationErrors = true
          const current = validationErrorsMap.get(id) || {}
          validationErrorsMap.set(id, { ...current, phone: phoneError })
        }
      }

      if (trimmedWebsite) {
        const websiteError = validateWebsite(trimmedWebsite)
        if (websiteError) {
          hasValidationErrors = true
          const current = validationErrorsMap.get(id) || {}
          validationErrorsMap.set(id, { ...current, website: websiteError })
        }
      }
    })

    if (hasValidationErrors) {
      setBulkValidationErrors(validationErrorsMap)
      setBulkError('Please fix email, phone, and website format errors before saving.')
      return
    }

    // Real-time validation: Check email and website reachability
    setIsBulkSaving(true)
    setBulkError(null)
    
    try {
      // Validate all emails and websites for reachability
      for (const id of selectedContactIds) {
        const data = bulkContactData.get(id)
        if (!data) continue

        const trimmedEmail = data.email.trim()
        const trimmedWebsite = data.website.trim()

        if (trimmedEmail) {
          const emailValidation = await ingestionApi.validateEmail(trimmedEmail)
          if (!emailValidation.success || !emailValidation.data?.valid) {
            const current = validationErrorsMap.get(id) || {}
            validationErrorsMap.set(id, { ...current, email: emailValidation.data?.message || 'Email is invalid or unreachable' })
            hasValidationErrors = true
          }
        }

        if (trimmedWebsite) {
          const websiteValidation = await ingestionApi.validateWebsite(trimmedWebsite)
          if (!websiteValidation.success || !websiteValidation.data?.valid) {
            const current = validationErrorsMap.get(id) || {}
            validationErrorsMap.set(id, { ...current, website: websiteValidation.data?.message || 'Website is unreachable' })
            hasValidationErrors = true
          }
        }
      }

      if (hasValidationErrors) {
        setBulkValidationErrors(validationErrorsMap)
        setBulkError('Some emails or websites are invalid or unreachable. Please fix them before saving.')
        setIsBulkSaving(false)
        return
      }
    } catch (validationError) {
      setBulkError('Validation check failed. Please try again.')
      setIsBulkSaving(false)
      return
    }

    // Build payload from contact data map
    const contactsPayload = Array.from(selectedContactIds)
      .map(id => {
        const data = bulkContactData.get(id)
        if (!data) return null
        
        const trimmedEmail = data.email.trim()
        const trimmedPhone = data.phone.trim()
        const trimmedWebsite = data.website.trim()
        
        // Only include if at least one field has a value
        if (!trimmedEmail && !trimmedPhone && !trimmedWebsite) return null
        
        return {
          id,
          email: trimmedEmail || null,
          phone: trimmedPhone || null,
          website: trimmedWebsite || null
        }
      })
      .filter((item): item is { id: number; email: string | null; phone: string | null; website: string | null } => item !== null)

    if (contactsPayload.length === 0) {
      setBulkError('Please provide at least an email address, phone number, or website for at least one contact.')
      setIsBulkSaving(false)
      return
    }

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
        // Update contacts in the main list
        setContacts(prev => {
          if (!prev.length) return prev
          const lookup = new Map(safeUpdated.map(contact => [contact.id, contact]))
          return prev.map(contact => lookup.get(contact.id) ?? contact)
        })
        
        // Remove successfully updated contacts from invalidContacts (they're now valid)
        const updatedIds = new Set(safeUpdated.map(c => c.id))
        setInvalidContacts(prev => prev.filter(c => !updatedIds.has(c.id)))
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
        // Clear invalid contacts if all were successfully updated
        if (safeUpdated.length > 0 && safeFailed.length === 0) {
          setInvalidContacts([])
        }
      }

      setBulkResult({ updated: safeUpdated.length, failed: safeFailed.length })
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setBulkResult(null)
      }, 3000)
    } catch (error) {
      setBulkError(
        error instanceof Error ? error.message : 'Failed to update contacts. Please try again.'
      )
    } finally {
      setIsBulkSaving(false)
    }
  }

  // Don't render content until mounted on client side
  // This prevents hydration mismatches and SSR issues
  if (!isMounted) {
    return (
      <AuthGuard>
        <div className="bg-gray-50 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading contacts...</p>
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .phone-input-wrapper-bulk {
          position: relative;
        }
        .phone-input-wrapper-bulk .PhoneInput {
          display: flex;
          align-items: stretch;
          border: 1px solid #cbd5e1;
          border-radius: 0.375rem;
          overflow: hidden;
          height: 2.75rem;
          min-height: 2.75rem;
          transition: all 0.2s;
        }
        .phone-input-wrapper-bulk .PhoneInput:focus-within {
          border-color: #6366f1;
          outline: 2px solid rgba(99, 102, 241, 0.2);
          outline-offset: 0;
        }
        .phone-input-wrapper-bulk.phone-input-error .PhoneInput,
        .phone-input-wrapper-bulk.phone-input-error .PhoneInput:focus-within {
          border-color: #ef4444;
          outline-color: rgba(239, 68, 68, 0.2);
        }
        .phone-input-wrapper-bulk.phone-input-warning .PhoneInput {
          border-color: #f59e0b;
          background-color: rgba(254, 243, 199, 0.5);
        }
        .phone-input-wrapper-bulk.phone-input-warning .PhoneInput:focus-within {
          border-color: #f59e0b;
          outline-color: rgba(245, 158, 11, 0.2);
        }
        .phone-input-wrapper-bulk .PhoneInputCountry {
          border-right: 1px solid #e2e8f0;
          padding: 0 8px;
          display: flex;
          align-items: center;
          height: 100%;
        }
        .phone-input-wrapper-bulk .PhoneInputInput {
          flex: 1;
          border: none;
          padding: 0.75rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
          height: 100%;
          display: flex;
          align-items: center;
          line-height: 1.25;
        }
        .phone-input-wrapper-bulk .PhoneInputCountryOptions {
          z-index: 1000;
        }
      `}} />
      <AuthGuard>
        <div className="bg-gray-50 min-h-screen">
        <div className="mx-auto max-w-7xl px-4 sm:px-4 lg:px-6 py-6 pb-24">
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
                  <p className="text-sm text-slate-500">Valid Contacts</p>
                  <p className="text-2xl font-semibold text-emerald-600 mt-1">{totalValid.toLocaleString()}</p>
                  <p className="text-xs text-slate-400 mt-2">Contacts with email or phone number</p>
                </div>
                <div className="bg-white rounded-xl shadow-md border border-rose-100 p-5">
                  <p className="text-sm text-slate-500">Invalid Contacts</p>
                  <p className="text-2xl font-semibold text-rose-600 mt-1">{totalInvalid.toLocaleString()}</p>
                  <p className="text-xs text-slate-400 mt-2">Contacts missing both email and phone</p>
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
                    searchValue={searchInput}
                    onSearchChange={setSearchInput}
                    perPage={query.limit || 10}
                    onPerPageChange={handleLimitChange}
                    perPageOptions={limitOptions}
                    totalCount={meta?.total || 0}
                    validCount={totalValid}
                    invalidCount={totalInvalid}
                  />
                </CardHeader>

                <CardContent className="space-y-4">
                  <ContactsTable
                    contacts={contacts}
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

              <Card variant="filled" className="border-2 border-slate-200">
                <CardHeader
                  title="Edit Invalid Contacts"
                  subtitle="Select contacts from the table above, then add email, phone, or fix website for each contact."
                  icon={
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  }
                  className="pb-3 mb-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-3 border-t border-slate-200">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-slate-700">
                        {selectedContactIds.size} contact{selectedContactIds.size !== 1 ? 's' : ''} selected
                      </span>
                      {selectedContactIds.size > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={handleClearBulkSelection}
                          className="text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 h-6 px-2 py-1"
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleSelectAllInvalid}
                        disabled={isLoadingInvalid}
                        className="text-xs h-7 px-3"
                        leftIcon={
                          isLoadingInvalid ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-indigo-600"></div>
                          ) : (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )
                        }
                      >
                        {isLoadingInvalid ? 'Loading...' : 'Select All Invalid'}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleDeleteAllInvalid}
                        disabled={isDeletingInvalid}
                        className="text-xs border-rose-300 text-rose-700 hover:bg-rose-50 hover:text-rose-800 hover:border-rose-400 h-7 px-3"
                        leftIcon={
                          isDeletingInvalid ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-rose-600"></div>
                          ) : (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )
                        }
                      >
                        {isDeletingInvalid ? 'Deleting...' : 'Delete All Invalid'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">

                  {selectedContactIds.size > 0 && (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                      {Array.from(selectedContactIds).map(contactId => {
                        // First try to find contact in invalidContacts (fetched invalid contacts)
                        // Then try to find in regular contacts (paginated)
                        const contact = invalidContacts.find(c => c.id === contactId) || contacts.find(c => c.id === contactId)
                        const contactData = bulkContactData.get(contactId) || { email: '', phone: '', website: '' }
                        if (!contact) return null

                        // Determine why contact is invalid
                        const originalEmail = contact.email?.trim() || ''
                        const originalPhone = contact.phone?.trim() || ''
                        const originalWebsite = contact.website?.trim() || ''
                        const isWebsiteInvalid = originalWebsite && contact.websiteValid === false
                        const isMissingEmailAndPhone = !originalEmail && !originalPhone
                        
                        const hasEmail = contactData.email.trim() !== ''
                        const hasPhone = contactData.phone.trim() !== ''
                        const hasWebsite = contactData.website.trim() !== ''
                        
                        // Determine which fields need to be fixed
                        const needsEmail = isMissingEmailAndPhone && !hasEmail
                        const needsPhone = isMissingEmailAndPhone && !hasPhone
                        const needsWebsiteFix = isWebsiteInvalid && (!hasWebsite || contactData.website.trim() === originalWebsite)
                        
                        // Check for validation errors (from user input) OR invalid website that hasn't been fixed
                        const hasValidationErrors = Boolean(
                          bulkValidationErrors.get(contactId)?.email ||
                          bulkValidationErrors.get(contactId)?.phone ||
                          bulkValidationErrors.get(contactId)?.website ||
                          (isWebsiteInvalid && needsWebsiteFix) // Website is invalid and hasn't been changed
                        )
                        const isReady = (hasEmail || hasPhone || hasWebsite) && !hasValidationErrors

                        return (
                          <div
                            key={contactId}
                            className="group rounded-xl border-2 border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200"
                          >
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-start space-x-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex-shrink-0">
                                  <svg className="h-5 w-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-slate-900 mb-1">
                                    {contact.businessName || `Contact #${contactId}`}
                                  </h4>
                                  <div className="flex items-center space-x-3 text-xs text-slate-500">
                                    <span className="flex items-center space-x-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                      </svg>
                                      <span>ID: {contactId}</span>
                                    </span>
                                    {contact.state && (
                                      <span className="flex items-center space-x-1">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <span>{contact.state}</span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleContactSelection(contactId)}
                                  className="text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                                  leftIcon={
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  }
                                >
                                  Remove
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteSingleContact(contactId)}
                                  className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                  leftIcon={
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  }
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div className="space-y-2 flex flex-col">
                                <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
                                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                  <span>Email Address</span>
                                  {needsEmail && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                      </svg>
                                      Required
                                    </span>
                                  )}
                                  {hasEmail && !needsEmail && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                      </svg>
                                      Ready
                                    </span>
                                  )}
                                </label>
                                <Input
                                  placeholder="name@example.com"
                                  value={contactData.email}
                                  onChange={event => {
                                    const emailValue = event.target.value
                                    // Update email value
                                    setBulkContactData(prev => {
                                      const next = new Map(prev)
                                      const current = next.get(contactId) || { email: '', phone: '', website: '' }
                                      next.set(contactId, {
                                        ...current,
                                        email: emailValue
                                      })
                                      return next
                                    })
                                    // Validate email
                                    const emailError = emailValue.trim() ? validateEmail(emailValue) : null
                                    setBulkValidationErrors(prev => {
                                      const next = new Map(prev)
                                      const current = next.get(contactId) || {}
                                      next.set(contactId, {
                                        ...current,
                                        email: emailError
                                      })
                                      return next
                                    })
                                  }}
                                  className={`transition-all ${
                                    needsEmail
                                      ? 'border-amber-400 focus:border-amber-500 focus:ring-amber-500 bg-amber-50/50'
                                      : hasEmail && !bulkValidationErrors.get(contactId)?.email
                                      ? 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500'
                                      : bulkValidationErrors.get(contactId)?.email
                                      ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500'
                                      : ''
                                  }`}
                                />
                                {bulkValidationErrors.get(contactId)?.email && (
                                  <p className="text-xs text-rose-600 mt-1">
                                    {bulkValidationErrors.get(contactId)?.email}
                                  </p>
                                )}
                              </div>
                              <div className="space-y-2 flex flex-col">
                                <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
                                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                  </svg>
                                  <span>Phone Number</span>
                                  {needsPhone && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                      </svg>
                                      Required
                                    </span>
                                  )}
                                  {hasPhone && !needsPhone && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                      </svg>
                                      Ready
                                    </span>
                                  )}
                                </label>
                                <div className={`phone-input-wrapper-bulk ${needsPhone ? 'phone-input-warning' : ''} ${bulkValidationErrors.get(contactId)?.phone ? 'phone-input-error' : ''}`}>
                                  <PhoneInput
                                    international
                                    defaultCountry="US"
                                    value={contactData.phone as E164Number | undefined}
                                    onChange={(value) => {
                                      const phoneValue = value || ''
                                      
                                      // Update phone value
                                      setBulkContactData(prev => {
                                        const next = new Map(prev)
                                        const current = next.get(contactId) || { email: '', phone: '', website: '' }
                                        next.set(contactId, {
                                          ...current,
                                          phone: phoneValue
                                        })
                                        return next
                                      })
                                      // Validate phone
                                      const phoneError = phoneValue.trim() ? validatePhone(phoneValue) : null
                                      setBulkValidationErrors(prev => {
                                        const next = new Map(prev)
                                        const current = next.get(contactId) || {}
                                        next.set(contactId, {
                                          ...current,
                                          phone: phoneError
                                        })
                                        return next
                                      })
                                    }}
                                    placeholder="Enter phone number with country code"
                                  />
                                </div>
                                {bulkValidationErrors.get(contactId)?.phone && (
                                  <p className="text-xs text-rose-600 mt-1">
                                    {bulkValidationErrors.get(contactId)?.phone}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="space-y-2 mt-0">
                              <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
                                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                                <span>Website URL</span>
                                {needsWebsiteFix && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    Invalid - Fix Required
                                  </span>
                                )}
                                {hasWebsite && !needsWebsiteFix && !bulkValidationErrors.get(contactId)?.website && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Ready
                                  </span>
                                )}
                                {hasWebsite && bulkValidationErrors.get(contactId)?.website && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-800">
                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    Invalid
                                  </span>
                                )}
                              </label>
                              <Input
                                placeholder="example.com or https://example.com"
                                value={contactData.website}
                                onChange={event => {
                                  const websiteValue = event.target.value
                                  // Update website value
                                  setBulkContactData(prev => {
                                    const next = new Map(prev)
                                    const current = next.get(contactId) || { email: '', phone: '', website: '' }
                                    next.set(contactId, {
                                      ...current,
                                      website: websiteValue
                                    })
                                    return next
                                  })
                                  // Validate website
                                  const websiteError = websiteValue.trim() ? validateWebsite(websiteValue) : null
                                  setBulkValidationErrors(prev => {
                                    const next = new Map(prev)
                                    const current = next.get(contactId) || {}
                                    next.set(contactId, {
                                      ...current,
                                      website: websiteError
                                    })
                                    return next
                                  })
                                }}
                                className={`transition-all ${
                                  needsWebsiteFix
                                    ? 'border-amber-400 focus:border-amber-500 focus:ring-amber-500 bg-amber-50/50'
                                    : hasWebsite && !bulkValidationErrors.get(contactId)?.website
                                    ? 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500'
                                    : bulkValidationErrors.get(contactId)?.website
                                    ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500'
                                    : ''
                                }`}
                              />
                              {bulkValidationErrors.get(contactId)?.website && (
                                <p className="text-xs text-rose-600 mt-1">
                                  {bulkValidationErrors.get(contactId)?.website}
                                </p>
                              )}
                            </div>
                            {isReady && (
                              <div className="mt-3 flex items-center space-x-2 text-xs text-emerald-600">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span className="font-medium">Ready to update</span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {selectedContactIds.size === 0 && (
                    <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                          <svg className="h-8 w-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-700 mb-1">
                            No contacts selected
                          </p>
                          <p className="text-xs text-slate-500">
                            Select contacts from the table above to add email, phone, or fix website URLs.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {bulkError && selectedContactIds.size > 0 && (
                    <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-600 mb-4">
                      {bulkError}
                    </div>
                  )}

                  {selectedContactIds.size > 0 && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t-2 border-slate-200 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 -mx-6 -mb-6 px-6 py-4 rounded-b-xl mt-4">
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                        <Button
                          variant="secondary"
                          size="md"
                          onClick={handleSubmitBulkUpdates}
                          disabled={!hasValidBulkSelection || isBulkSaving}
                          isLoading={isBulkSaving}
                          leftIcon={
                            !isBulkSaving && (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                              </svg>
                            )
                          }
                          className="shadow-lg hover:shadow-xl"
                        >
                          {isBulkSaving ? 'Updating...' : `Update ${selectedContactIds.size} Contact${selectedContactIds.size !== 1 ? 's' : ''}`}
                        </Button>
                        {!hasValidBulkSelection && (
                          <span className="text-xs text-amber-600 font-medium flex items-center space-x-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span>Add email, phone, or fix website for at least one contact</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 flex items-center space-x-2">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Add email, phone, or fix website for each contact, then click to update all.</span>
                      </p>
                    </div>
                  )}

                  {deleteError && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-medium text-rose-600">
                      {deleteError}
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

                  {deleteSuccess && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-600">
                      {deleteSuccess}
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
              isSavingDetails={isSavingDetails}
              editEmail={editEmail}
              editPhone={editPhone}
              editBusinessName={editBusinessName}
              editWebsite={editWebsite}
              editState={editStateValue}
              editZipCode={editZipCode}
              editValidFlag={editValidFlag}
              onEditEmailChange={setEditEmail}
              onEditPhoneChange={setEditPhone}
              onEditBusinessNameChange={setEditBusinessName}
              onEditWebsiteChange={setEditWebsite}
              onEditStateChange={setEditStateValue}
              onEditZipCodeChange={setEditZipCode}
              onEditValidFlagChange={setEditValidFlag}
              onSave={handleSaveContact}
               onSaveDetails={handleSaveContactDetails}
              onReset={() => {
                if (selectedContact) {
                  setEditEmail(selectedContact.email || '')
                  setEditPhone(selectedContact.phone || '')
                  setEditBusinessName(selectedContact.businessName || '')
                  setEditWebsite(selectedContact.website || '')
                  setEditStateValue(selectedContact.state || '')
                  setEditZipCode(selectedContact.zipCode ? String(selectedContact.zipCode) : '')
                  setEditValidFlag(
                    typeof selectedContact.valid === 'boolean'
                      ? selectedContact.valid
                      : typeof selectedContact.computedValid === 'boolean'
                      ? selectedContact.computedValid
                      : null
                  )
                  setEditError(null)
                  setEditSuccess(null)
                  setDetailsError(null)
                  setDetailsSuccess(null)
                }
              }}
              onClose={handleClearSelection}
              error={detailError || editError}
              success={editSuccess}
              detailsError={detailsError}
              detailsSuccess={detailsSuccess}
              formatDateTime={formatDateTime}
            />

            {/* Confirm Delete Dialog */}
            <ConfirmDialog
              isOpen={confirmDialog.isOpen}
              title={
                confirmDialog.type === 'bulk'
                  ? 'Delete All Invalid Contacts'
                  : `Delete Contact: ${confirmDialog.contactName || ''}`
              }
              message={
                confirmDialog.type === 'bulk'
                  ? `Are you sure you want to delete ALL ${totalInvalid.toLocaleString()} invalid contact${totalInvalid === 1 ? '' : 's'}? This action cannot be undone and will permanently remove all contacts that have no email and no phone number from your database.\n\nThis will delete ALL invalid contacts, not just the selected ones.`
                  : `Are you sure you want to delete "${confirmDialog.contactName}"? This action cannot be undone and will permanently remove this contact from your database.`
              }
              confirmText="Delete"
              cancelText="Cancel"
              variant="danger"
              onConfirm={
                confirmDialog.type === 'bulk'
                  ? handleConfirmDeleteAllInvalid
                  : handleConfirmDeleteSingleContact
              }
              onCancel={handleCancelDelete}
              isLoading={
                confirmDialog.type === 'bulk'
                  ? isDeletingInvalid
                  : isDeletingSingle
              }
            />
          </div>
        </div>
      </div>
    </AuthGuard>
    </>
  )
}

