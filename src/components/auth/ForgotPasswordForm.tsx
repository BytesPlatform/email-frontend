'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { isValidEmail } from '@/lib/utils'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
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
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false)
      setIsSubmitted(true)
    }, 1000)
  }

  if (isSubmitted) {
    return (
      <div className="bg-white/95 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl mb-6 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3">
              Check your email
            </h3>
            <p className="text-slate-600 font-medium mb-6">
              We&apos;ve sent a password reset link to <span className="font-semibold text-slate-900">{email}</span>
            </p>
            <div className="bg-slate-50 rounded-2xl p-4 mb-6">
              <p className="text-sm text-slate-600">
                Check your spam folder if you don&apos;t see the email in your inbox.
              </p>
            </div>
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

  return (
    <div className="bg-white/95 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            Reset your password
          </h2>
          <p className="text-slate-600 font-medium">
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            helperText="Enter your email address and we'll send you a reset link"
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
            {isLoading ? 'Sending...' : 'Send reset link'}
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
