/**
 * Enhanced phone number normalization with country code validation
 * Ensures country codes are correctly assigned and flags ambiguous numbers
 */

import { parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js'

export interface PhoneNormalizationResult {
  normalized: string | null // E.164 format if successful
  country: string | null // Detected country code
  confidence: 'high' | 'medium' | 'low' | 'none' // Confidence level
  requiresManualAssignment: boolean // True if user must manually assign country
  warning?: string // Warning message if ambiguous
}

/**
 * Normalizes a phone number to E.164 format with country code validation
 * 
 * @param rawInput - Raw phone number string
 * @param hints - Optional hints for country detection (state, zip code, etc.)
 * @returns Normalization result with confidence level
 */
export function normalizePhoneNumberWithValidation(
  rawInput: string | null | undefined,
  hints?: { state?: string; zipCode?: string; defaultCountry?: CountryCode }
): PhoneNormalizationResult {
  // Handle empty/null/undefined input
  if (!rawInput || typeof rawInput !== 'string') {
    return {
      normalized: null,
      country: null,
      confidence: 'none',
      requiresManualAssignment: false
    }
  }

  // Step 1: Basic validation - check for empty or placeholder values
  const trimmed = rawInput.trim()
  if (trimmed === '' || trimmed === '-' || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') {
    return {
      normalized: null,
      country: null,
      confidence: 'none',
      requiresManualAssignment: false
    }
  }

  // Step 2: If input starts with `+`, parse as international format (HIGH CONFIDENCE)
  if (trimmed.startsWith('+')) {
    try {
      const cleaned = '+' + trimmed.slice(1).replace(/\D/g, '')
      
      if (cleaned.length > 1 && cleaned.slice(1).length >= 7) {
        const phoneNumber = parsePhoneNumberFromString(cleaned)
        if (phoneNumber && phoneNumber.isValid()) {
          return {
            normalized: phoneNumber.format('E.164'),
            country: phoneNumber.country || null,
            confidence: 'high', // Explicit country code = high confidence
            requiresManualAssignment: false
          }
        }
      }
    } catch {
      // Invalid phone number
    }
  }

  // Step 3: Remove all non-digit characters for parsing
  const cleaned = trimmed.replace(/\D/g, '')
  
  if (cleaned.length < 7) {
    return {
      normalized: null,
      country: null,
      confidence: 'none',
      requiresManualAssignment: true,
      warning: 'Phone number is too short. Please enter a complete number with country code.'
    }
  }

  // Step 4: Determine default country from hints
  let defaultCountry: CountryCode | undefined = hints?.defaultCountry || 'US'
  
  // Infer country from state if available
  if (hints?.state) {
    const state = hints.state.toUpperCase()
    const usStates = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 
      'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 
      'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 
      'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 
      'WA', 'WV', 'WI', 'WY', 'DC']
    const caProvinces = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT']
    
    if (usStates.includes(state)) {
      defaultCountry = 'US'
    } else if (caProvinces.includes(state)) {
      defaultCountry = 'CA'
    }
  }

  // Step 5: Try parsing with default country (MEDIUM CONFIDENCE)
  try {
    const phoneNumber = parsePhoneNumberFromString(cleaned, defaultCountry)
    if (phoneNumber && phoneNumber.isValid()) {
      const detectedCountry = phoneNumber.country
      
      // Validate: Check if detected country matches our default/hint
      const countryMatches = detectedCountry === defaultCountry
      
      // Check for test numbers (555 prefix in US)
      const isTestNumber = detectedCountry === 'US' && 
                           phoneNumber.nationalNumber.startsWith('555') &&
                           phoneNumber.nationalNumber.length === 10
      
      if (isTestNumber) {
        return {
          normalized: phoneNumber.format('E.164'),
          country: detectedCountry || null,
          confidence: 'medium',
          requiresManualAssignment: false,
          warning: 'This appears to be a US test number (555 prefix). Verify this is correct before sending SMS.'
        }
      }
      
      // If country matches hint, high confidence
      if (countryMatches && defaultCountry) {
        return {
          normalized: phoneNumber.format('E.164'),
          country: detectedCountry || null,
          confidence: 'high',
          requiresManualAssignment: false
        }
      }
      
      // Country detected but doesn't match hint - medium confidence
      return {
        normalized: phoneNumber.format('E.164'),
        country: detectedCountry || null,
        confidence: 'medium',
        requiresManualAssignment: false,
        warning: `Detected country code: ${detectedCountry || 'unknown'}. Verify this matches the contact's location.`
      }
    }
  } catch {
    // Parsing failed with default country
  }

  // Step 6: Try parsing without country (LOW CONFIDENCE - library auto-detection)
  try {
    const phoneNumber = parsePhoneNumberFromString(cleaned)
    if (phoneNumber && phoneNumber.isValid()) {
      return {
        normalized: phoneNumber.format('E.164'),
        country: phoneNumber.country || null,
        confidence: 'low',
        requiresManualAssignment: true,
        warning: 'Country code was auto-detected but may be incorrect. Please verify and manually assign if needed.'
      }
    }
  } catch {
    // Auto-detection failed
  }

  // Step 7: No valid match found - requires manual assignment
  return {
    normalized: null,
    country: null,
    confidence: 'none',
    requiresManualAssignment: true,
    warning: 'Could not automatically detect country code. Please manually select the country code.'
  }
}

/**
 * Legacy function for backward compatibility
 */
export function normalizePhoneNumber(rawInput: string | null | undefined): string | null {
  const result = normalizePhoneNumberWithValidation(rawInput)
  return result.normalized
}

/**
 * Validates if a phone number is valid (without normalization)
 * Useful for quick validation checks
 */
export function isValidPhone(rawInput: string | null | undefined): boolean {
  return normalizePhoneNumber(rawInput) !== null
}

