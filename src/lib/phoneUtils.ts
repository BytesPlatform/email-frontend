/**
 * Phone Number Normalization Utility
 * Uses libphonenumber-js for robust phone number parsing and normalization
 * 
 * Prioritizes accuracy - if a number is ambiguous, returns raw input instead of guessing
 */

import { parsePhoneNumber, isValidPhoneNumber, CountryCode } from 'libphonenumber-js'

// Default country to use when no country code is present
const DEFAULT_COUNTRY: CountryCode = 'US'

/**
 * Normalizes a phone number to E.164 format using strict parsing logic
 * 
 * @param rawInput - Raw phone number string from CSV
 * @returns Normalized phone number in E.164 format (e.g., +1234567890) or raw input string if normalization fails
 * 
 * Logic:
 * 1. If input starts with `+`, parse it. If valid, return E.164.
 * 2. If input does NOT start with `+`, try to parse it against ONLY ONE default country (US).
 *    If valid, return E.164.
 * 3. If both fail, return the rawInput string exactly as is (do not return null unless input was empty).
 */
export function normalizePhoneNumber(rawInput: string | null | undefined): string | null {
  // Handle empty/null/undefined input
  if (!rawInput || typeof rawInput !== 'string') {
    return null
  }

  // Step 1: Basic validation - check for empty or placeholder values
  const trimmed = rawInput.trim()
  if (trimmed === '' || trimmed === '-' || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') {
    return null
  }

  // Step 2: If input starts with `+`, try to parse it as international format
  if (trimmed.startsWith('+')) {
    try {
      // Clean: Keep the + and digits only
      const cleaned = '+' + trimmed.slice(1).replace(/\D/g, '')
      
      // Validate minimum length (at least 7 digits after +)
      if (cleaned.length > 1 && cleaned.slice(1).length >= 7) {
        if (isValidPhoneNumber(cleaned)) {
          const phoneNumber = parsePhoneNumber(cleaned)
          return phoneNumber.format('E.164')
        }
      }
    } catch {
      // Invalid phone number, continue to next step
    }
  }

  // Step 3: If input does NOT start with `+`, try parsing against default country (US)
  if (!trimmed.startsWith('+')) {
    try {
      // Clean: Remove all non-digit characters
      const cleaned = trimmed.replace(/\D/g, '')
      
      // Validate minimum length (at least 7 digits)
      if (cleaned.length >= 7) {
        if (isValidPhoneNumber(cleaned, DEFAULT_COUNTRY)) {
          const phoneNumber = parsePhoneNumber(cleaned, DEFAULT_COUNTRY)
          return phoneNumber.format('E.164')
        }
      }
    } catch {
      // Invalid phone number, continue to fallback
    }
  }

  // Step 4: Fallback - return raw input string exactly as is
  // This allows the UI to flag it as invalid (doesn't start with +)
  return trimmed
}

/**
 * Validates if a phone number is valid (without normalization)
 * Useful for quick validation checks
 */
export function isValidPhone(rawInput: string | null | undefined): boolean {
  return normalizePhoneNumber(rawInput) !== null
}

