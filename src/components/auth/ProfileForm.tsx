'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { isValidEmail } from '@/lib/utils'

export function ProfileForm() {
  const { user, updateProfile, isLoading } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile')

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setEmail(user.email || '')
    }
  }, [user])

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setSuccess('')

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

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    const success = await updateProfile({ name, email })
    if (success) {
      setSuccess('Profile updated successfully!')
    } else {
      setErrors({ general: 'Failed to update profile. Please try again.' })
    }
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setSuccess('')

    // Validation
    const newErrors: { [key: string]: string } = {}
    
    if (!currentPassword.trim()) {
      newErrors.currentPassword = 'Current password is required'
    }
    
    if (!newPassword.trim()) {
      newErrors.newPassword = 'New password is required'
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters long'
    } else if (!/[A-Z]/.test(newPassword)) {
      newErrors.newPassword = 'Password must contain at least one uppercase letter'
    } else if (!/[a-z]/.test(newPassword)) {
      newErrors.newPassword = 'Password must contain at least one lowercase letter'
    } else if (!/\d/.test(newPassword)) {
      newErrors.newPassword = 'Password must contain at least one number'
    }
    
    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    const success = await updateProfile({ 
      currentPassword, 
      newPassword 
    })
    if (success) {
      setSuccess('Password updated successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } else {
      setErrors({ general: 'Failed to update password. Please check your current password.' })
    }
  }

  const userIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )

  const lockIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  )

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm text-center p-3 rounded-lg">
          <div className="flex items-center justify-center space-x-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{success}</span>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'profile'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Profile Information
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'password'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Change Password
          </button>
        </nav>
      </div>

      {/* Profile Information Tab */}
      {activeTab === 'profile' && (
        <Card variant="elevated">
          <CardHeader
            title="Profile Information"
            subtitle="Update your personal information"
            icon={userIcon}
          >
            <div></div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  error={errors.name}
                  required
                  placeholder="Enter your full name"
                />
                
                <Input
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={errors.email}
                  required
                  placeholder="Enter your email"
                />
              </div>
              
              <Button
                type="submit"
                className="w-full md:w-auto"
                isLoading={isLoading}
                disabled={isLoading}
                leftIcon={userIcon}
              >
                {isLoading ? 'Updating...' : 'Update Profile'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Change Password Tab */}
      {activeTab === 'password' && (
        <Card variant="elevated">
          <CardHeader
            title="Change Password"
            subtitle="Update your account password"
            icon={lockIcon}
          >
            <div></div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
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
                  label="Current Password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  error={errors.currentPassword}
                  required
                  placeholder="Enter your current password"
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>
              </div>
              
              <Button
                type="submit"
                className="w-full md:w-auto"
                isLoading={isLoading}
                disabled={isLoading}
                leftIcon={lockIcon}
              >
                {isLoading ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
