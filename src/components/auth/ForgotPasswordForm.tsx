'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { isValidEmail } from '@/lib/utils'
import { auth } from '@/api/auth'

export function ForgotPasswordForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [step, setStep] = useState<'email' | 'reset'>('email')
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isResetSuccess, setIsResetSuccess] = useState(false)

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Validation
    if (!email.trim()) {
      setErrors({ email: 'Email is required' })
      return
    }
    
    if (!isValidEmail(email)) {
      setErrors({ email: 'Please enter a valid email address' })
      return
    }

    setIsLoading(true)
    
    try {
      const response = await auth.forgotPassword(email)
      if (response.success) {
        // Check if code was actually sent (email exists in database)
        if (response.data?.codeSent === true) {
          // Code was sent, proceed to OTP form
          setStep('reset')
        } else {
          // Email doesn't exist, show error message
          setErrors({ 
            email: 'This email address is not registered. Please enter a valid email address.' 
          })
        }
      } else {
        setErrors({ general: response.error || 'Failed to send reset code' })
      }
    } catch {
      setErrors({ general: 'An error occurred. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Validation
    if (!otp.trim()) {
      setErrors({ otp: 'OTP code is required' })
      return
    }

    if (!newPassword.trim()) {
      setErrors({ newPassword: 'New password is required' })
      return
    }

    if (newPassword.length < 8) {
      setErrors({ newPassword: 'Password must be at least 8 characters long' })
      return
    }

    if (!/[A-Z]/.test(newPassword)) {
      setErrors({ newPassword: 'Password must contain at least one uppercase letter' })
      return
    }

    if (!/[a-z]/.test(newPassword)) {
      setErrors({ newPassword: 'Password must contain at least one lowercase letter' })
      return
    }

    if (!/\d/.test(newPassword)) {
      setErrors({ newPassword: 'Password must contain at least one number' })
      return
    }

    if (newPassword !== confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' })
      return
    }

    setIsLoading(true)
    
    try {
      const response = await auth.resetPassword(email, otp, newPassword)
      if (response.success) {
        setIsResetSuccess(true)
        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push('/auth/login')
        }, 2000)
      } else {
        setErrors({ general: response.error || 'Failed to reset password' })
      }
    } catch {
      setErrors({ general: 'An error occurred. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  if (isResetSuccess) {
    return (
      <div className="bg-white/95 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl mb-6 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-3">
            Password Reset Successful
          </h3>
          <p className="text-slate-600 font-medium mb-6">
            Your password has been reset successfully. Redirecting to login...
          </p>
        </div>
      </div>
    )
  }

  if (step === 'reset') {
    return (
      <div className="bg-white/95 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            Reset your password
          </h2>
          <p className="text-slate-600 font-medium">
            Enter the code sent to <span className="font-semibold text-slate-900">{email}</span> and your new password
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleResetSubmit} className="space-y-6">
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
          
          <Input
            label="Verification Code (OTP)"
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            error={errors.otp}
            helperText="Enter the 6-digit code sent to your email"
            required
            placeholder="Enter OTP code"
            maxLength={6}
          />

          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            error={errors.newPassword}
            helperText="Must be at least 8 characters with uppercase, lowercase, and number"
            required
            placeholder="Enter new password"
          />

          <Input
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={errors.confirmPassword}
            required
            placeholder="Confirm new password"
          />
          
          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={isLoading}
            disabled={isLoading}
          >
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </Button>
        </form>
        
        {/* Links */}
        <div className="mt-6 text-center space-y-2">
          <button
            type="button"
            onClick={() => {
              setStep('email')
              setOtp('')
              setNewPassword('')
              setConfirmPassword('')
              setErrors({})
            }}
            className="text-sm text-indigo-600 hover:text-indigo-500 font-semibold transition-colors"
          >
            Use a different email
          </button>
          <div>
            <a
              href="/auth/login"
              className="text-sm text-indigo-600 hover:text-indigo-500 font-semibold transition-colors"
            >
              Back to sign in
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/95 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            Reset your password
          </h2>
          <p className="text-slate-600 font-medium">
            Enter your email and we&apos;ll send you a verification code
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleEmailSubmit} className="space-y-6">
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
          
          <Input
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            helperText="Enter your email address and we'll send you a verification code"
            required
            placeholder="Enter your email"
          />
          
          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={isLoading}
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Send verification code'}
          </Button>
        </form>
        
        {/* Links */}
        <div className="mt-8 text-center">
          <a
            href="/auth/login"
            className="text-sm text-indigo-600 hover:text-indigo-500 font-semibold transition-colors"
          >
            Back to sign in
          </a>
        </div>
    </div>
  )
}
