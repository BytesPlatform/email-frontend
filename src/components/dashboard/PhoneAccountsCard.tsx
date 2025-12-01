'use client'

import { useState, useEffect, useRef } from 'react'
import PhoneInput from 'react-phone-number-input'
import type { E164Number } from 'libphonenumber-js/core'
import { parsePhoneNumberFromString } from 'libphonenumber-js'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { clientAccountsApi, ClientSms } from '@/api/clientAccounts'
import { canResendOtp, resendCountdown } from '@/lib/phone'
import 'react-phone-number-input/style.css'
import React from 'react'

const verificationChip: Record<ClientSms['verificationStatus'], string> = {
  verified: 'bg-green-100 text-green-800',
  pending: 'bg-amber-100 text-amber-800',
  expired: 'bg-slate-200 text-slate-700',
  rejected: 'bg-red-100 text-red-700',
}

export function PhoneAccountsCard() {
  const [phoneNumbers, setPhoneNumbers] = useState<ClientSms[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState<E164Number | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; phoneId: number | null; phoneNumber: string; verificationId: number | null }>({
    isOpen: false,
    phoneId: null,
    phoneNumber: '',
    verificationId: null,
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({}) // Use string key to support both id and verificationId
  const [otpVerifying, setOtpVerifying] = useState<Record<string, boolean>>({})
  const [otpSending, setOtpSending] = useState<Record<string, boolean>>({})
  const phoneInputRef = useRef<HTMLDivElement>(null)
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    loadPhoneNumbers()
  }, [])

  // Auto-clear notice messages after 5 seconds
  useEffect(() => {
    if (!notice) {
      // If notice is cleared, clean up any existing timer
      if (noticeTimerRef.current) {
        clearTimeout(noticeTimerRef.current)
        noticeTimerRef.current = null
      }
      return
    }

    // Clear any existing timer before setting a new one
    if (noticeTimerRef.current) {
      clearTimeout(noticeTimerRef.current)
    }

    // Set a new timer to clear the notice after 5 seconds
    noticeTimerRef.current = setTimeout(() => {
      setNotice(null)
      noticeTimerRef.current = null
    }, 5000)

    // Cleanup function - runs when notice changes or component unmounts
    return () => {
      if (noticeTimerRef.current) {
        clearTimeout(noticeTimerRef.current)
        noticeTimerRef.current = null
      }
    }
  }, [notice])

  // Force dropdown to open downward and add overlay
  useEffect(() => {
    const forceDropdownDown = () => {
      const options = document.querySelectorAll('.PhoneInputCountryOptions')
      options.forEach((option) => {
        const element = option as HTMLElement
        // Remove any bottom positioning
        if (element.style.bottom) {
          element.style.bottom = ''
        }
        // Force top positioning
        const select = element.closest('.PhoneInputCountry')?.querySelector('.PhoneInputCountrySelect') as HTMLElement
        if (select) {
          const rect = select.getBoundingClientRect()
          element.style.top = `${rect.height + 4}px`
          element.style.bottom = 'auto'
          element.style.transform = 'none'
          element.style.position = 'absolute'
        }
      })

      // Add overlay when dropdown is open
      const isOpen = document.querySelector('.PhoneInputCountrySelect[aria-expanded="true"]')
      if (isOpen && !document.querySelector('.phone-dropdown-overlay')) {
        const overlay = document.createElement('div')
        overlay.className = 'phone-dropdown-overlay'
        overlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 999;
          background: transparent;
        `
        overlay.addEventListener('click', () => {
          const select = document.querySelector('.PhoneInputCountrySelect[aria-expanded="true"]') as HTMLElement
          if (select) {
            select.click() // Close dropdown
          }
        })
        document.body.appendChild(overlay)
      } else if (!isOpen) {
        const overlay = document.querySelector('.phone-dropdown-overlay')
        if (overlay) {
          overlay.remove()
        }
      }
    }

    // Run on mount and after any DOM changes
    forceDropdownDown()
    const observer = new MutationObserver(forceDropdownDown)
    if (phoneInputRef.current) {
      observer.observe(phoneInputRef.current, { childList: true, subtree: true, attributes: true })
    }

    // Also listen for click events
    document.addEventListener('click', forceDropdownDown)

    return () => {
      observer.disconnect()
      document.removeEventListener('click', forceDropdownDown)
      const overlay = document.querySelector('.phone-dropdown-overlay')
      if (overlay) {
        overlay.remove()
      }
    }
  }, [])

  const loadPhoneNumbers = async () => {
    setIsLoading(true)
    setError(null)
    // Don't clear notice here - let the timer handle it
    try {
      const response = await clientAccountsApi.getClientSms()
      if (response.success && response.data) {
        setPhoneNumbers(response.data)
      } else {
        setError(response.error || 'Failed to load phone numbers')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load phone numbers')
    } finally {
      setIsLoading(false)
    }
  }

  // Get unique identifier for a phone (id or verificationId)
  const getPhoneIdentifier = (phone: ClientSms): string => {
    return phone.id !== null ? `id_${phone.id}` : `verification_${phone.verificationId || 'unknown'}`
  }

  // Get the numeric ID to use for API calls
  const getPhoneApiId = (phone: ClientSms): number => {
    return phone.id !== null ? phone.id : (phone.verificationId || 0)
  }

  const handlePhoneNumberChange = (value: E164Number | undefined) => {
    // Validate and truncate if needed (safety check)
    if (value) {
      try {
        const parsed = parsePhoneNumberFromString(value as string)
        if (parsed && parsed.nationalNumber) {
          const nationalNumber = parsed.nationalNumber.toString()
          // If exceeds 10 digits, don't update (this shouldn't happen due to keydown handler)
          if (nationalNumber.length > 10) {
            return
          }
        }
      } catch (err) {
        // If parsing fails, allow the value
      }
    }
    setPhoneNumber(value)
  }

  const handlePhonePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text')
    const target = e.currentTarget
    const currentValue = target.value || ''
    
    // Get selection
    const selectionStart = target.selectionStart || 0
    const selectionEnd = target.selectionEnd || 0
    
    // Calculate what the new value would be
    const newValue = currentValue.slice(0, selectionStart) + pastedText + currentValue.slice(selectionEnd)
    
    // Parse to check digit count
    try {
      const parsed = parsePhoneNumberFromString(newValue)
      if (parsed && parsed.nationalNumber) {
        const nationalNumber = parsed.nationalNumber.toString()
        // If paste would exceed 10 digits, prevent it
        if (nationalNumber.length > 10) {
          e.preventDefault()
          e.stopPropagation()
          return
        }
      }
    } catch (err) {
      // If parsing fails, allow the paste
    }
  }

  const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle Enter key
    if (e.key === 'Enter' && phoneNumber) {
      handleAddPhone()
      return
    }

    // Allow all non-digit keys (backspace, delete, arrows, etc.)
    const isNonDigitKey = 
      !/^\d$/.test(e.key) ||
      e.ctrlKey ||
      e.metaKey ||
      e.altKey ||
      ['Backspace', 'Delete', 'Tab', 'Escape', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)
    
    if (isNonDigitKey) {
      return // Allow these keys
    }

    // For digit keys, check the actual input value to count digits
    if (/^\d$/.test(e.key)) {
      const target = e.currentTarget
      const currentValue = target.value || ''
      
      // Get selection to understand if we're replacing or inserting
      const selectionStart = target.selectionStart || 0
      const selectionEnd = target.selectionEnd || 0
      const isReplacing = selectionStart !== selectionEnd
      
      // Calculate what the value would be after this keypress
      let newValue: string
      if (isReplacing) {
        newValue = currentValue.slice(0, selectionStart) + e.key + currentValue.slice(selectionEnd)
      } else {
        newValue = currentValue.slice(0, selectionStart) + e.key + currentValue.slice(selectionStart)
      }
      
      // Parse the new value to count national number digits
      try {
        const parsed = parsePhoneNumberFromString(newValue)
        if (parsed && parsed.nationalNumber) {
          const nationalNumber = parsed.nationalNumber.toString()
          // If this would exceed 10 digits, prevent the input
          if (nationalNumber.length > 10) {
            e.preventDefault()
            e.stopPropagation()
            return
          }
        }
      } catch (err) {
        // If parsing fails, allow the input
      }
    }
  }

  const handleAddPhone = async () => {
    if (!phoneNumber) {
      setError('Please enter a phone number.')
      return
    }

    // Validate phone number format and length
    const parsed = parsePhoneNumberFromString(phoneNumber as string)
    if (!parsed || !parsed.isValid()) {
      setError('Please enter a valid phone number.')
      return
    }

    // Check that national number is exactly 10 digits
    const nationalNumber = parsed.nationalNumber
    if (nationalNumber.length !== 10) {
      setError('Phone number must be exactly 10 digits after the country code.')
      return
    }

    setIsAdding(true)
    setError(null)
    setNotice(null)
    try {
      // Extract country code properly using libphonenumber-js
      const countryCode = parsed.country || 'US'
      
      const response = await clientAccountsApi.createClientSms({
        phoneNumber: phoneNumber as string,
        countryCode,
      })
      if (response.success && response.data) {
        setPhoneNumbers([response.data, ...phoneNumbers])
        setPhoneNumber(undefined)
        setNotice('OTP sent via SMS. Enter it below to activate this number.')
      } else {
        let errorMessage = response.error || 'Failed to add phone number'
          if (errorMessage.includes('already exists')) {
            errorMessage = 'This phone number is already registered for your account.'
        }
        setError(errorMessage)
      }
    } catch (err) {
      let errorMessage = 'Failed to add phone number'
      if (err instanceof Error) {
        errorMessage = err.message
        if (errorMessage.includes('already exists')) {
          errorMessage = 'This phone number is already registered for your account.'
        } else if (errorMessage.includes('BadRequestException')) {
          errorMessage = errorMessage.replace(/BadRequestException:\s*/g, '').split('\n')[0]
        }
      }
      setError(errorMessage)
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeleteClick = (phone: ClientSms) => {
    const phoneId = phone.id
    const phoneNumber = phone.phoneNumber
    const verificationId = phone.verificationId

    if (phoneId === null && verificationId === null) {
      setError('Cannot delete this entry. Missing identifiers.')
      return
    }
    setDeleteDialog({ isOpen: true, phoneId, phoneNumber, verificationId: verificationId || null })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.phoneId && !deleteDialog.verificationId) return
    setIsDeleting(true)
    setError(null)
    setNotice(null)
    try {
      let response
      if (deleteDialog.phoneId !== null) {
        // Delete verified phone number
        response = await clientAccountsApi.deleteClientSms(deleteDialog.phoneId)
        if (response.success) {
          setPhoneNumbers(phoneNumbers.filter(phone => phone.id !== deleteDialog.phoneId))
        }
      } else if (deleteDialog.verificationId !== null) {
        // Delete pending verification
        response = await clientAccountsApi.deletePendingSmsVerification(deleteDialog.verificationId)
        if (response.success) {
          setPhoneNumbers(phoneNumbers.filter(phone => phone.verificationId !== deleteDialog.verificationId))
        }
      }
      
      if (response && response.success) {
        setDeleteDialog({ isOpen: false, phoneId: null, phoneNumber: '', verificationId: null })
        setNotice('Phone number deleted successfully.')
      } else {
        setError(response?.error || 'Failed to delete phone number')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete phone number')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteDialog({ isOpen: false, phoneId: null, phoneNumber: '', verificationId: null })
  }

  const updatePhone = (identifier: string, updater: (phone: ClientSms) => ClientSms) => {
    setPhoneNumbers(prev => prev.map(phone => {
      const phoneKey = getPhoneIdentifier(phone)
      return phoneKey === identifier ? updater(phone) : phone
    }))
  }

  const handleVerifyOtp = async (phone: ClientSms) => {
    const identifier = getPhoneIdentifier(phone)
    const code = otpInputs[identifier]?.trim()
    if (!code) {
      setError('Enter the verification code before submitting.')
      return
    }

    const apiId = getPhoneApiId(phone)
    setOtpVerifying(prev => ({ ...prev, [identifier]: true }))
    setError(null)
    setNotice(null)

    try {
      const response = await clientAccountsApi.verifySmsOtp(apiId, code)
      if (!response.success) {
        throw new Error(response.error || 'Failed to verify phone number')
      }

      // Reload phones to get the updated record with the new id
      await loadPhoneNumbers()
      setOtpInputs(prev => ({ ...prev, [identifier]: '' }))
      setNotice('Phone number verified. SMS sending enabled.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify phone number')
    } finally {
      setOtpVerifying(prev => ({ ...prev, [identifier]: false }))
    }
  }

  const handleRequestOtp = async (phone: ClientSms) => {
    const identifier = getPhoneIdentifier(phone)
    const apiId = getPhoneApiId(phone)
    setOtpSending(prev => ({ ...prev, [identifier]: true }))
    setError(null)
    setNotice(null)
    try {
      const response = await clientAccountsApi.requestSmsOtp(apiId)
      if (!response.success) {
        throw new Error(response.error || 'Failed to send verification code')
      }
      updatePhone(identifier, phone => ({
        ...phone,
        verificationStatus: 'pending',
        lastOtpSentAt: new Date().toISOString(),
      }))
      setNotice('Verification code sent via SMS.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code')
    } finally {
      setOtpSending(prev => ({ ...prev, [identifier]: false }))
    }
  }

  return (
    <Card variant="elevated">
      <CardHeader
        title="Phone Numbers"
        subtitle="Verify sending numbers with OTP before launching SMS"
        icon={
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        }
      />
      <CardContent>
        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
        {notice && (
          <div className="mb-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-700 text-sm">
            {notice}
          </div>
        )}

        <div className="space-y-3">
          <style>{`
            /* Phone Input Container - Single unified box */
            .phone-input-wrapper {
              display: flex;
              flex: 1;
              align-items: stretch;
              gap: 0;
              position: relative;
            }

            /* Main PhoneInput component */
            .phone-input-wrapper .PhoneInput {
              display: flex !important;
              width: 100% !important;
              align-items: stretch !important;
              gap: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              justify-content: flex-start !important;
            }

            /* PhoneInputCountry wrapper - remove it from layout (display: contents) but keep structure for library */
            .phone-input-wrapper .PhoneInputCountry {
              display: contents !important;
            }
            
            /* Since we removed the wrapper, we need to position flag relative to PhoneInputCountrySelect */
            .phone-input-wrapper .PhoneInput {
              position: relative !important;
            }

            /* Country selector button - now contains flag inside */
            .phone-input-wrapper .PhoneInputCountrySelect {
              position: relative !important;
              width: 140px !important;
              height: 42px !important;
              margin: 0 !important;
              padding: 8px 12px 8px 40px !important;
              border: 1px solid #cbd5e1 !important;
              border-right: none !important;
              border-top-left-radius: 0.5rem !important;
              border-bottom-left-radius: 0.5rem !important;
              border-top-right-radius: 0 !important;
              border-bottom-right-radius: 0 !important;
              background: #FFFFFF !important;
              font-size: 0.875rem !important;
              display: flex !important;
              align-items: center !important;
              justify-content: flex-start !important;
              gap: 0.5rem !important;
              cursor: pointer !important;
              transition: all 0.2s ease !important;
            }

            .phone-input-wrapper .PhoneInputCountrySelect:hover {
              border-color: #6366f1 !important;
            }

            .phone-input-wrapper .PhoneInputCountrySelect:focus {
              outline: none !important;
              border-color: #6366f1 !important;
              box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2) !important;
            }

            /* Flag icon - positioned absolutely inside the select element (relative to PhoneInput) */
            .phone-input-wrapper .PhoneInputCountryIcon {
              position: absolute !important;
              left: 50px !important;
              top: 50% !important;
              transform: translateY(-50%) !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              flex-shrink: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              z-index: 2 !important;
              pointer-events: none !important;
              background: transparent !important;
              box-shadow: none !important;
              border: none !important;
            }

            .phone-input-wrapper .PhoneInputCountryIcon img {
              image-rendering: -webkit-optimize-contrast !important;
              image-rendering: crisp-edges !important;
              image-rendering: -moz-crisp-edges !important;
              width: 30px !important;
              height: 20px !important;
              object-fit: cover !important;
              display: block !important;
              margin: 0 !important;
              padding: 0 !important;
              background: transparent !important;
              box-shadow: none !important;
              border: none !important;
              outline: none !important;
            }

            /* Dropdown arrow - visible, positioned bottom right, properly styled */
            .phone-input-wrapper .PhoneInputCountrySelectArrow {
              transition: transform 0.2s ease !important;
              opacity: 0.7 !important;
              margin-left: -28px !important;
              margin-right: 20px !important;
              flex-shrink: 0 !important;
              width: 8px !important;
              height: 8px !important;
              display: block !important;
              align-self: flex-end !important;
              margin-top: auto !important;
              margin-bottom: 3px !important;
              position: relative !important;
              z-index: 1 !important;
              color: #64748b !important;
              fill: currentColor !important;
            }

            .phone-input-wrapper .PhoneInputCountrySelectArrow svg {
              width: 8px !important;
              height: 8px !important;
              display: block !important;
            }

            .phone-input-wrapper .PhoneInputCountrySelect[aria-expanded="true"] .PhoneInputCountrySelectArrow {
              transform: rotate(180deg) !important;
            }

            /* Dropdown options - always opens downward */
            .phone-input-wrapper .PhoneInputCountryOptions {
              position: absolute !important;
              top: calc(100% + 4px) !important;
              bottom: auto !important;
              left: 0 !important;
              right: auto !important;
              margin-top: 0 !important;
              max-height: 300px !important;
              overflow-y: auto !important;
              z-index: 1000 !important;
              box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
              border-radius: 0.5rem !important;
              background: white !important;
              border: 1px solid #cbd5e1 !important;
              width: 100% !important;
              min-width: 200px !important;
              transform: none !important;
            }

            /* Prevent any upward opening */
            .phone-input-wrapper .PhoneInputCountryOptions[style*="bottom"] {
              top: calc(100% + 4px) !important;
              bottom: auto !important;
            }

            .phone-input-wrapper .PhoneInputCountryOptions[style*="transform"] {
              transform: none !important;
            }

            /* Phone number input field - RIGHT PART */
            .phone-input-wrapper .PhoneInputInput {
              flex: 1 !important;
              height: 42px !important;
              padding: 8px 16px !important;
              border: 1px solid #cbd5e1 !important;
              border-left: 1px solid #e2e8f0 !important;
              border-radius: 0 0.5rem 0.5rem 0 !important;
              outline: none !important;
              font-size: 0.875rem !important;
              text-align: left !important;
              margin: 0 !important;
              background: #FFFFFF !important;
              transition: all 0.2s ease !important;
            }
            
            /* Visual separator overlay between dropdown and input */
            .phone-input-wrapper::after {
              content: '' !important;
              position: absolute !important;
              left: 30% !important;
              top: 0 !important;
              bottom: 0 !important;
              width: 1px !important;
              background: #e2e8f0 !important;
              z-index: 5 !important;
              pointer-events: none !important;
            }

            .phone-input-wrapper .PhoneInputInput:hover {
              border-color: #6366f1 !important;
            }

            .phone-input-wrapper .PhoneInputInput:focus {
              outline: none !important;
              border-color: transparent !important;
              box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.5) !important;
            }
            
            /* Remove any black highlighting/selection */
            .phone-input-wrapper .PhoneInputCountrySelect::selection,
            .phone-input-wrapper .PhoneInputInput::selection {
              background: rgba(99, 102, 241, 0.2) !important;
              color: inherit !important;
            }
            
            .phone-input-wrapper .PhoneInputCountrySelect::-moz-selection,
            .phone-input-wrapper .PhoneInputInput::-moz-selection {
              background: rgba(99, 102, 241, 0.2) !important;
              color: inherit !important;
            }
            
            /* Remove any background color changes on focus/active */
            .phone-input-wrapper .PhoneInputCountrySelect:active,
            .phone-input-wrapper .PhoneInputInput:active {
              background: white !important;
            }
            
            /* Ensure no black borders or outlines */
            .phone-input-wrapper .PhoneInputCountrySelect,
            .phone-input-wrapper .PhoneInputInput {
              -webkit-tap-highlight-color: transparent !important;
            }

            /* When country selector is focused, ensure input border matches */
            .phone-input-wrapper .PhoneInputCountrySelect:focus ~ .PhoneInputInput {
              border-color: transparent !important;
            }
            
            /* When phone input is focused, ensure country selector border matches */
            .phone-input-wrapper .PhoneInputInput:focus ~ *,
            .phone-input-wrapper:has(.PhoneInputInput:focus) .PhoneInputCountrySelect {
              border-color: transparent !important;
            }
            
            /* Hide separator on focus */
            .phone-input-wrapper:focus-within::after {
              display: none !important;
            }

            /* Overlay for dropdown (handled by JS, but style here for reference) */
            .phone-dropdown-overlay {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              z-index: 999;
              background: transparent;
            }
          `}</style>
          <div className="flex gap-2">
            <div ref={phoneInputRef} className="phone-input-wrapper flex-1">
              <PhoneInput
                international
                defaultCountry="US"
                value={phoneNumber}
                onChange={handlePhoneNumberChange}
                placeholder="Enter phone number"
                disabled={isAdding}
                onKeyDown={handlePhoneKeyDown}
                onPaste={handlePhonePaste}
            />
            </div>
            <Button
              onClick={handleAddPhone}
              disabled={isAdding || !phoneNumber} 
              className="whitespace-nowrap flex-shrink-0"
            >
              {isAdding ? 'Adding...' : 'Add'}
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-slate-500">Loading phone numbers...</div>
          ) : phoneNumbers.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No phone numbers added yet. Add your first phone number above.</div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {phoneNumbers.map((phone) => {
                const identifier = getPhoneIdentifier(phone)
                const canResend = canResendOtp(phone.lastOtpSentAt)
                const countdown = resendCountdown(phone.lastOtpSentAt)
                const otpInput = otpInputs[identifier] || ''
                return (
                  <div key={identifier} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-slate-900 truncate">{phone.phoneNumber}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              phone.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                        {phone.status}
                      </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${verificationChip[phone.verificationStatus]}`}
                          >
                            {phone.verificationStatus}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                          Sent: {phone.currentCounter}{' '}
                          {phone.limit !== null ? `/ ${phone.limit}` : '(unlimited)'} SMS
                    </div>
                  </div>
                      {/* Show delete button for all phones (verified or pending) */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(phone)}
                        className="text-red-600 hover:text-red-700 hover:border-red-300"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </Button>
                    </div>

                    {phone.verificationStatus !== 'verified' && (
                      <div className="rounded-md bg-white border border-dashed border-slate-200 p-3 text-xs text-slate-600 space-y-2">
                        <p>Enter the 6-digit OTP delivered via SMS.</p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={otpInput}
                            onChange={(e) => setOtpInputs(prev => ({ ...prev, [identifier]: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                            placeholder="123456"
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <Button
                            variant="primary"
                            onClick={() => handleVerifyOtp(phone)}
                            disabled={otpInput.length < 4 || otpVerifying[identifier]}
                          >
                            {otpVerifying[identifier] ? 'Verifying...' : 'Verify'}
                          </Button>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRequestOtp(phone)}
                          disabled={otpSending[identifier] || !canResend}
                          className={`text-xs font-medium ${
                            canResend ? 'text-indigo-600 hover:text-indigo-700' : 'text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {otpSending[identifier]
                            ? 'Sending code...'
                            : canResend
                              ? 'Resend code'
                              : `Resend available in ${countdown}s`}
                        </button>
                      </div>
                    )}
                </div>
                )
              })}
            </div>
          )}
        </div>
      </CardContent>

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Delete Phone Number"
        message={`Are you sure you want to delete ${deleteDialog.phoneNumber}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isLoading={isDeleting}
      />
    </Card>
  )
}
