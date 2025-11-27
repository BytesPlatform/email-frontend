'use client'

import { useEffect, useState, useRef } from 'react'
import type { ClientContact } from '@/types/ingestion'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { parsePhoneNumberFromString } from 'libphonenumber-js'
import PhoneInput from 'react-phone-number-input'
import type { E164Number } from 'libphonenumber-js/core'
import 'react-phone-number-input/style.css'

// Add validation functions at the top of the file
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
  
  // Check for common email providers
  const validDomains = ['gmail', 'yahoo', 'hotmail', 'outlook', 'aol', 'icloud', 'protonmail', 'mail', 'live', 'msn']
  const domain = email.split('@')[1]?.split('.')[0]?.toLowerCase()
  
  // Allow any domain, but ensure it has proper TLD
  const hasValidTLD = /@[^\s@]+\.[a-z]{2,}$/i.test(email)
  if (!hasValidTLD) {
    return 'Email must have a valid domain extension (e.g., .com, .org, .net)'
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

interface ValidityDisplay {
  label: string
  className: string
  reason?: string
}

interface ContactModalProps {
  contact: ClientContact | null
  validity: ValidityDisplay | null
  isLoading: boolean
  isSaving: boolean
  isSavingDetails: boolean
  editEmail: string
  editPhone: string
  editBusinessName: string
  editWebsite: string
  editState: string
  editZipCode: string
  editValidFlag: boolean | null
  onEditEmailChange: (value: string) => void
  onEditPhoneChange: (value: string) => void
  onEditBusinessNameChange: (value: string) => void
  onEditWebsiteChange: (value: string) => void
  onEditStateChange: (value: string) => void
  onEditZipCodeChange: (value: string) => void
  onEditValidFlagChange: (value: boolean) => void
  onSave: () => void
  onSaveDetails: () => void
  onReset: () => void
  onClose: () => void
  error?: string | null
  success?: string | null
  detailsError?: string | null
  detailsSuccess?: string | null
  formatDateTime: (value?: string) => string
}

export function ContactModal({
  contact,
  validity,
  isLoading,
  isSaving,
  isSavingDetails,
  editEmail,
  editPhone,
  editBusinessName,
  editWebsite,
  editState,
  editZipCode,
  editValidFlag,
  onEditEmailChange,
  onEditPhoneChange,
  onEditBusinessNameChange,
  onEditWebsiteChange,
  onEditStateChange,
  onEditZipCodeChange,
  onEditValidFlagChange,
  onSave,
  onSaveDetails,
  onReset,
  onClose,
  error,
  success,
  detailsError,
  detailsSuccess,
  formatDateTime
}: ContactModalProps) {
  // Validation state
  const [validationErrors, setValidationErrors] = useState<{
    website?: string | null
    email?: string | null
    phone?: string | null
    businessName?: string | null
    zipCode?: string | null
    state?: string | null
  }>({})

  // Block body scrolling when modal is open
  useEffect(() => {
    if (contact) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [contact])

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && contact) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [contact, onClose])

  // Phone input refs - must be declared before any conditional returns
  const phoneInputRef = useRef<HTMLDivElement>(null)
  const phoneInputRef2 = useRef<HTMLDivElement>(null)

  // Save handlers
  const handleSave = async () => {
    // Validate all fields before saving
    const errors = {
      website: validateWebsite(editWebsite),
      email: validateEmail(editEmail),
      phone: editPhone ? validatePhone(editPhone) : null,
      businessName: validateBusinessName(editBusinessName),
      zipCode: validateZipCode(editZipCode),
      state: validateState(editState),
    }

    setValidationErrors(errors)

    // Check if there are any errors
    const hasErrors = Object.values(errors).some(error => error !== null)
    if (hasErrors) {
      return
    }

    try {
      await onSave()
      onClose() // Close the modal after successful save
    } catch (error) {
      console.error('Failed to save contact:', error)
    }
  }

  const handleSaveDetails = async () => {
    // Validate all fields before saving
    const errors = {
      website: validateWebsite(editWebsite),
      email: validateEmail(editEmail),
      phone: editPhone ? validatePhone(editPhone) : null,
      businessName: validateBusinessName(editBusinessName),
      zipCode: validateZipCode(editZipCode),
      state: validateState(editState),
    }

    setValidationErrors(errors)

    // Check if there are any errors
    const hasErrors = Object.values(errors).some(error => error !== null)
    if (hasErrors) {
      return
    }

    try {
      await onSaveDetails()
      onClose() // Close the modal after successful save
    } catch (error) {
      console.error('Failed to save contact details:', error)
    }
  }

  // Force dropdown to open downward (similar to PhoneAccountsCard)
  useEffect(() => {
    const forceDropdownDown = () => {
      const options = document.querySelectorAll('.PhoneInputCountryOptions')
      options.forEach((option) => {
        const element = option as HTMLElement
        if (element.style.bottom) {
          element.style.bottom = ''
        }
        const select = element.closest('.PhoneInputCountry')?.querySelector('.PhoneInputCountrySelect') as HTMLElement
        if (select) {
          const rect = select.getBoundingClientRect()
          element.style.top = `${rect.height + 4}px`
          element.style.bottom = 'auto'
          element.style.transform = 'none'
          element.style.position = 'absolute'
        }
      })
    }

    forceDropdownDown()
    const observer = new MutationObserver(forceDropdownDown)
    if (phoneInputRef.current) {
      observer.observe(phoneInputRef.current, { childList: true, subtree: true, attributes: true })
    }
    if (phoneInputRef2.current) {
      observer.observe(phoneInputRef2.current, { childList: true, subtree: true, attributes: true })
    }
    document.addEventListener('click', forceDropdownDown)

    return () => {
      observer.disconnect()
      document.removeEventListener('click', forceDropdownDown)
    }
  }, [])

  if (!contact) return null

  // Add validation handlers
  const handleWebsiteChange = (value: string) => {
    onEditWebsiteChange(value)
    const error = validateWebsite(value)
    setValidationErrors(prev => ({ ...prev, website: error }))
  }

  const handleEmailChange = (value: string) => {
    onEditEmailChange(value)
    const error = validateEmail(value)
    setValidationErrors(prev => ({ ...prev, email: error }))
  }

  const handleBusinessNameChange = (value: string) => {
    onEditBusinessNameChange(value)
    const error = validateBusinessName(value)
    setValidationErrors(prev => ({ ...prev, businessName: error }))
  }

  const handleZipCodeChange = (value: string) => {
    // Only allow digits
    const digitsOnly = value.replace(/\D/g, '')
    // Limit to 5 digits
    const limited = digitsOnly.slice(0, 5)
    onEditZipCodeChange(limited)
    const error = validateZipCode(limited)
    setValidationErrors(prev => ({ ...prev, zipCode: error }))
  }

  const handleStateChange = (value: string) => {
    // Limit to 20 characters
    const limited = value.slice(0, 20)
    onEditStateChange(limited)
    const error = validateState(limited)
    setValidationErrors(prev => ({ ...prev, state: error }))
  }

  const handlePhoneChange = (value: E164Number | undefined) => {
    const phoneValue = value || ''
    onEditPhoneChange(phoneValue)
    const error = phoneValue ? validatePhone(phoneValue) : null
    setValidationErrors(prev => ({ ...prev, phone: error }))
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .phone-input-wrapper {
          position: relative;
        }
        .phone-input-wrapper .PhoneInput {
          display: flex;
          align-items: center;
          border: 1px solid #cbd5e1;
          border-radius: 0.375rem;
          overflow: hidden;
          transition: all 0.2s;
        }
        .phone-input-wrapper .PhoneInput:focus-within {
          border-color: #6366f1;
          outline: 2px solid rgba(99, 102, 241, 0.2);
          outline-offset: 0;
        }
        .phone-input-wrapper.phone-input-error .PhoneInput,
        .phone-input-wrapper.phone-input-error .PhoneInput:focus-within {
          border-color: #ef4444;
          outline-color: rgba(239, 68, 68, 0.2);
        }
        .phone-input-wrapper .PhoneInputCountry {
          border-right: 1px solid #e2e8f0;
          padding: 0 8px;
        }
        .phone-input-wrapper .PhoneInputInput {
          flex: 1;
          border: none;
          padding: 8px 12px;
          font-size: 0.875rem;
          outline: none;
        }
        .phone-input-wrapper .PhoneInputCountryOptions {
          z-index: 1000;
        }
      `}} />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {contact.businessName || 'Untitled Contact'}
            </h2>
            <p className="text-xs uppercase tracking-wide text-slate-500 mt-1">
              ID: {contact.id}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {validity && (
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${validity.className}`}
                title={validity.reason}
              >
                {validity.label}
              </span>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="py-12">
              <LoadingSpinner text="Loading contact details..." />
            </div>
          ) : (
            <>
              {validity?.reason && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-sm text-slate-600">{validity.reason}</p>
                </div>
              )}

              {/* Contact Details */}
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                    Email
                  </dt>
                  <dd className="text-sm text-slate-700 break-all">
                    {contact.email || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                    Phone
                  </dt>
                  <dd className="text-sm text-slate-700">
                    {contact.phone || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                    Website
                  </dt>
                  <dd className="text-sm break-all">
                    {contact.website ? (
                      <div className="space-y-1">
                        {contact.websiteValid === false ? (
                          // Invalid website - show warning
                          <div className="flex items-start space-x-2">
                            <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div className="flex-1 min-w-0">
                              <span className="text-amber-700">{contact.website}</span>
                              <p className="text-xs text-amber-600 mt-0.5">Website is unreachable</p>
                            </div>
                          </div>
                        ) : (
                          // Valid or unknown website - show as link
                          <a
                            href={
                              contact.website.startsWith('http')
                                ? contact.website
                                : `https://${contact.website}`
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 hover:underline"
                          >
                            {contact.website}
                          </a>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                    State
                  </dt>
                  <dd className="text-sm text-slate-700">
                    {contact.state || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                    Zip Code
                  </dt>
                  <dd className="text-sm text-slate-700">
                    {contact.zipCode ? String(contact.zipCode) : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                    Uploaded From
                  </dt>
                  <dd className="text-sm text-slate-700">
                    <span className="block font-medium">
                      {contact.csvUpload?.fileName || '—'}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatDateTime(contact.csvUpload?.createdAt)}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                    Created At
                  </dt>
                  <dd className="text-sm text-slate-700">
                    {formatDateTime(contact.createdAt)}
                  </dd>
                </div>
              </dl>

              {/* Edit Form for Invalid Contacts */}
              {validity?.label === 'Invalid' && (
                <div className="rounded-lg border-2 border-rose-200 bg-rose-50 p-4 space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700">Fix Contact</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Add a valid email, phone number, or fix the website URL to bring this contact back into the valid list.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Email Address
                      </label>
                      <Input
                        value={editEmail}
                        onChange={event => handleEmailChange(event.target.value)}
                        placeholder="name@example.com"
                        className={validationErrors.email ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : ''}
                      />
                      {validationErrors.email && (
                        <p className="text-xs text-rose-600 mt-1">{validationErrors.email}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Phone Number
                      </label>
                      <div ref={phoneInputRef} className={`phone-input-wrapper ${validationErrors.phone ? 'phone-input-error' : ''}`}>
                        <PhoneInput
                          international
                          defaultCountry="US"
                          value={editPhone as E164Number | undefined}
                          onChange={handlePhoneChange}
                          placeholder="Enter phone number with country code"
                        />
                      </div>
                      {validationErrors.phone && (
                        <p className="text-xs text-rose-600 mt-1">{validationErrors.phone}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Website URL {contact.websiteValid === false && contact.website && (
                        <span className="text-amber-600">(Invalid - please fix or remove)</span>
                      )}
                    </label>
                    <Input
                      value={editWebsite}
                      onChange={event => onEditWebsiteChange(event.target.value)}
                      placeholder="example.com or https://example.com"
                      className={validationErrors.website ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : ''}
                    />
                    {validationErrors.website && (
                      <p className="text-xs text-rose-600 mt-1">{validationErrors.website}</p>
                    )}
                  </div>

                  {error && (
                    <p className="text-xs font-medium text-rose-600">{error}</p>
                  )}
                  {success && (
                    <p className="text-xs font-medium text-emerald-600">{success}</p>
                  )}

                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleSave}
                      isLoading={isSaving}
                      disabled={isSaving}
                    >
                      Save Contact
                    </Button>
                    <Button variant="ghost" size="sm" onClick={onReset}>
                      Reset
                    </Button>
                  </div>
                </div>
              )}

              {/* Edit Form for Valid Contacts */}
              {validity?.label !== 'Invalid' && (
                <div className="rounded-lg border-2 border-indigo-100 bg-indigo-50/70 p-4 space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700">Edit Contact Details</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Update any field for this contact. Changes save via the ingestion service immediately.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Business Name
                      </label>
                      <Input
                        value={editBusinessName}
                        onChange={event => handleBusinessNameChange(event.target.value)}
                        placeholder="Business name"
                        className={validationErrors.businessName ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : ''}
                      />
                      {validationErrors.businessName && (
                        <p className="text-xs text-rose-600 mt-1">{validationErrors.businessName}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Website
                      </label>
                      <Input
                        value={editWebsite}
                        onChange={event => handleWebsiteChange(event.target.value)}
                        placeholder="example.com (https:// will be added automatically)"
                        className={validationErrors.website ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : ''}
                      />
                      {validationErrors.website && (
                        <p className="text-xs text-rose-600 mt-1">{validationErrors.website}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Email Address
                      </label>
                      <Input
                        value={editEmail}
                        onChange={event => handleEmailChange(event.target.value)}
                        placeholder="name@example.com"
                        className={validationErrors.email ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : ''}
                      />
                      {validationErrors.email && (
                        <p className="text-xs text-rose-600 mt-1">{validationErrors.email}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Phone Number
                      </label>
                      <div ref={phoneInputRef2} className="phone-input-wrapper">
                        <PhoneInput
                          international
                          defaultCountry="US"
                          value={editPhone as E164Number | undefined}
                          onChange={handlePhoneChange}
                          placeholder="Enter phone number with country code"
                        />
                      </div>
                      {validationErrors.phone && (
                        <p className="text-xs text-rose-600 mt-1">{validationErrors.phone}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        State
                      </label>
                      <Input
                        value={editState}
                        onChange={event => handleStateChange(event.target.value)}
                        placeholder="CA"
                        className={validationErrors.state ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : ''}
                      />
                      {validationErrors.state && (
                        <p className="text-xs text-rose-600 mt-1">{validationErrors.state}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Zip Code
                      </label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={String(editZipCode || '')}
                        onChange={event => handleZipCodeChange(event.target.value)}
                        placeholder="90210"
                        maxLength={5}
                        className={validationErrors.zipCode ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : ''}
                      />
                      {validationErrors.zipCode && (
                        <p className="text-xs text-rose-600 mt-1">{validationErrors.zipCode}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-3 pt-6">
                      <label className="flex items-center space-x-2 text-xs font-semibold text-slate-600">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          checked={Boolean(editValidFlag)}
                          onChange={event => onEditValidFlagChange(event.target.checked)}
                        />
                        <span>Mark contact as valid</span>
                      </label>
                      {typeof contact.valid === 'boolean' && (
                        <span className="text-[11px] text-slate-500">
                          Current: {contact.valid ? 'Valid' : 'Invalid'}
                        </span>
                      )}
                    </div>
                  </div>

                  {detailsError && (
                    <p className="text-xs font-medium text-rose-600">{detailsError}</p>
                  )}
                  {detailsSuccess && (
                    <p className="text-xs font-medium text-emerald-600">{detailsSuccess}</p>
                  )}

                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleSaveDetails}
                      isLoading={isSavingDetails}
                      disabled={isSavingDetails}
                    >
                      Save Changes
                    </Button>
                    <Button variant="ghost" size="sm" onClick={onReset}>
                      Reset
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
    </>
  )
}

