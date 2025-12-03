'use client'

import { useEffect, useState, useRef } from 'react'
import type { ClientContact } from '@/types/ingestion'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { parsePhoneNumberFromString, getCountryCallingCode, type CountryCode } from 'libphonenumber-js'
import PhoneInput from 'react-phone-number-input'
import type { E164Number } from 'libphonenumber-js/core'
import 'react-phone-number-input/style.css'
import { normalizePhoneNumberWithValidation } from '@/lib/phoneUtils'

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

const validatePhone = (phone: string, contactState?: string): string | null => {
  if (!phone.trim()) return null // Empty is allowed
  
  // Remove spaces, parentheses, hyphens for validation
  const cleaned = phone.trim().replace(/[\s\-\(\)\.]/g, '')
  
  // Must start with + for E.164 format (required for Twilio/Telnyx)
  if (!cleaned.startsWith('+')) {
    return 'Phone number must include country code and start with + (E.164 format, e.g., +1234567890)'
  }
  
  // Use libphonenumber-js to validate
  const parsed = parsePhoneNumberFromString(cleaned)
  
  if (!parsed) {
    return 'Please enter a valid phone number in E.164 format (e.g., +1234567890)'
  }
  
  const nationalNumber = parsed.nationalNumber
  
  // If the number can be parsed but isValid() returns false, allow it with a warning
  // This handles test numbers (like 555), invalid ranges, etc.
  // The warning will be shown separately via phoneWarning state
  // We only return errors for format issues, not validity issues
  
  // Ensure it's in E.164 format
  const e164Format = parsed.format('E.164')
  if (!e164Format.startsWith('+')) {
    return 'Phone number must be in E.164 format with country code (e.g., +1234567890)'
  }
  
  // Validate country code matches contact's state if available
  if (contactState && parsed.country) {
    const state = contactState.toUpperCase()
    const usStates = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 
      'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 
      'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 
      'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 
      'WA', 'WV', 'WI', 'WY', 'DC']
    const caProvinces = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT']
    
    if (usStates.includes(state) && parsed.country !== 'US') {
      return `Warning: Contact is in ${state} (US) but phone number has country code ${parsed.country}. Please verify.`
    }
    if (caProvinces.includes(state) && parsed.country !== 'CA') {
      return `Warning: Contact is in ${state} (CA) but phone number has country code ${parsed.country}. Please verify.`
    }
  }
  
  // Check minimum length (at least 7 digits for national number)
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

  // Add state for phone warnings
  const [phoneWarning, setPhoneWarning] = useState<string | null>(null)
  const [phoneConfidence, setPhoneConfidence] = useState<'high' | 'medium' | 'low' | 'none'>('high')
  
  // Track manually selected country code to prevent auto-detection from overriding it
  const [selectedCountry, setSelectedCountry] = useState<CountryCode | undefined>(undefined)

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

  // Initialize selected country from current phone number
  useEffect(() => {
    if (editPhone && editPhone.trim() && editPhone.startsWith('+')) {
      try {
        const cleaned = editPhone.trim().replace(/[\s\-\(\)\.]/g, '')
        const parsed = parsePhoneNumberFromString(cleaned)
        if (parsed && parsed.country) {
          setSelectedCountry(parsed.country)
        }
      } catch {
        // If parsing fails, don't set country
      }
    } else if (!editPhone || !editPhone.trim()) {
      // If phone is empty, reset selected country
      setSelectedCountry(undefined)
    }
  }, [editPhone])

  // Phone input refs - must be declared before any conditional returns
  const phoneInputRef = useRef<HTMLDivElement>(null)
  const phoneInputRef2 = useRef<HTMLDivElement>(null)

  // Save handlers
  const handleSave = async () => {
    // Validate all fields before saving
    const errors = {
      website: validateWebsite(editWebsite),
      email: validateEmail(editEmail),
      phone: editPhone ? validatePhone(editPhone, contact?.state) : null,
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
      phone: editPhone ? validatePhone(editPhone, contact?.state) : null,
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
    // Remove any numbers - only allow text/string characters
    const textOnly = value.replace(/[0-9]/g, '')
    // Limit to 20 characters
    const limited = textOnly.slice(0, 20)
    onEditStateChange(limited)
    const error = validateState(limited)
    setValidationErrors(prev => ({ ...prev, state: error }))
  }

  // Handler for country code changes - preserves phone number digits when switching countries
  const handleCountryChange = (country: CountryCode | undefined) => {
    if (country) {
      setSelectedCountry(country)
      
      // If there's an existing phone number, preserve the digits and apply the new country code
      if (editPhone && editPhone.trim()) {
        try {
          // Extract digits from current phone number (remove country code if present)
          let digitsOnly = editPhone.replace(/\D/g, '')
          
          // If the phone starts with +, we need to remove the old country code digits
          if (editPhone.startsWith('+')) {
            try {
              const oldParsed = parsePhoneNumberFromString(editPhone.trim().replace(/[\s\-\(\)\.]/g, ''))
              if (oldParsed && oldParsed.nationalNumber) {
                // Use only the national number (without country code)
                digitsOnly = oldParsed.nationalNumber
              }
            } catch {
              // If parsing fails, use all digits
            }
          }
          
          // If we have digits, try to format with the new country code
          if (digitsOnly.length > 0) {
            // Try parsing with the new country code
            const parsed = parsePhoneNumberFromString(digitsOnly, country)
            if (parsed) {
              const newPhoneValue = parsed.format('E.164')
              onEditPhoneChange(newPhoneValue)
              return
            }
            // If parsing fails (e.g., number too short), the PhoneInput component
            // will handle formatting as the user continues typing
            // We don't need to manually construct E.164 here
          }
        } catch {
          // If parsing fails, keep the current value
          // The PhoneInput component will handle the formatting
        }
      }
    } else {
      setSelectedCountry(undefined)
    }
  }

  // Update handlePhoneChange to check warnings and normalize to E.164 format
  // CRITICAL: If a country is manually selected, we MUST preserve it and prevent auto-detection
  const handlePhoneChange = (value: E164Number | string | undefined) => {
    let phoneValue = value || ''
    
    // If we have a manually selected country, we MUST use it and prevent auto-detection
    if (selectedCountry && phoneValue.trim()) {
      try {
        // Extract digits from the phone value
        let digitsOnly = phoneValue.replace(/\D/g, '')
        
        // If phone starts with +, check if it matches our selected country
        if (phoneValue.startsWith('+')) {
          const cleaned = phoneValue.trim().replace(/[\s\-\(\)\.]/g, '')
          const parsed = parsePhoneNumberFromString(cleaned)
          
          // CRITICAL: If the parsed country is different from selectedCountry, force it back
          if (parsed && parsed.country && parsed.country !== selectedCountry) {
            // Auto-detection tried to change the country - we MUST prevent this
            // Extract the national number and re-parse with our selected country
            if (parsed.nationalNumber) {
              digitsOnly = parsed.nationalNumber
            } else {
              // Fallback: try parsing with selectedCountry
              try {
                const tempParsed = parsePhoneNumberFromString(cleaned, selectedCountry)
                if (tempParsed && tempParsed.nationalNumber) {
                  digitsOnly = tempParsed.nationalNumber
                }
              } catch {
                // If that fails, try to extract digits after the country code
                const selectedCallingCode = getCountryCallingCode(selectedCountry)
                if (cleaned.startsWith(`+${selectedCallingCode}`)) {
                  digitsOnly = cleaned.slice(`+${selectedCallingCode}`.length)
                }
              }
            }
          } else if (parsed && parsed.nationalNumber) {
            // Country matches or couldn't be determined - use national number
            digitsOnly = parsed.nationalNumber
          }
        }
        
        // Now parse with the manually selected country to ensure it stays locked
        if (digitsOnly.length > 0) {
          const parsed = parsePhoneNumberFromString(digitsOnly, selectedCountry)
          if (parsed) {
            // Force the country to be our selected country
            phoneValue = parsed.format('E.164')
            // CRITICAL: Ensure selectedCountry stays the same (don't let auto-detection change it)
            // Don't update selectedCountry here - it's already set manually
          } else {
            // If parsing fails, construct E.164 manually with selected country
            // Get the country calling code for the selected country
            try {
              const callingCode = getCountryCallingCode(selectedCountry)
              if (callingCode && digitsOnly.length >= 7) {
                phoneValue = `+${callingCode}${digitsOnly}`
              }
            } catch {
              // If that fails, keep the value as is
            }
          }
        }
      } catch {
        // If parsing fails, keep the original value
      }
    } else if (phoneValue.trim()) {
      // No manually selected country - allow normal parsing
      try {
        // If phone starts with +, try to parse and format to E.164
        if (phoneValue.startsWith('+')) {
          const cleaned = phoneValue.trim().replace(/[\s\-\(\)\.]/g, '')
          const parsed = parsePhoneNumberFromString(cleaned)
          if (parsed) {
            // Format to E.164 to ensure consistent format
            phoneValue = parsed.format('E.164')
            
            // Update selected country from parsed phone number
            // This tracks the country code that was detected/selected
            if (parsed.country) {
              setSelectedCountry(parsed.country)
            }
          }
        } else {
          // Phone doesn't have + prefix - try to normalize with hints
          const normalizationResult = normalizePhoneNumberWithValidation(phoneValue, {
            state: editState,
            zipCode: editZipCode,
            defaultCountry: 'US'
          })
          
          // If normalization succeeded and produced E.164 format, use it
          if (normalizationResult.normalized && normalizationResult.normalized.startsWith('+')) {
            phoneValue = normalizationResult.normalized
            // Don't update selectedCountry here - let user manually select if needed
          }
          // Otherwise, keep the original value and let the user select country code
        }
      } catch {
        // If parsing fails, keep the original value
      }
    } else {
      // Phone value is empty - clear selected country only if it wasn't manually set
      // Actually, keep it - user might want to keep the country selected
    }
    
    // Store the normalized phone value
    onEditPhoneChange(phoneValue)
    
    // Check for warnings using enhanced validation
    if (phoneValue.trim()) {
      // If phone doesn't start with +, try to normalize it
      if (!phoneValue.startsWith('+') && phoneValue.trim()) {
        // User is entering number without country code - that's okay, they can select it
        // Just validate format
        const digitsOnly = phoneValue.replace(/\D/g, '')
        if (digitsOnly.length < 7) {
          setPhoneWarning('Phone number is too short. Please enter complete number and select country code.')
          setPhoneConfidence('none')
        } else {
          setPhoneWarning('Please select country code from dropdown to complete phone number.')
          setPhoneConfidence('low')
        }
      } else {
        // Phone has +, validate it
        const cleaned = phoneValue.trim().replace(/[\s\-\(\)\.]/g, '')
        if (cleaned.startsWith('+')) {
          try {
            const parsed = parsePhoneNumberFromString(cleaned)
            if (parsed) {
              // Check if the number is invalid according to libphonenumber
              // If it can be parsed but isValid() is false, show a warning
              if (!parsed.isValid()) {
                setPhoneWarning('This phone number may not be valid or deliverable (e.g., test numbers, invalid ranges). Please verify before sending SMS.')
                setPhoneConfidence('medium')
              } else {
                // Number is valid, check for other warnings via normalization
                const normalizationResult = normalizePhoneNumberWithValidation(phoneValue, {
                  state: editState,
                  zipCode: editZipCode,
                  defaultCountry: 'US'
                })
                
                if (normalizationResult.warning) {
                  setPhoneWarning(normalizationResult.warning)
                  setPhoneConfidence(normalizationResult.confidence)
                } else {
                  setPhoneWarning(null)
                  setPhoneConfidence('high')
                }
              }
            } else {
              setPhoneWarning('Could not parse phone number. Please check the format.')
              setPhoneConfidence('none')
            }
          } catch {
            setPhoneWarning('Could not parse phone number. Please check the format.')
            setPhoneConfidence('none')
          }
        } else {
          // Try normalization for numbers without +
          const normalizationResult = normalizePhoneNumberWithValidation(phoneValue, {
            state: editState,
            zipCode: editZipCode,
            defaultCountry: 'US'
          })
          
          if (normalizationResult.warning) {
            setPhoneWarning(normalizationResult.warning)
            setPhoneConfidence(normalizationResult.confidence)
          } else {
            setPhoneWarning(null)
            setPhoneConfidence('high')
          }
        }
      }
    } else {
      setPhoneWarning(null)
      setPhoneConfidence('high')
    }
    
    const error = phoneValue ? validatePhone(phoneValue, contact?.state) : null
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
        .phone-input-wrapper.phone-input-warning .PhoneInput {
          border-color: #f59e0b;
          background-color: rgba(254, 243, 199, 0.5);
        }
        .phone-input-wrapper.phone-input-warning .PhoneInput:focus-within {
          border-color: #f59e0b;
          outline-color: rgba(245, 158, 11, 0.2);
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
                      <div ref={phoneInputRef} className={`phone-input-wrapper ${validationErrors.phone ? 'phone-input-error' : phoneWarning ? 'phone-input-warning' : ''}`}>
                        <PhoneInput
                          international
                          defaultCountry="US"
                          country={selectedCountry}
                          value={editPhone ? (editPhone.startsWith('+') ? (editPhone as E164Number) : editPhone as string) : undefined}
                          onChange={handlePhoneChange}
                          onCountryChange={handleCountryChange}
                          placeholder="Enter phone number with country code"
                        />
                      </div>
                      {validationErrors.phone && (
                        <p className="text-xs text-rose-600 mt-1">{validationErrors.phone}</p>
                      )}
                      {!validationErrors.phone && phoneWarning && (
                        <p className="text-xs text-amber-600 mt-1 flex items-center space-x-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <span>{phoneWarning}</span>
                        </p>
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
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setValidationErrors({})
                        onReset()
                      }}
                    >
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
                      <div ref={phoneInputRef2} className={`phone-input-wrapper ${validationErrors.phone ? 'phone-input-error' : phoneWarning ? 'phone-input-warning' : ''}`}>
                        <PhoneInput
                          international
                          defaultCountry="US"
                          country={selectedCountry}
                          value={editPhone ? (editPhone.startsWith('+') ? (editPhone as E164Number) : editPhone as string) : undefined}
                          onChange={handlePhoneChange}
                          onCountryChange={handleCountryChange}
                          placeholder="Enter phone number with country code"
                        />
                      </div>
                      {validationErrors.phone && (
                        <p className="text-xs text-rose-600 mt-1">{validationErrors.phone}</p>
                      )}
                      {!validationErrors.phone && phoneWarning && (
                        <p className="text-xs text-amber-600 mt-1 flex items-center space-x-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <span>{phoneWarning}</span>
                        </p>
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
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setValidationErrors({})
                        onReset()
                      }}
                    >
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

