/**
 * Phone Number Normalization Utility
 * Uses libphonenumber-js for robust phone number parsing and normalization
 * 
 * Tries to detect country code automatically. If no match is found, returns null
 * (user can assign country code later).
 */

import { parsePhoneNumberFromString } from 'libphonenumber-js'

/**
 * Normalizes a phone number to E.164 format using automatic country detection
 * 
 * @param rawInput - Raw phone number string from CSV
 * @returns Normalized phone number in E.164 format (e.g., +1234567890) or null if no valid match found
 * 
 * Logic:
 * 1. If input starts with `+`, try to parse it as international format (no country code needed)
 * 2. If input does NOT start with `+`, try to parse it without specifying a country (library will try to detect)
 * 3. If both fail, return null (user can assign country code later)
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
        const phoneNumber = parsePhoneNumberFromString(cleaned)
        if (phoneNumber && phoneNumber.isValid()) {
          return phoneNumber.format('E.164')
        }
      }
    } catch {
      // Invalid phone number, continue to next step
    }
  }

  // Step 3: If input does NOT start with `+`, try parsing without country code
  // The library will attempt to detect the country automatically
  if (!trimmed.startsWith('+')) {
    try {
      // Clean: Remove all non-digit characters
      const cleaned = trimmed.replace(/\D/g, '')
      
      // Validate minimum length (at least 7 digits)
      if (cleaned.length >= 7) {
        // Try parsing without country code - library will attempt auto-detection
        const phoneNumber = parsePhoneNumberFromString(cleaned)
        if (phoneNumber && phoneNumber.isValid()) {
          return phoneNumber.format('E.164')
        }
      }
    } catch {
      // Invalid phone number, continue to fallback
    }
  }

  // Step 4: No valid match found - return null
  // User can assign country code later if needed
  return null
}

/**
 * Validates if a phone number is valid (without normalization)
 * Useful for quick validation checks
 */
export function isValidPhone(rawInput: string | null | undefined): boolean {
  return normalizePhoneNumber(rawInput) !== null
}

