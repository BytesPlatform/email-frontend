'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
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
import { normalizePhoneNumberWithValidation } from '@/lib/phoneUtils'

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
  // First, check phone E.164 format requirement (frontend override)
  // This must be checked BEFORE using backend computed validity
  // because backend doesn't enforce E.164 format
  const phone = contact.phone?.trim() ?? ''
  const phoneExists = phone.length > 0
  let hasValidPhone = false
  
  if (phoneExists) {
    // Remove spaces, parentheses, hyphens for validation
    const cleaned = phone.replace(/[\s\-\(\)\.]/g, '')
    
    // Must start with + for E.164 format (required for Twilio/Telnyx)
    if (cleaned.startsWith('+')) {
      try {
        const parsed = parsePhoneNumberFromString(cleaned)
        if (parsed) {
          const nationalNumber = parsed.nationalNumber
          
          // Allow numbers that can be parsed, even if isValid() returns false
          // This includes test numbers (like 555), invalid ranges, etc.
          // They're still in E.164 format and can be used (with a warning)
          // Only check length requirements
          if (nationalNumber.length >= 7 && nationalNumber.length <= 15) {
            hasValidPhone = true
          }
        }
      } catch {
        // Invalid phone number - hasValidPhone remains false
      }
    }
  }

  // Check email validity first
  const emailValid = contact.emailValid === true

  // Use backend computed validity if available (preferred)
  // But only if phone validation passed OR email is valid
  if (typeof contact.computedValid === 'boolean' && contact.computedValidationReason) {
    // Only override backend validity if phone exists but is invalid AND email is also invalid
    if (!hasValidPhone && phoneExists && !emailValid) {
      if (!phone.replace(/[\s\-\(\)\.]/g, '').startsWith('+')) {
        return {
          isValid: false,
          reason: 'Phone number exists but is not in E.164 format (must start with + and include country code). Email is also invalid or missing.'
        }
      }
      return {
        isValid: false,
        reason: 'Phone number exists but is invalid or not in E.164 format. Email is also invalid or missing.'
      }
    }
    return {
      isValid: contact.computedValid,
      reason: contact.computedValidationReason
    }
  }

  // If backend computed validity exists but no reason, use it with default reason
  if (typeof contact.computedValid === 'boolean') {
    // Only override backend validity if phone exists but is invalid AND email is also invalid
    if (!hasValidPhone && phoneExists && !emailValid) {
      if (!phone.replace(/[\s\-\(\)\.]/g, '').startsWith('+')) {
        return {
          isValid: false,
          reason: 'Phone number exists but is not in E.164 format (must start with + and include country code). Email is also invalid or missing.'
        }
      }
      return {
        isValid: false,
        reason: 'Phone number exists but is invalid or not in E.164 format. Email is also invalid or missing.'
      }
    }
    return {
      isValid: contact.computedValid,
      reason: contact.computedValid
        ? 'Valid contact (computed by backend)'
        : 'Invalid contact (computed by backend)'
    }
  }

  // Fallback: Compute validity using enhanced validation
  // 1. Check Email: must exist AND emailValid === true
  // (emailValid already checked above)

  // 3. Check Website: if exists, must be valid (websiteValid === true)
  const website = contact.website?.trim() ?? ''
  const hasWebsite = website.length > 0
  const websiteValid = contact.websiteValid === true

  // Website blocker: If website exists but is invalid, contact is invalid
  if (hasWebsite && contact.websiteValid === false) {
    return {
      isValid: false,
      reason: 'Website exists but is invalid (websiteValid = false)'
    }
  }

  // Phone blocker: Only apply if email is also invalid
  // If email is valid, contact can still be valid even with invalid phone
  if (phoneExists && !hasValidPhone && !emailValid) {
    if (!phone.replace(/[\s\-\(\)\.]/g, '').startsWith('+')) {
      return {
        isValid: false,
        reason: 'Phone number must be in E.164 format (start with + and include country code). Email is also invalid or missing.'
      }
    }
    return {
      isValid: false,
      reason: 'Phone number exists but is invalid or not in E.164 format. Email is also invalid or missing.'
    }
  }

  // Contact is valid if: (Valid email OR Valid phone in E.164 format) AND (No website OR website is valid)
  // Check if we have valid email or phone
  const hasValidEmailOrPhone = emailValid || hasValidPhone

  // Check website condition: no website OR website is valid
  const websiteConditionMet = !hasWebsite || websiteValid

  // Contact is valid only if both conditions are met
  if (hasValidEmailOrPhone && websiteConditionMet) {
    if (emailValid && hasValidPhone) {
      return { isValid: true, reason: 'Valid email and valid phone number (E.164 format) present' }
    }
    if (emailValid) {
      return { isValid: true, reason: 'Valid email address present' }
    }
    if (hasValidPhone) {
      return { isValid: true, reason: 'Valid phone number (E.164 format) present' }
    }
  }

  // Determine specific reason for invalidity
  if (!emailValid && !hasValidPhone) {
    if (phoneExists && !phone.replace(/[\s\-\(\)\.]/g, '').startsWith('+')) {
      return { 
        isValid: false, 
        reason: 'Phone number must be in E.164 format (start with + and include country code). Email is also invalid or missing.' 
      }
    }
    return { isValid: false, reason: 'Missing valid email or valid phone number (E.164 format)' }
  }
  
  return { isValid: false, reason: 'Missing valid email or valid phone number (E.164 format)' }
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
  const [searchField, setSearchField] = useState<'all' | 'businessName' | 'email' | 'website'>('all')
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
  const [isLoadingInvalidFromCSV, setIsLoadingInvalidFromCSV] = useState(false)
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
  
  // CSV upload selection state
  const [currentUploadId, setCurrentUploadId] = useState<number | null>(null)
  const [availableUploads, setAvailableUploads] = useState<Array<{ id: number; fileName: string; totalRecords: number; successfulRecords: number }>>([])
  const [isLoadingUploads, setIsLoadingUploads] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [showAllContacts, setShowAllContacts] = useState(false)
  const [hasExplicitlyFetched, setHasExplicitlyFetched] = useState(false) // Track if user has explicitly fetched contacts

  // Cache for search results - key is a stringified query, value is the response
  const searchCache = useRef<Map<string, ClientContactsListResponse>>(new Map())

  // Generate cache key from query object
  const getCacheKey = (query: ClientContactsQuery): string => {
    const keyParts = [
      `page:${query.page || 1}`,
      `limit:${query.limit || 10}`,
      `search:${query.search || ''}`,
      `searchField:${query.searchField || 'all'}`,
      `validOnly:${query.validOnly ?? ''}`,
      `invalidOnly:${query.invalidOnly ?? ''}`,
      `csvUploadId:${query.csvUploadId ?? ''}`,
      `status:${query.status || ''}`,
      `sortBy:${query.sortBy || ''}`,
      `sortOrder:${query.sortOrder || ''}`
    ]
    return keyParts.join('|')
  }

  // Ensure component is mounted and client is available before rendering content
  useEffect(() => {
    // Only set mounted on client side
    if (typeof window !== 'undefined') {
      setIsMounted(true)
      // Load last selected upload ID from localStorage
      const lastUploadId = localStorage.getItem('lastUploadId')
      if (lastUploadId) {
        setCurrentUploadId(Number(lastUploadId))
      }
    }
  }, [])

  // Load uploads from DB for the authenticated client and auto-pick the latest
  useEffect(() => {
    const loadUploads = async () => {
      if (!client?.id) return
      setIsLoadingUploads(true)
      const res = await ingestionApi.getClientUploads()
      if (res.success && res.data) {
        const uploads = res.data
        // Store for optional UI selection later
        setAvailableUploads(uploads.map(u => ({ id: u.id, fileName: u.fileName || `upload_${u.id}.csv`, totalRecords: u.totalRecords, successfulRecords: u.successfulRecords })))
        const allowedIds = new Set(uploads.map(u => u.id))
        // If current uploadId is not owned by this client, clear it
        if (currentUploadId && !allowedIds.has(currentUploadId)) {
          setCurrentUploadId(null)
          if (typeof window !== 'undefined') {
            localStorage.removeItem('lastUploadId')
          }
        }
        // If no valid current uploadId, pick the most recent (first item)
        if ((!currentUploadId || !allowedIds.has(currentUploadId)) && uploads.length > 0) {
          const latest = uploads[0]
          setCurrentUploadId(latest.id)
          if (typeof window !== 'undefined') {
            localStorage.setItem('lastUploadId', String(latest.id))
          }
        }
      }
      setIsLoadingUploads(false)
    }
    loadUploads()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client?.id])

  // Compute visible contacts by applying the frontend validity rules
  // when the user has selected the validity filter. This prevents
  // unnecessary backend calls and ensures the UI reflects the
  // frontend-derived status. Always use deriveContactValidity for consistency
  // with the table display logic.
  const visibleContacts = useMemo(() => {
    if (validityFilter === 'all') return contacts
    
    if (validityFilter === 'valid') {
      return contacts.filter(c => {
        const v = deriveContactValidity(c)
        return v.isValid === true
      })
    }

    // 'invalid'
    return contacts.filter(c => {
      const v = deriveContactValidity(c)
      return v.isValid === false
    })
  }, [contacts, validityFilter])

  // Calculate stats: always use deriveContactValidity to match table validation logic
  // Calculate from visibleContacts so stats match what's displayed in the table
  const stats = useMemo(() => {
    let validCount = 0
    let invalidCount = 0
    
    // Calculate from visibleContacts to match the filtered table display
    visibleContacts.forEach(contact => {
      const validity = deriveContactValidity(contact)
      if (validity.isValid === true) {
        validCount++
      } else if (validity.isValid === false) {
        invalidCount++
      }
    })
    
    return {
      total: meta?.total ?? visibleContacts.length,
      valid: validCount,
      invalid: invalidCount
    }
  }, [visibleContacts, meta])

  const totalValid = stats.valid
  const totalInvalid = stats.invalid

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
    // When user changes the validity filter, we don't call the backend
    // to fetch a separate invalid/valid list — instead we keep the current
    // query intact and reset to the first page so the client-side
    // contacts can be filtered locally.
    setQuery(prev => {
      if (prev.page === 1) return prev
      return { ...prev, page: 1 }
    })
  }, [validityFilter])

  // Handler to fetch contacts from selected CSV upload
  const handleFetchByUpload = () => {
    if (!currentUploadId) return
    setShowAllContacts(false)
    setHasExplicitlyFetched(true)
    setQuery(prev => ({
      ...prev,
      page: 1,
      csvUploadId: currentUploadId
    }))
  }

  // Handler to fetch all contacts from all CSV uploads
  const handleFetchAllContacts = () => {
    setShowAllContacts(true)
    setHasExplicitlyFetched(true)
    setQuery(prev => {
      const newQuery = { ...prev, page: 1 }
      delete newQuery.csvUploadId
      return newQuery
    })
  }

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
        if (prev.search === nextSearch && prev.page === 1 && prev.searchField === (searchField !== 'all' ? searchField : undefined)) {
          return prev
        }
        return {
          ...prev,
          page: 1,
          search: nextSearch,
          searchField: searchField !== 'all' ? searchField : undefined
        }
      })
    }, 400)

    return () => {
      clearTimeout(handler)
    }
  }, [searchInput, searchField])

  // Update query when searchField changes
  useEffect(() => {
    setQuery(prev => {
      const newSearchField = searchField !== 'all' ? searchField : undefined
      if (prev.searchField === newSearchField) {
        return prev
      }
      return {
        ...prev,
        page: 1,
        searchField: newSearchField
      }
    })
  }, [searchField])

  useEffect(() => {
    // Don't fetch until component is mounted
    if (!isMounted || !client) return
    
    // Don't fetch automatically - only fetch when user explicitly requests it
    if (!hasExplicitlyFetched) {
      // Clear contacts if nothing has been fetched yet
      setContacts([])
      setMeta(null)
      setIsLoading(false)
      return
    }

    let ignore = false

    const fetchContacts = async () => {
      // Generate cache key for current query
      const cacheKey = getCacheKey(query)
      
      // Check if we have cached results for this query
      const cachedResult = searchCache.current.get(cacheKey)
      if (cachedResult) {
        // Use cached data
        setContacts(cachedResult.data)
        setMeta(cachedResult.meta)
        setIsLoading(false)
        setError(null)
        return
      }

      // No cache, fetch from API
      setIsLoading(true)
      setError(null)

      try {
        const response = await ingestionApi.listContacts(query)
        if (!ignore) {
          if (response.success && response.data) {
            const payload = response.data as ClientContactsListResponse
            setContacts(payload.data)
            setMeta(payload.meta)
            
            // Store in cache
            searchCache.current.set(cacheKey, payload)
            
            // Limit cache size to prevent memory issues (keep last 50 queries)
            if (searchCache.current.size > 50) {
              const firstKey = searchCache.current.keys().next().value
              if (firstKey) {
                searchCache.current.delete(firstKey)
              }
            }
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
  }, [query, isMounted, client, hasExplicitlyFetched])

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

  // Clear "Country code missing" error when phone number becomes valid
  useEffect(() => {
    if (editPhone && editPhone.trim() && editError && editError.includes('Country code missing')) {
      try {
        const cleaned = editPhone.trim().replace(/[\s\-\(\)\.]/g, '')
        if (cleaned.startsWith('+')) {
          const parsed = parsePhoneNumberFromString(cleaned)
          if (parsed && parsed.country) {
            // Phone number is valid - clear the error
            setEditError(null)
          }
        }
      } catch {
        // If parsing fails, keep the error
      }
    }
  }, [editPhone, editError])

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
        
        // Normalize phone number with validation
        const rawPhone = contact.phone || ''
        let normalizedPhone = ''
        let phoneWarning: string | null = null
        
        if (rawPhone.trim()) {
          // Check if phone is already in valid E.164 format
          const cleaned = rawPhone.trim().replace(/[\s\-\(\)\.]/g, '')
          const isAlreadyE164 = cleaned.startsWith('+')
          
          if (isAlreadyE164) {
            // Try to validate existing E.164 number
            try {
              const parsed = parsePhoneNumberFromString(cleaned)
              if (parsed) {
                // If number can be parsed but isValid() is false, allow it with a warning
                // This handles test numbers, invalid ranges, etc.
                if (parsed.isValid()) {
                  normalizedPhone = parsed.format('E.164')
                } else {
                  // Number can be parsed but is invalid - preserve it and show warning
                  normalizedPhone = parsed.format('E.164')
                  phoneWarning = 'This phone number may not be valid or deliverable (e.g., test numbers, invalid ranges). Please verify before sending SMS.'
                }
              } else {
                // Could not parse but has + - preserve it so user can fix it
                normalizedPhone = cleaned
                phoneWarning = 'Phone number format may be incorrect. Please verify and fix if needed.'
              }
            } catch {
              // Invalid - preserve the cleaned value so user can fix it
              normalizedPhone = cleaned
              phoneWarning = 'Phone number format may be incorrect. Please verify and fix if needed.'
            }
          } else {
            // Not in E.164 format - try to parse it anyway (might have country code but missing +)
            // First, try parsing with the cleaned digits
            const digitsOnly = cleaned.replace(/\D/g, '')
            
            if (digitsOnly.length >= 7) {
              // Try parsing the digits directly - might already include country code
              try {
                const parsed = parsePhoneNumberFromString(digitsOnly)
                if (parsed && parsed.country) {
                  // Successfully parsed - format as E.164 and use it
                  normalizedPhone = parsed.format('E.164')
                  // Only show warning if number is invalid, not if country code is missing
                  if (!parsed.isValid()) {
                    phoneWarning = 'This phone number may not be valid or deliverable (e.g., test numbers, invalid ranges). Please verify before sending SMS.'
                  }
                  // No error - country code was detected successfully
                } else {
                  // Could not auto-detect country - try normalization with hints
                  const normalizationResult = normalizePhoneNumberWithValidation(rawPhone, {
                    state: contact.state,
                    zipCode: contact.zipCode ? String(contact.zipCode) : undefined,
                    defaultCountry: 'US'
                  })
                  
                  if (normalizationResult.normalized && normalizationResult.normalized.startsWith('+')) {
                    normalizedPhone = normalizationResult.normalized
                    
                    // Show warning if confidence is low or manual assignment required
                    if (normalizationResult.requiresManualAssignment) {
                      phoneWarning = normalizationResult.warning || 'Country code may be incorrect. Please verify and select correct country code from dropdown.'
                    } else if (normalizationResult.confidence === 'low') {
                      phoneWarning = normalizationResult.warning || 'Country code was auto-detected. Please verify and select correct country code from dropdown if needed.'
                    } else if (normalizationResult.warning) {
                      phoneWarning = normalizationResult.warning
                    }
                  } else {
                    // Normalization failed - preserve digits so user can select country code
                    // PhoneInput will accept digits without country code and let user select it
                    normalizedPhone = digitsOnly
                    phoneWarning = 'Country code missing. Please select the correct country code from the dropdown to complete the phone number.'
                  }
                }
              } catch {
                // Parsing failed - try normalization with hints
                const normalizationResult = normalizePhoneNumberWithValidation(rawPhone, {
                  state: contact.state,
                  zipCode: contact.zipCode ? String(contact.zipCode) : undefined,
                  defaultCountry: 'US'
                })
                
                if (normalizationResult.normalized && normalizationResult.normalized.startsWith('+')) {
                  normalizedPhone = normalizationResult.normalized
                  
                  // Show warning if confidence is low or manual assignment required
                  if (normalizationResult.requiresManualAssignment) {
                    phoneWarning = normalizationResult.warning || 'Country code may be incorrect. Please verify and select correct country code from dropdown.'
                  } else if (normalizationResult.confidence === 'low') {
                    phoneWarning = normalizationResult.warning || 'Country code was auto-detected. Please verify and select correct country code from dropdown if needed.'
                  } else if (normalizationResult.warning) {
                    phoneWarning = normalizationResult.warning
                  }
                } else {
                  // Normalization failed - preserve digits so user can select country code
                  // PhoneInput will accept digits without country code and let user select it
                  normalizedPhone = digitsOnly
                  phoneWarning = 'Country code missing. Please select the correct country code from the dropdown to complete the phone number.'
                }
              }
            } else {
              // Too short - preserve what we have so user can complete it
              normalizedPhone = digitsOnly
              phoneWarning = 'Phone number is too short. Please enter a complete phone number and select country code from dropdown.'
            }
          }
        }
        
        setEditPhone(normalizedPhone)
        setEditError(phoneWarning) // Show warning/error to user (null if no warning)
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
    // Only validate if the value has changed from the original contact
    try {
      const originalEmail = selectedContact?.email?.trim() || ''
      const originalWebsite = selectedContact?.website?.trim() || ''
      
      // Only validate email if it has changed
      if (trimmedEmail && trimmedEmail !== originalEmail) {
        const emailValidation = await ingestionApi.validateEmail(trimmedEmail)
        if (!emailValidation.success || !emailValidation.data?.valid) {
          setEditError(emailValidation.data?.message || 'Email is invalid or unreachable. Please check the email address.')
          setIsSavingContact(false)
          return
        }
      }

      // Only validate website if it has changed
      if (trimmedWebsite && trimmedWebsite !== originalWebsite) {
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
      // Normalize phone to E.164 format if possible, otherwise preserve the value
      let normalizedPhoneForSave: string | null = null
      if (trimmedPhone) {
        // If phone already starts with +, try to format it to E.164
        if (trimmedPhone.startsWith('+')) {
          try {
            const parsed = parsePhoneNumberFromString(trimmedPhone.trim().replace(/[\s\-\(\)\.]/g, ''))
            if (parsed) {
              normalizedPhoneForSave = parsed.format('E.164')
            } else {
              // Can't parse but has +, preserve it
              normalizedPhoneForSave = trimmedPhone
            }
          } catch {
            // Can't parse, preserve original
            normalizedPhoneForSave = trimmedPhone
          }
        } else {
          // Phone doesn't have country code - try to normalize with hints
          const normalizationResult = normalizePhoneNumberWithValidation(trimmedPhone, {
            state: selectedContact?.state,
            zipCode: selectedContact?.zipCode ? String(selectedContact.zipCode) : undefined,
            defaultCountry: 'US'
          })
          
          if (normalizationResult.normalized && normalizationResult.normalized.startsWith('+')) {
            normalizedPhoneForSave = normalizationResult.normalized
          } else {
            // Normalization failed - preserve the digits (user may need to add country code manually)
            // But we should still save it, not set to null
            const digitsOnly = trimmedPhone.replace(/\D/g, '')
            normalizedPhoneForSave = digitsOnly.length >= 7 ? digitsOnly : trimmedPhone
          }
        }
      }
      
      const payload = {
        email: trimmedEmail || null,
        phone: normalizedPhoneForSave,
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
      
      // Clear cache when contact is updated to ensure fresh data on next search
      searchCache.current.clear()
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
        // Normalize phone to E.164 format if possible, otherwise preserve digits
        const rawPhone = contact.phone || ''
        let normalizedPhone = ''
        
        if (rawPhone.trim()) {
          const cleaned = rawPhone.trim().replace(/[\s\-\(\)\.]/g, '')
          if (cleaned.startsWith('+')) {
            try {
              const parsed = parsePhoneNumberFromString(cleaned)
              if (parsed) {
                // Preserve even if invalid - user can fix it
                normalizedPhone = parsed.format('E.164')
              } else {
                // Can't parse but has + - preserve it
                normalizedPhone = cleaned
              }
            } catch {
              // Invalid - preserve cleaned value
              normalizedPhone = cleaned
            }
          } else {
            // Not in E.164 format - preserve digits so user can select country code
            const digitsOnly = cleaned.replace(/\D/g, '')
            if (digitsOnly.length >= 7) {
              // Try to normalize
              const normalizationResult = normalizePhoneNumberWithValidation(rawPhone, {
                state: contact.state,
                zipCode: contact.zipCode ? String(contact.zipCode) : undefined,
                defaultCountry: 'US'
              })
              if (normalizationResult.normalized && normalizationResult.normalized.startsWith('+')) {
                normalizedPhone = normalizationResult.normalized
              } else {
                // Normalization failed - preserve digits
                normalizedPhone = digitsOnly
              }
            } else {
              // Too short - preserve what we have
              normalizedPhone = digitsOnly
            }
          }
        }
        
        setBulkContactData(prevData => {
          const nextData = new Map(prevData)
          nextData.set(contactId, {
            email: contact.email || '',
            phone: normalizedPhone,
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

      // Filter to only include contacts that the frontend considers invalid
      const filteredInvalidContacts = fetchedInvalidContacts.filter((contact: ClientContact) => {
        const validity = deriveContactValidity(contact)
        if (validity.isValid === false) return true
        if (contact.status === 'invalid') return true
        if (contact.valid === false) return true
        if (typeof contact.computedValid === 'boolean' && contact.computedValid === false) return true
        return false
      })

      const invalidIds = new Set<number>()
      const contactDataMap = new Map<number, { email: string; phone: string; website: string }>()

      // Store the filtered invalid contacts so we can render them
      setInvalidContacts(filteredInvalidContacts)

      filteredInvalidContacts.forEach((contact: ClientContact) => {
        invalidIds.add(contact.id)
        
        // Normalize phone to E.164 format if possible, otherwise preserve digits
        const rawPhone = contact.phone || ''
        let normalizedPhone = ''
        
        if (rawPhone.trim()) {
          const cleaned = rawPhone.trim().replace(/[\s\-\(\)\.]/g, '')
          if (cleaned.startsWith('+')) {
            try {
              const parsed = parsePhoneNumberFromString(cleaned)
              if (parsed) {
                // Preserve even if invalid - user can fix it
                normalizedPhone = parsed.format('E.164')
              } else {
                // Can't parse but has + - preserve it
                normalizedPhone = cleaned
              }
            } catch {
              // Invalid - preserve cleaned value
              normalizedPhone = cleaned
            }
          } else {
            // Not in E.164 format - preserve digits so user can select country code
            const digitsOnly = cleaned.replace(/\D/g, '')
            if (digitsOnly.length >= 7) {
              // Try to normalize
              const normalizationResult = normalizePhoneNumberWithValidation(rawPhone, {
                state: contact.state,
                zipCode: contact.zipCode ? String(contact.zipCode) : undefined,
                defaultCountry: 'US'
              })
              if (normalizationResult.normalized && normalizationResult.normalized.startsWith('+')) {
                normalizedPhone = normalizationResult.normalized
              } else {
                // Normalization failed - preserve digits
                normalizedPhone = digitsOnly
              }
            } else {
              // Too short - preserve what we have
              normalizedPhone = digitsOnly
            }
          }
        }
        
        contactDataMap.set(contact.id, {
          email: contact.email || '',
          phone: normalizedPhone,
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

  // Handler to fetch invalid contacts from a specific CSV upload
  const handleSelectInvalidFromCSV = async () => {
    if (!currentUploadId) {
      setBulkError('Please select a CSV upload first.')
      return
    }
    
    setIsLoadingInvalidFromCSV(true)
    setBulkError(null)
    setDeleteError(null)
    setDeleteSuccess(null)
    
    try {
      // Backend now handles E.164 validation and CSV filtering
      const response = await ingestionApi.getAllInvalidContacts(currentUploadId)
      
      if (!response.success || !response.data) {
        setBulkError(response.error || 'Failed to fetch invalid contacts from CSV. Please try again.')
        return
      }
      
      const fetchedInvalidContacts = response.data.contacts || []

      // Filter to only include contacts that the frontend considers invalid
      const filteredInvalidContacts = fetchedInvalidContacts.filter((contact: ClientContact) => {
        const validity = deriveContactValidity(contact)
        if (validity.isValid === false) return true
        if (contact.status === 'invalid') return true
        if (contact.valid === false) return true
        if (typeof contact.computedValid === 'boolean' && contact.computedValid === false) return true
        return false
      })

      const invalidIds = new Set<number>()
      const contactDataMap = new Map<number, { email: string; phone: string; website: string }>()

      // Store the filtered invalid contacts so we can render them
      setInvalidContacts(filteredInvalidContacts)

      filteredInvalidContacts.forEach((contact: ClientContact) => {
        invalidIds.add(contact.id)
        
        // Normalize phone to E.164 format if possible, otherwise preserve digits
        const rawPhone = contact.phone || ''
        let normalizedPhone = ''
        
        if (rawPhone.trim()) {
          const cleaned = rawPhone.trim().replace(/[\s\-\(\)\.]/g, '')
          if (cleaned.startsWith('+')) {
            try {
              const parsed = parsePhoneNumberFromString(cleaned)
              if (parsed) {
                // Preserve even if invalid - user can fix it
                normalizedPhone = parsed.format('E.164')
              } else {
                // Can't parse but has + - preserve it
                normalizedPhone = cleaned
              }
            } catch {
              // Invalid - preserve cleaned value
              normalizedPhone = cleaned
            }
          } else {
            // Not in E.164 format - preserve digits so user can select country code
            const digitsOnly = cleaned.replace(/\D/g, '')
            if (digitsOnly.length >= 7) {
              // Try to normalize
              const normalizationResult = normalizePhoneNumberWithValidation(rawPhone, {
                state: contact.state,
                zipCode: contact.zipCode ? String(contact.zipCode) : undefined,
                defaultCountry: 'US'
              })
              if (normalizationResult.normalized && normalizationResult.normalized.startsWith('+')) {
                normalizedPhone = normalizationResult.normalized
              } else {
                // Normalization failed - preserve digits
                normalizedPhone = digitsOnly
              }
            } else {
              // Too short - preserve what we have
              normalizedPhone = digitsOnly
            }
          }
        }
        
        contactDataMap.set(contact.id, {
          email: contact.email || '',
          phone: normalizedPhone,
          website: contact.website || ''
        })
      })
      
      setSelectedContactIds(invalidIds)
      setBulkContactData(contactDataMap)
      
      if (invalidIds.size === 0) {
        setBulkError(`No invalid contacts found in the selected CSV upload.`)
      }
    } catch (error) {
      setBulkError(error instanceof Error ? error.message : 'Failed to fetch invalid contacts from CSV')
    } finally {
      setIsLoadingInvalidFromCSV(false)
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

          // Filter to only include contacts that the frontend considers invalid
          const filteredInvalidContacts = fetchedInvalidContacts.filter((contact: ClientContact) => {
            const validity = deriveContactValidity(contact)
            if (validity.isValid === false) return true
            if (contact.status === 'invalid') return true
            if (contact.valid === false) return true
            if (typeof contact.computedValid === 'boolean' && contact.computedValid === false) return true
            return false
          })

          setInvalidContacts(filteredInvalidContacts)

          // Only auto-select and replace bulk contact data when the user
          // explicitly performed a bulk action. For single-contact deletions
          // we should not automatically select all remaining invalid contacts.
          if (confirmDialog.type === 'bulk') {
            if (filteredInvalidContacts.length > 0) {
              // Auto-select all remaining invalid contacts
              const allInvalidIds = new Set(filteredInvalidContacts.map(c => c.id))
              setSelectedContactIds(allInvalidIds)

              // Update bulk contact data to include all remaining invalid contacts
              const updatedBulkData = new Map<number, { email: string; phone: string; website: string }>()
              filteredInvalidContacts.forEach(contact => {
                // Preserve any existing edits, or initialize with normalized values
                const existingData = bulkContactData.get(contact.id)

                // Normalize phone if not already edited
                let normalizedPhone = existingData?.phone || ''
                if (!normalizedPhone && contact.phone) {
                  const rawPhone = contact.phone
                  const cleaned = rawPhone.trim().replace(/[\s\-\(\)\.]/g, '')
                  if (cleaned.startsWith('+')) {
                    try {
                      const parsed = parsePhoneNumberFromString(cleaned)
                      if (parsed) {
                        // Preserve even if invalid - user can fix it
                        normalizedPhone = parsed.format('E.164')
                      } else {
                        // Can't parse but has + - preserve it
                        normalizedPhone = cleaned
                      }
                    } catch {
                      // Invalid - preserve cleaned value
                      normalizedPhone = cleaned
                    }
                  } else {
                    // Not in E.164 format - preserve digits so user can select country code
                    const digitsOnly = cleaned.replace(/\D/g, '')
                    if (digitsOnly.length >= 7) {
                      // Try to normalize
                      const normalizationResult = normalizePhoneNumberWithValidation(rawPhone, {
                        state: contact.state,
                        zipCode: contact.zipCode ? String(contact.zipCode) : undefined,
                        defaultCountry: 'US'
                      })
                      if (normalizationResult.normalized && normalizationResult.normalized.startsWith('+')) {
                        normalizedPhone = normalizationResult.normalized
                      } else {
                        // Normalization failed - preserve digits
                        normalizedPhone = digitsOnly
                      }
                    } else {
                      // Too short - preserve what we have
                      normalizedPhone = digitsOnly
                    }
                  }
                }

                updatedBulkData.set(contact.id, {
                  email: existingData?.email || contact.email || '',
                  phone: normalizedPhone,
                  website: existingData?.website || contact.website || ''
                })
              })
              setBulkContactData(updatedBulkData)
            } else {
              // No invalid contacts remaining, clear selection
              setSelectedContactIds(new Set())
              setBulkContactData(new Map())
            }
          } else {
            // Single-contact delete: remove the deleted id from bulk data and selection
            if (typeof contactId === 'number') {
              setBulkContactData(prev => {
                const next = new Map(prev)
                next.delete(contactId)
                return next
              })
              setSelectedContactIds(prev => {
                const next = new Set(prev)
                next.delete(contactId)
                return next
              })
            }
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
      
      // Normalize phone to E.164 format if possible, otherwise preserve the value
      let normalizedPhoneForSave: string | null = null
      const trimmedPhone = editPhone.trim()
      if (trimmedPhone) {
        // If phone already starts with +, try to format it to E.164
        if (trimmedPhone.startsWith('+')) {
          try {
            const parsed = parsePhoneNumberFromString(trimmedPhone.replace(/[\s\-\(\)\.]/g, ''))
            if (parsed) {
              normalizedPhoneForSave = parsed.format('E.164')
            } else {
              // Can't parse but has +, preserve it
              normalizedPhoneForSave = trimmedPhone
            }
          } catch {
            // Can't parse, preserve original
            normalizedPhoneForSave = trimmedPhone
          }
        } else {
          // Phone doesn't have country code - try to normalize with hints
          const normalizationResult = normalizePhoneNumberWithValidation(trimmedPhone, {
            state: editStateValue,
            zipCode: editZipCode ? String(editZipCode) : undefined,
            defaultCountry: 'US'
          })
          
          if (normalizationResult.normalized && normalizationResult.normalized.startsWith('+')) {
            normalizedPhoneForSave = normalizationResult.normalized
          } else {
            // Normalization failed - preserve the digits (user may need to add country code manually)
            // But we should still save it, not set to null
            const digitsOnly = trimmedPhone.replace(/\D/g, '')
            normalizedPhoneForSave = digitsOnly.length >= 7 ? digitsOnly : trimmedPhone
          }
        }
      }
      
      const payload = {
        businessName: normalizeString(editBusinessName),
        email: normalizeNullable(editEmail),
        phone: normalizedPhoneForSave,
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

  // Update a single selected contact (used by per-contact "tick" button)
  const [updatingContactIds, setUpdatingContactIds] = useState<Set<number>>(new Set())

  const handleUpdateSingleContact = async (contactId: number) => {
    // Prevent concurrent updates for the same contact
    setBulkError(null)
    if (updatingContactIds.has(contactId)) return

    const data = bulkContactData.get(contactId)
    if (!data) {
      setBulkError('No data to update for selected contact.')
      return
    }

    const trimmedEmail = data.email.trim()
    const trimmedPhone = data.phone.trim()
    const trimmedWebsite = data.website.trim()

    // Basic format validation
    const emailError = trimmedEmail ? validateEmail(trimmedEmail) : null
    const phoneError = trimmedPhone ? validatePhone(trimmedPhone) : null
    const websiteError = trimmedWebsite ? validateWebsite(trimmedWebsite) : null

    if (emailError || phoneError || websiteError) {
      setBulkValidationErrors(prev => {
        const next = new Map(prev)
        next.set(contactId, { email: emailError || null, phone: phoneError || null, website: websiteError || null })
        return next
      })
      setBulkError('Please fix validation errors before updating this contact.')
      return
    }

    setUpdatingContactIds(prev => {
      const next = new Set(prev)
      next.add(contactId)
      return next
    })

    try {
      // Normalize phone to E.164 format if possible
      let normalizedPhoneForSave: string | null = null
      if (trimmedPhone) {
        if (trimmedPhone.startsWith('+')) {
          try {
            const parsed = parsePhoneNumberFromString(trimmedPhone.replace(/[\s\-\(\)\.]/g, ''))
            if (parsed) {
              normalizedPhoneForSave = parsed.format('E.164')
            } else {
              normalizedPhoneForSave = trimmedPhone
            }
          } catch {
            normalizedPhoneForSave = trimmedPhone
          }
        } else {
          const normalizationResult = normalizePhoneNumberWithValidation(trimmedPhone, {
            defaultCountry: 'US'
          })
          if (normalizationResult.normalized && normalizationResult.normalized.startsWith('+')) {
            normalizedPhoneForSave = normalizationResult.normalized
          } else {
            const digitsOnly = trimmedPhone.replace(/\D/g, '')
            normalizedPhoneForSave = digitsOnly.length >= 7 ? digitsOnly : trimmedPhone
          }
        }
      }

      const payload = {
        email: trimmedEmail || null,
        phone: normalizedPhoneForSave,
        website: trimmedWebsite || null
      }

      const response = await ingestionApi.updateContact(contactId, payload)
      if (!response.success || !response.data || !response.data.contact) {
        setBulkError(response.error || 'Failed to update contact. Please try again.')
        return
      }

      const updated = response.data.contact

      // Update local state
      setContacts(prev => prev.map(c => (c.id === updated.id ? updated : c)))
      setInvalidContacts(prev => prev.filter(c => c.id !== updated.id))
      setSelectedContactIds(prev => {
        const next = new Set(prev)
        next.delete(updated.id)
        return next
      })
      setBulkContactData(prev => {
        const next = new Map(prev)
        next.delete(updated.id)
        return next
      })
      setBulkValidationErrors(prev => {
        const next = new Map(prev)
        next.delete(updated.id)
        return next
      })

      // Show brief result feedback
      setBulkResult({ updated: 1, failed: 0 })
      setTimeout(() => setBulkResult(null), 2500)
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'Failed to update contact')
    } finally {
      setUpdatingContactIds(prev => {
        const next = new Set(prev)
        next.delete(contactId)
        return next
      })
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

            {meta && hasExplicitlyFetched && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl shadow-md border border-indigo-100 p-5">
                  <p className="text-sm text-slate-500">Total Contacts</p>
                  <p className="text-2xl font-semibold text-indigo-700 mt-1">{stats.total.toLocaleString()}</p>
                  <p className="text-xs text-slate-400 mt-2">
                    {query.search?.trim() 
                      ? `Showing search results`
                      : `Across ${meta.totalPages.toLocaleString()} page${meta.totalPages === 1 ? '' : 's'}`
                    }
                  </p>
                </div>
                <div className="bg-white rounded-xl shadow-md border border-emerald-100 p-5">
                  <p className="text-sm text-slate-500">Valid Contacts</p>
                  <p className="text-2xl font-semibold text-emerald-600 mt-1">{totalValid.toLocaleString()}</p>
                  <p className="text-xs text-slate-400 mt-2">
                    {query.search?.trim() 
                      ? `Valid in search results`
                      : `Contacts with valid email/email validation and phone/phone validation (E.164 format) or website reachable`
                    }
                  </p>
                </div>
                <div className="bg-white rounded-xl shadow-md border border-rose-100 p-5">
                  <p className="text-sm text-slate-500">Invalid Contacts</p>
                  <p className="text-2xl font-semibold text-rose-600 mt-1">{totalInvalid.toLocaleString()}</p>
                  <p className="text-xs text-slate-400 mt-2">
                    {query.search?.trim() 
                      ? `Invalid in search results`
                      : `Contacts missing both email/email validation and phone/phone validation (E.164 format) or website unreachable`
                    }
                  </p>
                </div>
              </div>
            )}

            {/* CSV Upload Selection */}
            <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-100">
              <div className="flex items-center space-x-3 mb-6">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900">CSV Upload Selection</h3>
              </div>
              <div className="space-y-3">
                <div className="text-sm text-gray-700">
                  {currentUploadId ? (
                    <>
                      Active file: <span className="font-medium text-gray-900">
                        {availableUploads.find(u => u.id === currentUploadId)?.fileName || `File #${currentUploadId}`}
                      </span>
                    </>
                  ) : (
                    <span>Select a CSV file to filter contacts</span>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select CSV File</label>
                  <div className="relative">
                    {isLoadingUploads ? (
                      <div className="space-y-2 border border-gray-300 rounded-lg bg-white p-4">
                        <div className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>
                        <div className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>
                        <div className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>
                      </div>
                    ) : availableUploads.length === 0 ? (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-white">
                        <p className="text-sm text-gray-500">No CSV files uploaded yet</p>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                          className="w-full flex items-center justify-between border border-gray-300 rounded-lg px-4 py-3 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:border-gray-400 cursor-pointer"
                        >
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            {currentUploadId ? (
                              <>
                                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="truncate">
                                  {availableUploads.find(u => u.id === currentUploadId)?.fileName || 'Select a file'}
                                </span>
                              </>
                            ) : (
                              <span className="text-gray-500">Select a CSV file</span>
                            )}
                          </div>
                          <svg
                            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'transform rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        
                        {isDropdownOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setIsDropdownOpen(false)}
                            ></div>
                            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-hidden">
                              <div className="overflow-y-auto max-h-64">
                                {availableUploads.map(u => {
                                  const isSelected = currentUploadId === u.id
                                  return (
                                    <button
                                      key={u.id}
                                      type="button"
                                      onClick={async () => {
                                        setCurrentUploadId(u.id)
                                        setIsDropdownOpen(false)
                                        // Reset fetch state when selecting a different CSV
                                        setHasExplicitlyFetched(false)
                                        setShowAllContacts(false)
                                        // Clear current query to show empty state
                                        setQuery({ page: 1, limit: query.limit || 10 })
                                        if (typeof window !== 'undefined') {
                                          localStorage.setItem('lastUploadId', String(u.id))
                                        }
                                      }}
                                      className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors cursor-pointer ${
                                        isSelected
                                          ? 'bg-indigo-50 text-indigo-900'
                                          : 'hover:bg-gray-50 text-gray-900'
                                      } ${u.id !== availableUploads[availableUploads.length - 1].id ? 'border-b border-gray-100' : ''}`}
                                    >
                                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                                        <svg className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-indigo-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <div className="flex-1 min-w-0">
                                          <p className={`text-sm font-medium truncate ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}>
                                            {u.fileName}
                                          </p>
                                          <p className={`text-xs mt-0.5 ${isSelected ? 'text-indigo-700' : 'text-gray-500'}`}>
                                            {u.totalRecords} records
                                          </p>
                                        </div>
                                      </div>
                                      {isSelected && (
                                        <svg className="w-5 h-5 text-indigo-600 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                      )}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center flex-wrap gap-3">
                  <button
                    onClick={handleFetchByUpload}
                    disabled={!currentUploadId}
                    className="bg-indigo-700 text-white px-6 py-3 rounded-lg hover:bg-indigo-800 disabled:bg-gray-400 text-sm font-semibold transition-all cursor-pointer disabled:cursor-not-allowed shadow-md hover:shadow-lg disabled:shadow-none flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span>Fetch and show records</span>
                  </button>
                  <button
                    onClick={handleFetchAllContacts}
                    className="bg-purple-700 text-white px-6 py-3 rounded-lg hover:bg-purple-800 disabled:bg-gray-400 text-sm font-semibold transition-all cursor-pointer disabled:cursor-not-allowed shadow-md hover:shadow-lg disabled:shadow-none flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Get All Contacts</span>
                  </button>
                </div>
                {hasExplicitlyFetched && (
                  <div className="flex items-center gap-2">
                    {showAllContacts && (
                      <div className="inline-flex items-center text-sm text-purple-700 bg-purple-50 border border-purple-200 rounded-lg px-4 py-2 font-medium">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Showing all contacts from all CSV uploads
                      </div>
                    )}
                    {query.csvUploadId && !showAllContacts && (
                      <div className="inline-flex items-center text-sm text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2 font-medium">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Showing contacts from: {availableUploads.find(u => u.id === query.csvUploadId)?.fileName || `File #${query.csvUploadId}`}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

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
                    searchField={searchField}
                    onSearchFieldChange={setSearchField}
                    perPage={query.limit || 10}
                    onPerPageChange={handleLimitChange}
                    perPageOptions={limitOptions}
                    totalCount={meta?.total || 0}
                    validCount={totalValid}
                    invalidCount={totalInvalid}
                  />
                </CardHeader>

                <CardContent className="space-y-4">
                  {!hasExplicitlyFetched ? (
                    <div className="flex flex-col items-center justify-center py-16 px-4">
                      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-full p-6 mb-6">
                        <svg className="w-16 h-16 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">No Contacts Loaded</h3>
                      <p className="text-gray-600 text-center max-w-md mb-6">
                        {currentUploadId 
                          ? `Select "${availableUploads.find(u => u.id === currentUploadId)?.fileName || 'the CSV file'}" and click "Fetch and show records" to view contacts, or click "Get All Contacts" to view all contacts from all CSV uploads.`
                          : 'Select a CSV file above and click "Fetch and show records" to view contacts, or click "Get All Contacts" to view all contacts from all CSV uploads.'}
                      </p>
                      <div className="flex gap-3">
                        {currentUploadId && (
                          <Button
                            onClick={handleFetchByUpload}
                            variant="primary"
                            className="bg-indigo-700 hover:bg-indigo-800"
                          >
                            Fetch and show records
                          </Button>
                        )}
                        <Button
                          onClick={handleFetchAllContacts}
                          variant="primary"
                          className="bg-purple-700 hover:bg-purple-800"
                        >
                          Get All Contacts
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <ContactsTable
                      contacts={visibleContacts}
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
                      searchTerm={searchInput}
                      searchField={searchField}
                      selectedContactIds={selectedContactIds}
                      onToggleContactSelection={handleToggleContactSelection}
                      showCheckboxes={true}
                    />
                  )}
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
                      {currentUploadId && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleSelectInvalidFromCSV}
                          disabled={isLoadingInvalidFromCSV}
                          className="text-xs h-7 px-3 border-purple-300 text-purple-700 hover:bg-purple-50 hover:text-purple-800 hover:border-purple-400"
                          leftIcon={
                            isLoadingInvalidFromCSV ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600"></div>
                            ) : (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            )
                          }
                        >
                          {isLoadingInvalidFromCSV ? 'Loading...' : 'Select Invalid from CSV'}
                        </Button>
                      )}
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
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUpdateSingleContact(contactId)}
                                  disabled={!isReady || updatingContactIds.has(contactId)}
                                  className="text-xs text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
                                  leftIcon={
                                    updatingContactIds.has(contactId) ? (
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-emerald-600"></div>
                                    ) : (
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                      </svg>
                                    )
                                  }
                                >
                                  Update
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
                                    value={contactData.phone && contactData.phone.startsWith('+') ? (contactData.phone as E164Number) : undefined}
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


