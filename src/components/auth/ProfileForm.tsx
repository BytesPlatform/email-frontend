'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { isValidEmail } from '@/lib/utils'
import { auth } from '@/api/auth'
import { Client } from '@/types/auth'

export function ProfileForm() {
  const { user, updateProfile, isLoading } = useAuth()
  const [profile, setProfile] = useState<Client | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isPasswordEditMode, setIsPasswordEditMode] = useState(false)
  
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [address, setAddress] = useState('')
  
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile')

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    setIsLoadingProfile(true)
    try {
      const response = await auth.getProfile()
      if (response.success && response.data) {
        const profileData = response.data.profile
        setProfile(profileData)
        setName(profileData.name || '')
        setEmail(profileData.email || '')
        setPhone(profileData.phone || '')
        setCity(profileData.city || '')
        setCountry(profileData.country || '')
        setAddress(profileData.address || '')
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
    } finally {
      setIsLoadingProfile(false)
    }
  }

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

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Call the new API
    const response = await auth.updateProfile({ 
      name, 
      phone: phone || undefined,
      city: city || undefined,
      country: country || undefined,
      address: address || undefined
    })

    if (response.success && response.data) {
      setSuccess('Profile updated successfully!')
      setIsEditMode(false)
      // Update the profile state with the returned data
      if (response.data.profile) {
        setProfile(response.data.profile)
      }
      // Refresh to get latest data
      await fetchProfile()
    } else {
      setErrors({ general: response.error || 'Failed to update profile. Please try again.' })
    }
  }

  const handleEditClick = () => {
    setIsEditMode(true)
    setSuccess('')
  }

  const handleCancelEdit = () => {
    setIsEditMode(false)
    setErrors({})
    setSuccess('')
    // Reset to original values
    if (profile) {
      setName(profile.name || '')
      setEmail(profile.email || '')
      setPhone(profile.phone || '')
      setCity(profile.city || '')
      setCountry(profile.country || '')
      setAddress(profile.address || '')
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
      setIsPasswordEditMode(false)
    } else {
      setErrors({ general: 'Failed to update password. Please check your current password.' })
    }
  }

  const handlePasswordEditClick = () => {
    setIsPasswordEditMode(true)
    setSuccess('')
  }

  const handleCancelPasswordEdit = () => {
    setIsPasswordEditMode(false)
    setErrors({})
    setSuccess('')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
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

  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Profile Header Card */}
      {profile && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-lg p-8">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center shadow-lg">
                <span className="text-3xl font-bold text-indigo-600">
                  {profile.name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-white truncate">{profile.name}</h2>
              <p className="text-indigo-100 truncate">{profile.email}</p>
              {profile.phone && (
                <p className="text-indigo-100 text-sm mt-1 truncate">📱 {profile.phone}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Account Info Cards */}
      {profile && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Member Since</p>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date(profile.createdAt).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short' 
                  })}
                </p>
              </div>
            </div>
          </div>
          
          {profile.city && (
            <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Location</p>
                  <p className="text-lg font-semibold text-gray-900 truncate">
                    {profile.city}{profile.country && `, ${profile.country}`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {profile.updatedAt && (
            <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Last Updated</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(profile.updatedAt).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 py-4 px-6 text-center text-sm font-medium border-b-2 ${
                activeTab === 'profile'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Profile Information</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('password')}
              className={`flex-1 py-4 px-6 text-center text-sm font-medium border-b-2 ${
                activeTab === 'password'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Change Password</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Profile Information Tab */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
              <p className="text-sm text-gray-500 mt-1">Update your profile details</p>
            </div>
            {!isEditMode && (
              <button
                onClick={handleEditClick}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Profile
              </button>
            )}
          </div>
          <div className="p-6">
            <form onSubmit={handleProfileUpdate} className="space-y-6">
              {errors.general && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{errors.general}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {isEditMode ? (
                  <>
                    <Input
                      label="Full Name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      error={errors.name}
                      required
                      placeholder="Enter your full name"
                    />
                    
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Email Address (Read-only)</label>
                      <p className="text-gray-900 bg-gray-100 px-3 py-2 rounded-lg border border-gray-300">{email}</p>
                    </div>
                    
                    <Input
                      label="Phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      error={errors.phone}
                      placeholder="Enter your phone"
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
                    
                    <Input
                      label="Address"
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      error={errors.address}
                      placeholder="Enter your address"
                    />
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Full Name</label>
                      <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">{name || '-'}</p>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Email Address</label>
                      <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">{email || '-'}</p>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">{phone || '-'}</p>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">City</label>
                      <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">{city || '-'}</p>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Country</label>
                      <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">{country || '-'}</p>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">Address</label>
                      <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">{address || '-'}</p>
                    </div>
                  </>
                )}
              </div>

              {isEditMode && (
                <div className="pt-6 border-t border-gray-200 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-6 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <Button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:bg-gray-400 flex items-center space-x-2"
                    isLoading={isLoading}
                    disabled={isLoading}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{isLoading ? 'Saving...' : 'Save Changes'}</span>
                  </Button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Change Password Tab */}
      {activeTab === 'password' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Security Settings</h3>
              <p className="text-sm text-gray-500 mt-1">Change your account password</p>
            </div>
            {!isPasswordEditMode && (
              <button
                onClick={handlePasswordEditClick}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Change Password
              </button>
            )}
          </div>
          <div className="p-6">
            <form onSubmit={handlePasswordUpdate} className="space-y-6">
              {errors.general && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{errors.general}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {isPasswordEditMode ? (
                <>
                  <div className="space-y-6">
                    <Input
                      label="Current Password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      error={errors.currentPassword}
                      required
                      placeholder="Enter your current password"
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                  <div className="pt-6 border-t border-gray-200 flex items-center justify-end space-x-3">
                    <button
                      type="button"
                      onClick={handleCancelPasswordEdit}
                      className="px-6 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <Button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:bg-gray-400 flex items-center space-x-2"
                      isLoading={isLoading}
                      disabled={isLoading}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span>{isLoading ? 'Updating...' : 'Update Password'}</span>
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <h3 className="mt-4 text-sm font-medium text-gray-900">Password Not Changed</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Your password remains unchanged. Click Change Password to update it.
                  </p>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  )
}