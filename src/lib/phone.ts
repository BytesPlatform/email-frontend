import { parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js'

export const OTP_RESEND_INTERVAL_MS = 60_000

export type PhoneDetection = {
  country?: CountryCode
  nationalNumber?: string
  e164?: string
}

export const sanitizeDigits = (value: string, maxDigits = 10) =>
  value.replace(/\D/g, '').slice(0, maxDigits)

export const detectPhoneFromInput = (raw: string): PhoneDetection | null => {
  if (!raw.trim()) return null
  const parsed = parsePhoneNumberFromString(raw.trim())
  if (!parsed || !parsed.isValid()) return null
  return {
    country: parsed.country,
    nationalNumber: parsed.nationalNumber?.toString(),
    e164: parsed.number,
  }
}

export const canResendOtp = (lastSent?: string | null, intervalMs = OTP_RESEND_INTERVAL_MS) => {
  if (!lastSent) return true
  const diff = Date.now() - new Date(lastSent).getTime()
  return diff >= intervalMs
}

export const resendCountdown = (lastSent?: string | null, intervalMs = OTP_RESEND_INTERVAL_MS) => {
  if (!lastSent) return 0
  const diff = Date.now() - new Date(lastSent).getTime()
  return diff >= intervalMs ? 0 : Math.ceil((intervalMs - diff) / 1000)
}

