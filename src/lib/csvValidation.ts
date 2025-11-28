/**
 * Validation utilities for CSV column mapping
 * Provides heuristic validation to prevent incorrect column mappings
 */

// Regex patterns for validation
export const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/i,
  website: /^(https?:\/\/)?(www\.)?[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,}(\/.*)?$/i,
  phone: /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}[-\s\.]?[0-9]{1,9}$/,
  zipcode: /^[a-z0-9\s-]{3,10}$/i, // Supports US zipcodes (5 digits) and international formats
  state: /^[a-z]{2}$/i, // 2-letter state codes (US)
  stateName: /^[a-z\s]{2,30}$/i, // Full state names
}

// Keywords for auto-mapping (fuzzy matching)
export const AUTO_MAPPING_KEYWORDS: Record<string, string[]> = {
  business_name: ['business', 'company', 'name', 'organization', 'org', 'firm', 'corp', 'inc', 'llc'],
  email: ['email', 'e-mail', 'mail', 'e_mail', 'email_address', 'contact_email'],
  phone_number: ['phone', 'telephone', 'tel', 'mobile', 'cell', 'contact', 'phone_number', 'phone_number', 'phonenumber'],
  website: ['website', 'url', 'web', 'site', 'link', 'domain', 'web_address', 'homepage'],
  zipcode: ['zip', 'zipcode', 'zip_code', 'postal', 'postcode', 'postal_code', 'zipcode'],
  state: ['state', 'province', 'region', 'st', 'prov'],
}

/**
 * Validates if a value matches the expected format for a given field
 */
export function validateFieldValue(field: string, value: string): { isValid: boolean; error?: string } {
  if (!value || value.trim() === '') {
    return { isValid: true } // Empty values are handled separately
  }

  const trimmed = value.trim()

  switch (field) {
    case 'email':
      if (!VALIDATION_PATTERNS.email.test(trimmed)) {
        return {
          isValid: false,
          error: 'The selected column contains data that doesn\'t look like an email address.',
        }
      }
      break

    case 'website':
      if (!VALIDATION_PATTERNS.website.test(trimmed)) {
        return {
          isValid: false,
          error: 'The selected column contains data that doesn\'t look like a website URL.',
        }
      }
      break

    case 'phone_number':
      // Check for letters (which shouldn't be in phone numbers)
      if (/[a-z]/i.test(trimmed.replace(/[\s\-\(\)\+]/g, ''))) {
        return {
          isValid: false,
          error: 'The selected column contains letters, which are not typical in phone numbers.',
        }
      }
      // Check basic phone format (allows international format)
      if (!VALIDATION_PATTERNS.phone.test(trimmed)) {
        return {
          isValid: false,
          error: 'The selected column contains data that doesn\'t look like a phone number.',
        }
      }
      break

    case 'zipcode':
      // Check if it's a valid zipcode format (5 digits for US, or alphanumeric for international)
      if (!VALIDATION_PATTERNS.zipcode.test(trimmed)) {
        return {
          isValid: false,
          error: 'The selected column contains data that doesn\'t look like a zipcode.',
        }
      }
      break

    case 'state':
      // Check for 2-letter state code or full state name
      if (!VALIDATION_PATTERNS.state.test(trimmed) && !VALIDATION_PATTERNS.stateName.test(trimmed)) {
        return {
          isValid: false,
          error: 'The selected column contains data that doesn\'t look like a state code or name.',
        }
      }
      break

    case 'business_name':
      // Business names are flexible, but should not be empty
      if (trimmed.length < 2) {
        return {
          isValid: false,
          error: 'The selected column contains data that doesn\'t look like a business name.',
        }
      }
      break

    default:
      return { isValid: true }
  }

  return { isValid: true }
}

/**
 * Validates a CSV column by checking sample data
 * @param field - The required field being mapped (e.g., 'email', 'phone_number')
 * @param csvHeader - The CSV column header name
 * @param sampleRows - Array of sample row data (first 10 rows)
 * @returns Validation result with error message if invalid
 */
export function validateColumnData(
  field: string,
  csvHeader: string,
  sampleRows: Record<string, string>[]
): { isValid: boolean; error?: string } {
  if (!sampleRows || sampleRows.length === 0) {
    return { isValid: true }
  }

  // Get first 5 non-empty values from the column
  const sampleValues: string[] = []
  for (const row of sampleRows) {
    const value = row[csvHeader]
    if (value && value.trim() !== '') {
      sampleValues.push(value)
      if (sampleValues.length >= 5) {
        break
      }
    }
  }

  // If no non-empty values found, consider it valid (empty columns are handled elsewhere)
  if (sampleValues.length === 0) {
    return { isValid: true }
  }

  // Validate each sample value
  let invalidCount = 0
  for (const value of sampleValues) {
    const validation = validateFieldValue(field, value)
    if (!validation.isValid) {
      invalidCount++
    }
  }

  // If more than 50% of samples are invalid, return error
  if (invalidCount > sampleValues.length * 0.5) {
    const firstInvalid = sampleValues.find(v => !validateFieldValue(field, v).isValid)
    const validation = validateFieldValue(field, firstInvalid || '')
    return {
      isValid: false,
      error: validation.error || `The selected column contains data that doesn't match the expected format for ${field}.`,
    }
  }

  return { isValid: true }
}

/**
 * Auto-maps CSV headers to required fields using fuzzy matching
 * @param csvHeaders - Array of CSV column headers
 * @returns Record mapping required fields to CSV column indices
 */
export function autoMapColumns(csvHeaders: string[]): Record<string, number> {
  const mappings: Record<string, number> = {}

  // For each required field, find the best matching CSV header
  const requiredFields = ['business_name', 'email', 'phone_number', 'website', 'zipcode', 'state']

  requiredFields.forEach((field) => {
    const keywords = AUTO_MAPPING_KEYWORDS[field] || []
    let bestMatch: { index: number; score: number } | null = null

    csvHeaders.forEach((header, index) => {
      // Skip if this column is already mapped
      if (Object.values(mappings).includes(index)) {
        return
      }

      const headerLower = header.toLowerCase().replace(/[_\s-]/g, '')

      // Check for exact or partial keyword matches
      keywords.forEach((keyword) => {
        const keywordLower = keyword.toLowerCase()
        let score = 0

        // Exact match gets highest score
        if (headerLower === keywordLower) {
          score = 100
        }
        // Contains keyword gets medium score
        else if (headerLower.includes(keywordLower) || keywordLower.includes(headerLower)) {
          score = 50
        }
        // Partial match gets lower score
        else if (headerLower.includes(keywordLower.substring(0, 3)) || keywordLower.includes(headerLower.substring(0, 3))) {
          score = 25
        }

        if (score > 0) {
          if (!bestMatch || score > bestMatch.score) {
            bestMatch = { index, score }
          }
        }
      })
    })

    // Only auto-map if we found a good match (score >= 25)
    if (bestMatch !== null) {
      const match = bestMatch as { index: number; score: number }
      if (match.score >= 25) {
        mappings[field] = match.index
      }
    }
  })

  return mappings
}

