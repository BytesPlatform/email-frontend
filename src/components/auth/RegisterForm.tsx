'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import PhoneInput from 'react-phone-number-input'
import type { E164Number } from 'libphonenumber-js/core'
import { parsePhoneNumberFromString } from 'libphonenumber-js'
import 'react-phone-number-input/style.css'
import type { ProductServiceInput } from '@/types/auth'

// Validation functions (reused from contact page)
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
  
  // Allow any domain, but ensure it has proper TLD
  const hasValidTLD = /@[^\s@]+\.[a-z]{2,}$/i.test(email)
  if (!hasValidTLD) {
    return 'Email must have a valid domain extension (e.g., .com, .org, .net)'
  }
  
  return null
}

const validatePhone = (phone: string): string | null => {
  if (!phone.trim()) return null // Empty is allowed
  
  // Use libphonenumber-js to validate
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

// New validation functions
const validateFullName = (name: string): string | null => {
  if (!name.trim()) return 'Full name is required'
  
  // Must contain at least one letter
  if (!/[a-zA-Z]/.test(name)) {
    return 'Full name must contain at least one letter and cannot be only numbers'
  }
  
  // Cannot be only numbers
  if (/^\d+$/.test(name.trim())) {
    return 'Full name must contain at least one letter and cannot be only numbers'
  }
  
  return null
}

const validateCity = (city: string): string | null => {
  if (!city.trim()) return null // Empty is allowed
  
  // Must contain at least one letter
  if (!/[a-zA-Z]/.test(city)) {
    return 'City must contain at least one letter and cannot be only numbers'
  }
  
  // Cannot be only numbers
  if (/^\d+$/.test(city.trim())) {
    return 'City must contain at least one letter and cannot be only numbers'
  }
  
  return null
}

const validateCountry = (country: string): string | null => {
  if (!country.trim()) return null // Empty is allowed
  
  // Must contain at least one letter
  if (!/[a-zA-Z]/.test(country)) {
    return 'Country must contain at least one letter and cannot be only numbers'
  }
  
  // Cannot be only numbers
  if (/^\d+$/.test(country.trim())) {
    return 'Country must contain at least one letter and cannot be only numbers'
  }
  
  return null
}

// Password validation criteria checker
const getPasswordCriteria = (password: string) => {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
  }
}

const validatePassword = (password: string): string | null => {
  if (!password.trim()) return 'Password is required'
  
  const criteria = getPasswordCriteria(password)
  
  if (!criteria.minLength) {
    return 'Password must be at least 8 characters long'
  }
  if (!criteria.hasUppercase) {
    return 'Password must contain at least one uppercase letter'
  }
  if (!criteria.hasLowercase) {
    return 'Password must contain at least one lowercase letter'
  }
  if (!criteria.hasNumber) {
    return 'Password must contain at least one number'
  }
  
  return null
}

export function RegisterForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [phone, setPhone] = useState<E164Number | undefined>(undefined)
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [address, setAddress] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [productsServices, setProductsServices] = useState<ProductServiceInput[]>([{ name: '', description: '', type: '' }])
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { register, isLoading } = useAuth()
  const router = useRouter()
  const phoneInputRef = useRef<HTMLDivElement>(null)

  // Real-time validation handlers
  const handleNameChange = (value: string) => {
    // Filter out numbers - only allow letters, spaces, hyphens, apostrophes
    const filtered = value.split('').filter(char => /[a-zA-Z\s\-']/.test(char)).join('')
    setName(filtered)
    const error = validateFullName(filtered)
    setErrors(prev => ({ ...prev, name: error || '' }))
  }

  const handleEmailChange = (value: string) => {
    setEmail(value)
    const error = value.trim() ? validateEmail(value) : null
    setErrors(prev => ({ ...prev, email: error || '' }))
  }

  const handlePhoneChange = (value: E164Number | undefined) => {
    setPhone(value)
    const error = value ? validatePhone(value) : null
    setErrors(prev => ({ ...prev, phone: error || '' }))
  }

  const handlePasswordChange = (value: string) => {
    setPassword(value)
    const error = validatePassword(value)
    setErrors(prev => ({ ...prev, password: error || '' }))
    
    // Also check password match if confirm password has value
    if (confirmPassword) {
      const matchError = value !== confirmPassword ? 'Passwords do not match' : null
      setErrors(prev => ({ ...prev, confirmPassword: matchError || '' }))
    }
  }

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value)
    const matchError = password && value !== password ? 'Passwords do not match' : null
    setErrors(prev => ({ ...prev, confirmPassword: matchError || '' }))
  }

  const handleCityChange = (value: string) => {
    // Filter out numbers - only allow letters, spaces, hyphens, apostrophes
    const filtered = value.split('').filter(char => /[a-zA-Z\s\-']/.test(char)).join('')
    setCity(filtered)
    const error = filtered.trim() ? validateCity(filtered) : null
    setErrors(prev => ({ ...prev, city: error || '' }))
  }

  const handleCountryChange = (value: string) => {
    // Filter out numbers - only allow letters, spaces, hyphens, apostrophes
    const filtered = value.split('').filter(char => /[a-zA-Z\s\-']/.test(char)).join('')
    setCountry(filtered)
    const error = filtered.trim() ? validateCountry(filtered) : null
    setErrors(prev => ({ ...prev, country: error || '' }))
  }

  const handleBusinessNameChange = (value: string) => {
    setBusinessName(value)
    const error = validateBusinessName(value)
    setErrors(prev => ({ ...prev, businessName: error || '' }))
  }

  // Force phone dropdown to open downward
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
    document.addEventListener('click', forceDropdownDown)

    return () => {
      observer.disconnect()
      document.removeEventListener('click', forceDropdownDown)
    }
  }, [])

  const addProductService = () => {
    setProductsServices([...productsServices, { name: '', description: '', type: '' }])
  }

  const removeProductService = (index: number) => {
    if (productsServices.length > 1) {
      setProductsServices(productsServices.filter((_, i) => i !== index))
    }
  }

  const updateProductService = (index: number, field: keyof ProductServiceInput, value: string) => {
    const updated = [...productsServices]
    updated[index] = { ...updated[index], [field]: value || null }
    setProductsServices(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Validation
    const newErrors: { [key: string]: string } = {}
    
    // Full Name validation
    const nameError = validateFullName(name)
    if (nameError) newErrors.name = nameError
    
    // Email validation
    if (!email.trim()) {
      newErrors.email = 'Email is required'
    } else {
      const emailError = validateEmail(email)
      if (emailError) newErrors.email = emailError
    }
    
    // Password validation
    const passwordError = validatePassword(password)
    if (passwordError) newErrors.password = passwordError
    
    // Confirm Password validation
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    // Phone validation
    if (phone) {
      const phoneError = validatePhone(phone)
      if (phoneError) newErrors.phone = phoneError
    }

    // City validation
    if (city.trim()) {
      const cityError = validateCity(city)
      if (cityError) newErrors.city = cityError
    }

    // Country validation
    if (country.trim()) {
      const countryError = validateCountry(country)
      if (countryError) newErrors.country = countryError
    }

    // Business Name validation (required)
    if (!businessName.trim()) {
      newErrors.businessName = 'Business name is required and must contain at least one letter'
    } else {
      const businessNameError = validateBusinessName(businessName)
      if (businessNameError) newErrors.businessName = businessNameError
    }

    // Validate individual products/services
    productsServices.forEach((ps, index) => {
      const hasName = ps.name?.trim()
      const hasDescription = ps.description?.trim()
      const hasType = ps.type?.trim()
      const hasAnyValue = hasName || hasDescription || hasType
      
      // If any field is filled, name is required
      if (hasAnyValue && !hasName) {
        newErrors[`productService_${index}_name`] = 'Product/Service name is required'
      }
      
      // If name is filled, type is required
      if (hasName && !hasType) {
        newErrors[`productService_${index}_type`] = 'Type is required (Product or Service)'
      }
      
      // If type is filled, it must be valid
      if (hasType && ps.type !== 'product' && ps.type !== 'service') {
        newErrors[`productService_${index}_type`] = 'Type must be either "product" or "service"'
      }
    })

    // Validate products/services - at least one is required
    const validProductsServices = productsServices.filter(ps => ps.name?.trim() && ps.type?.trim())
    if (validProductsServices.length === 0) {
      newErrors.productsServices = 'At least one product or service is required. Please add at least one product/service with name and type.'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Filter out empty products/services and format for submission
    const formattedProductsServices: ProductServiceInput[] = productsServices
      .filter(ps => ps.name?.trim() && ps.type?.trim())
      .map(ps => ({
        name: ps.name.trim(),
        description: ps.description?.trim() || null,
        type: ps.type?.trim() || '',
      }))

    const success = await register(
      email,
      password,
      name,
      phone || undefined,
      city,
      country,
      address,
      undefined, // companyName
      undefined, // companyDescription
      businessName,
      formattedProductsServices.length > 0 ? formattedProductsServices : undefined 
    )
    if (success) {
      // Wait a moment for localStorage to be written and state to update, then redirect
      // Use window.location to ensure full page reload and proper auth state
      // The full page reload will re-initialize the auth context from localStorage
      setTimeout(() => {
        // Verify localStorage was written before redirecting
        const storedClient = typeof window !== 'undefined' ? localStorage.getItem('currentUser') : null
        if (storedClient) {
          window.location.href = '/dashboard'
        } else {
          // If localStorage write failed, try again after a short delay
          setTimeout(() => {
            window.location.href = '/dashboard'
          }, 200)
        }
      }, 150)
    } else {
      setErrors({ general: 'Registration failed. Please try again.' })
    }
  }

  return (
    <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
          <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-2">
          Create your account
        </h2>
        <p className="text-slate-600">
          Get started with your free account today
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6" data-gramm="false" data-gramm_editor="false" data-enable-grammarly="false">
        {errors.general && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm text-center p-4 rounded-lg">
            <div className="flex items-center justify-center space-x-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{errors.general}</span>
            </div>
          </div>
        )}

        {/* Personal Information Section */}
        <div className="space-y-4">
          <div className="border-b border-slate-200 pb-2">
            <h3 className="text-lg font-semibold text-slate-900">Personal Information</h3>
            <p className="text-sm text-slate-500">Tell us about yourself</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full name"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              error={errors.name}
              required
              placeholder="John Doe"
              className={errors.name ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : ''}
            />
            
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              error={errors.email}
              required
              placeholder="john@example.com"
              className={errors.email ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : ''}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                error={errors.password}
                required
                placeholder="Create a strong password"
                className={errors.password ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : ''}
                rightIcon={
                  showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3.5 3.5 20.5 20.5" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6.2 6.62C3.86 8.3 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.7 0 3.2-.3 4.5-.83" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.5 9.67A3 3 0 0 0 12 15a3 3 0 0 0 2.22-.98" />
                    </svg>
                  )
                }
                onRightIconClick={() => setShowPassword((prev) => !prev)}
                rightIconLabel={showPassword ? 'Hide password' : 'Show password'}
              />
              {/* Real-time password criteria indicators */}
              {password && (
                <div className="mt-2 space-y-1">
                  {(() => {
                    const criteria = getPasswordCriteria(password)
                    return (
                      <>
                        <div className="flex items-center text-xs">
                          {criteria.minLength ? (
                            <svg className="w-4 h-4 text-emerald-600 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-rose-600 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          )}
                          <span className={criteria.minLength ? 'text-emerald-600' : 'text-rose-600'}>
                            At least 8 characters
                          </span>
                        </div>
                        <div className="flex items-center text-xs">
                          {criteria.hasUppercase ? (
                            <svg className="w-4 h-4 text-emerald-600 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-rose-600 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          )}
                          <span className={criteria.hasUppercase ? 'text-emerald-600' : 'text-rose-600'}>
                            One uppercase letter
                          </span>
                        </div>
                        <div className="flex items-center text-xs">
                          {criteria.hasLowercase ? (
                            <svg className="w-4 h-4 text-emerald-600 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-rose-600 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          )}
                          <span className={criteria.hasLowercase ? 'text-emerald-600' : 'text-rose-600'}>
                            One lowercase letter
                          </span>
                        </div>
                        <div className="flex items-center text-xs">
                          {criteria.hasNumber ? (
                            <svg className="w-4 h-4 text-emerald-600 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-rose-600 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          )}
                          <span className={criteria.hasNumber ? 'text-emerald-600' : 'text-rose-600'}>
                            One number
                          </span>
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}
            </div>
            
            <div>
              <Input
                label="Confirm password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                error={errors.confirmPassword}
                required
                placeholder="Confirm your password"
                className={errors.confirmPassword ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : ''}
                rightIcon={
                  showConfirmPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3.5 3.5 20.5 20.5" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6.2 6.62C3.86 8.3 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.7 0 3.2-.3 4.5-.83" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.5 9.67A3 3 0 0 0 12 15a3 3 0 0 0 2.22-.98" />
                    </svg>
                  )
                }
                onRightIconClick={() => setShowConfirmPassword((prev) => !prev)}
                rightIconLabel={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              />
              {/* Real-time password match indicator */}
              {confirmPassword && password && (
                <div className="mt-2 flex items-center text-xs">
                  {password === confirmPassword ? (
                    <>
                      <svg className="w-4 h-4 text-emerald-600 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-emerald-600">Passwords match</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 text-rose-600 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span className="text-rose-600">Passwords do not match</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Phone number
              </label>
              <div ref={phoneInputRef} className="phone-input-wrapper-register">
                <PhoneInput
                  international
                  defaultCountry="US"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="Enter phone number with country code"
                />
              </div>
              {errors.phone && (
                <p className="mt-1.5 text-xs text-red-600 font-medium">{errors.phone}</p>
              )}
              <style dangerouslySetInnerHTML={{__html: `
                .phone-input-wrapper-register .PhoneInput {
                  display: flex;
                  align-items: center;
                  border: 1px solid ${errors.phone ? '#ef4444' : '#cbd5e1'};
                  border-radius: 0.375rem;
                  overflow: hidden;
                  transition: all 0.2s;
                }
                .phone-input-wrapper-register .PhoneInput:focus-within {
                  border-color: ${errors.phone ? '#ef4444' : '#6366f1'};
                  outline: 2px solid ${errors.phone ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.2)'};
                  outline-offset: 0;
                }
                .phone-input-wrapper-register .PhoneInputCountry {
                  border-right: 1px solid #e2e8f0;
                  padding: 0 8px;
                }
                .phone-input-wrapper-register .PhoneInputInput {
                  flex: 1;
                  border: none;
                  padding: 8px 12px;
                  font-size: 0.875rem;
                  outline: none;
                }
                .phone-input-wrapper-register .PhoneInputCountryOptions {
                  z-index: 1000;
                }
              `}} />
            </div>
            
            <Input
              label="City"
              type="text"
              value={city}
              onChange={(e) => handleCityChange(e.target.value)}
              error={errors.city}
              placeholder="New York"
              className={errors.city ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : ''}
            />
            
            <Input
              label="Country"
              type="text"
              value={country}
              onChange={(e) => handleCountryChange(e.target.value)}
              error={errors.country}
              placeholder="United States"
              className={errors.country ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : ''}
            />
          </div>
          
          <Input
            label="Address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            error={errors.address}
            placeholder="123 Main Street, Apt 4B"
          />
          
          <Input
            label="Business Name"
            type="text"
            value={businessName}
            onChange={(e) => handleBusinessNameChange(e.target.value)}
            error={errors.businessName}
            placeholder="Your business/company name (required)"
            required
            className={errors.businessName ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : ''}
          />
        </div>

        {/* Products/Services Section */}
        <div className="space-y-4">
          <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Products & Services</h3>
              <p className="text-sm text-slate-500">Add at least one product or service (required)</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addProductService}
              className="flex items-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Add</span>
            </Button>
          </div>

          {errors.productsServices && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
              {errors.productsServices}
            </div>
          )}
          <div className="space-y-4">
            {productsServices.map((ps, index) => (
              <div key={index} className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Product/Service #{index + 1}</span>
                  {productsServices.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeProductService(index)}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Remove
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Name"
                    type="text"
                    value={ps.name || ''}
                    onChange={(e) => updateProductService(index, 'name', e.target.value)}
                    error={errors[`productService_${index}_name`]}
                    placeholder="Product/Service name"
                    required={!!(ps.type || ps.description)}
                  />
                  
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Type {ps.name?.trim() && <span className="text-red-500">*</span>}
                    </label>
                    <div className="relative">
                      <select
                        value={ps.type || ''}
                        onChange={(e) => updateProductService(index, 'type', e.target.value)}
                        className="w-full px-4 py-2.5 pr-10 text-sm text-slate-900 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all appearance-none hover:border-slate-400"
                        required={!!ps.name?.trim()}
                      >
                        <option value="">Select type...</option>
                        <option value="product">Product</option>
                        <option value="service">Service</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    {errors[`productService_${index}_type`] && (
                      <p className="mt-1.5 text-xs text-red-600 font-medium">{errors[`productService_${index}_type`]}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={ps.description || ''}
                      onChange={(e) => updateProductService(index, 'description', e.target.value)}
                      rows={2}
                      data-gramm="false"
                      data-gramm_editor="false"
                      data-enable-grammarly="false"
                      className="w-full px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none hover:border-slate-400"
                      placeholder="Brief description..."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={isLoading}
          disabled={isLoading}
        >
          {isLoading ? 'Creating account...' : 'Create account'}
        </Button>
      </form>
      
      {/* Links */}
      <div className="mt-6 text-center">
        <span className="text-sm text-slate-600">
          Already have an account?{' '}
        </span>
        <a
          href="/auth/login"
          className="text-sm text-indigo-600 hover:text-indigo-500 font-medium transition-colors"
        >
          Sign in here
        </a>
      </div>
    </div>
  )
}