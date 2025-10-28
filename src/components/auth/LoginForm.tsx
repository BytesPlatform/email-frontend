'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { isValidEmail } from '@/lib/utils'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const { login, isLoading } = useAuthContext()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Validation
    const newErrors: { [key: string]: string } = {}
    
    if (!email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!isValidEmail(email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    
    if (!password.trim()) {
      newErrors.password = 'Password is required'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    const success = await login(email, password)
    if (success) {
      router.push('/dashboard')
    } else {
      setErrors({ general: 'Invalid email or password' })
    }
  }

  return (
    <div className="bg-white shadow-lg rounded-xl p-6 w-full">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Welcome back
        </h2>
        <p className="text-slate-600 text-sm">
          Sign in to your account to continue
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
              required
              placeholder="Enter your password"
            />
          </div>
          
          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={isLoading}
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
        
        {/* Links */}
        <div className="mt-6 space-y-3">
          <div className="text-center">
            <a
              href="/auth/forgot-password"
              className="text-sm text-indigo-600 hover:text-indigo-500 font-medium transition-colors"
            >
              Forgot your password?
            </a>
          </div>
          
          <div className="text-center">
            <span className="text-sm text-slate-600">
              Don&apos;t have an account?{' '}
            </span>
            <a
              href="/auth/register"
              className="text-sm text-indigo-600 hover:text-indigo-500 font-medium transition-colors"
            >
              Create one here
            </a>
          </div>
        </div>

        {/* Demo Credentials */}
        <div className="mt-6 pt-4 border-t border-slate-200">
          <div className="text-center">
            <p className="text-xs text-slate-600 mb-3 font-medium">Try Demo Account</p>
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Email:</span>
                  <button
                    onClick={() => setEmail('bytes@test.com')}
                    className="font-mono text-slate-900 bg-white px-2 py-1 rounded border text-xs hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors cursor-pointer"
                  >
                    bytes@test.com
                  </button>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Password:</span>
                  <button
                    onClick={() => setPassword('Aq123456')}
                    className="font-mono text-slate-900 bg-white px-2 py-1 rounded border text-xs hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors cursor-pointer"
                  >
                    Aq123456
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setEmail('bytes@test.com')
                setPassword('Aq123456')
              }}
              className="mt-3 text-xs text-indigo-600 hover:text-indigo-500 font-medium transition-colors"
            >
              Click to fill both fields
            </button>
          </div>
        </div>
    </div>
  )
}
