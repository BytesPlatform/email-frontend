'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { isValidEmail } from '@/lib/utils'

export function RegisterForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [address, setAddress] = useState('')
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const { register, isLoading } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Validation
    const newErrors: { [key: string]: string } = {}
    
    if (!name.trim()) {
      newErrors.name = 'Name is required'
    }
    
    if (!email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!isValidEmail(email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    
    if (!password.trim()) {
      newErrors.password = 'Password is required'
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long'
    } else if (!/[A-Z]/.test(password)) {
      newErrors.password = 'Password must contain at least one uppercase letter'
    } else if (!/[a-z]/.test(password)) {
      newErrors.password = 'Password must contain at least one lowercase letter'
    } else if (!/\d/.test(password)) {
      newErrors.password = 'Password must contain at least one number'
    }
    
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    const success = await register(email, password, name, phone, city, country, address)
    if (success) {
      router.push('/dashboard')
    } else {
      setErrors({ general: 'Registration failed. Please try again.' })
    }
  }

  return (
    <div className="bg-white shadow-lg rounded-xl p-6 w-full">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Create your account
        </h2>
        <p className="text-slate-600 text-sm">
          Get started with your free account
        </p>
      </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm text-center p-3 rounded-lg">
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{errors.general}</span>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            <Input
              label="Full name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              required
              placeholder="Enter your full name"
            />
            
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              required
              placeholder="Enter your email"
            />
            
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              helperText="Must be at least 8 characters with uppercase, lowercase, and number"
              required
              placeholder="Create a strong password"
            />
            
            <Input
              label="Confirm password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={errors.confirmPassword}
              required
              placeholder="Confirm your password"
            />
            
            <Input
              label="Phone number"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              error={errors.phone}
              placeholder="Enter your phone number"
            />
            
            <Input
              label="Address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              error={errors.address}
              placeholder="Enter your address"
            />
            
            <Input
              label="City"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              error={errors.city}
              placeholder="Enter your city"
            />
            
            <Input
              label="Country"
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              error={errors.country}
              placeholder="Enter your country"
            />
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
