'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { isValidEmail } from '@/lib/utils'
import type { ProductServiceInput } from '@/types/auth'

export function RegisterForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [address, setAddress] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [productsServices, setProductsServices] = useState<ProductServiceInput[]>([{ name: '', description: '', type: '' }])
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const { register, isLoading } = useAuth()
  const router = useRouter()

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

    // Validate products/services
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

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Filter out empty products/services
    const validProductsServices: ProductServiceInput[] = productsServices
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
      phone,
      city,
      country,
      address,
      undefined, // companyName
      undefined, // companyDescription
      businessName || undefined, // businessName
      validProductsServices.length > 0 ? validProductsServices : undefined 
    )
    if (success) {
      router.push('/dashboard')
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
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              required
              placeholder="John Doe"
            />
            
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              required
              placeholder="john@example.com"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Phone number"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              error={errors.phone}
              placeholder="+1 (555) 123-4567"
            />
            
            <Input
              label="City"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              error={errors.city}
              placeholder="New York"
            />
            
            <Input
              label="Country"
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              error={errors.country}
              placeholder="United States"
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
            onChange={(e) => setBusinessName(e.target.value)}
            error={errors.businessName}
            placeholder="Your business/company name (optional)"
            helperText=""
          />
        </div>

        {/* Products/Services Section */}
        <div className="space-y-4">
          <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Products & Services</h3>
              <p className="text-sm text-slate-500">Add your products or services (optional)</p>
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