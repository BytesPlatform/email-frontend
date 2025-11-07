'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthContext } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'

export function Header() {
  const { client, logout, isAuthenticated, isLoading } = useAuthContext()
  const router = useRouter()
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)
  const userDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false)
      }
    }

    if (isUserDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isUserDropdownOpen])

  const handleLogout = async () => {
    // Clear authentication state first
    await logout()
    
    // Redirect to home page after logout completes
    // Use window.location to force a full page reload and clear any cached state
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }

  const isActive = (path: string) => {
    return pathname === path
  }

  // Show loading state during hydration
  if (isLoading) {
    return (
      <header className="bg-white/80 backdrop-blur-lg shadow-sm border-b border-slate-200 sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="h-9 w-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-sm">EA</span>
              </div>
              <span className="ml-3 text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Email Automation</span>
            </div>
            <div className="animate-pulse bg-gray-200 h-8 w-20 rounded"></div>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo - Left Section */}
          <div className="flex items-center flex-shrink-0">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="h-9 w-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md transition-transform group-hover:scale-105">
                <span className="text-white font-bold text-sm">EA</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Email Automation</span>
            </Link>
          </div>

          {/* Desktop Navigation - Center Section */}
          <div className="hidden md:flex items-center justify-center flex-1 mx-8">
            {isAuthenticated ? (
              <div className="flex items-center gap-1">
                <Link 
                  href="/dashboard/csv-ingestion" 
                  className={`px-4 py-2 rounded-lg font-medium  transition-all duration-200 ${
                    isActive('/dashboard/csv-ingestion') 
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md' 
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  CSV Ingestion
                </Link>
                <Link 
                  href="/dashboard/scraping" 
                  className={`px-4 py-2 rounded-lg font-medium  transition-all duration-200 ${
                    isActive('/dashboard/scraping') 
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md' 
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Scraping
                </Link>
                <Link 
                  href="/dashboard/email-generation" 
                  className={`px-4 py-2 rounded-lg font-medium  transition-all duration-200 ${
                    isActive('/dashboard/email-generation') 
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md' 
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Generation
                </Link>
                <Link 
                  href="/dashboard/draft" 
                  className={`px-4 py-2 rounded-lg font-medium  transition-all duration-200 ${
                    isActive('/dashboard/draft') 
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md' 
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Drafts
                </Link>
                <Link 
                  href="/dashboard/history" 
                  className={`px-4 py-2 rounded-lg font-medium  transition-all duration-200 ${
                    isActive('/dashboard/history') 
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md' 
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  History
                </Link>
              </div>
            ) : (
              <>
                <Link 
                  href="/#features" 
                  className="px-4 py-2 rounded-lg font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                >
                  Features
                </Link>
                <Link 
                  href="/#pricing" 
                  className="px-4 py-2 rounded-lg font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                >
                  Pricing
                </Link>
                <Link 
                  href="/#about" 
                  className="px-4 py-2 rounded-lg font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                >
                  About
                </Link>
              </>
            )}
          </div>

          {/* Desktop Auth Buttons - Right Section */}
          <div className="hidden md:flex items-center flex-shrink-0">
            {isAuthenticated ? (
              <>
                {/* Bytes Platform with User Dropdown */}
                <div className="relative" ref={userDropdownRef}>
                  <button
                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-lg"
                  >
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold shadow-md">
                      B
                    </div>
                    <span className="text-sm font-medium text-slate-600">Bytes Platform</span>
                  </button>

                  {/* Dropdown Menu */}
                  {isUserDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden z-50">
                      {/* User Info Section */}
                      <div className="px-4 py-3 border-b border-slate-200">
                        <div className="font-semibold text-slate-900">{client?.name || 'User'}</div>
                        <div className="text-sm text-slate-500 mt-0.5">Customer Account</div>
                      </div>

                      {/* Navigation Links */}
                      <div className="py-2 border-b border-slate-200">
                        <Link
                          href="/dashboard"
                          onClick={() => {
                            setIsUserDropdownOpen(false)
                          }}
                          className={`flex items-center space-x-3 px-4 py-2.5 text-sm transition-colors ${
                            isActive('/dashboard')
                              ? 'bg-indigo-50 text-indigo-700'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                          <span>Dashboard</span>
                        </Link>
                        <Link
                          href="/dashboard/profile"
                          onClick={() => {
                            setIsUserDropdownOpen(false)
                          }}
                          className={`flex items-center space-x-3 px-4 py-2.5 text-sm transition-colors ${
                            isActive('/dashboard/profile')
                              ? 'bg-indigo-50 text-indigo-700'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>My Profile</span>
                        </Link>
                        <Link
                          href="/dashboard/draft"
                          onClick={() => {
                            setIsUserDropdownOpen(false)
                          }}
                          className={`flex items-center space-x-3 px-4 py-2.5 text-sm transition-colors ${
                            isActive('/dashboard/draft')
                              ? 'bg-indigo-50 text-indigo-700'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>Drafts</span>
                        </Link>
                      </div>

                      {/* Logout Link */}
                      <div className="py-2">
                        <button
                          onClick={() => {
                            setIsUserDropdownOpen(false)
                            handleLogout()
                          }}
                          className="flex items-center space-x-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full text-left transition-colors cursor-pointer"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Button
                  onClick={() => router.push('/auth/login')}
                  variant="outline"
                  size="sm"
                  className="border-slate-300 hover:border-indigo-400"
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => router.push('/auth/register')}
                  size="sm"
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all duration-200"
                >
                  Get Started
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-slate-600 hover:text-slate-900 focus:outline-none focus:text-slate-900 transition-colors p-2 rounded-lg hover:bg-slate-100"
            >
              {isMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-slate-200 bg-slate-50/50 backdrop-blur-sm">
              {isAuthenticated ? (
                <>
                  <Link 
                    href="/dashboard/csv-ingestion" 
                    className={`block px-3 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                      isActive('/dashboard/csv-ingestion')
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    CSV Ingestion
                  </Link>
                  <Link 
                    href="/dashboard/scraping" 
                    className={`block px-3 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                      isActive('/dashboard/scraping')
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Scraping
                  </Link>
                  <Link 
                    href="/dashboard/email-generation" 
                    className={`block px-3 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                      isActive('/dashboard/email-generation')
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Email Generation
                  </Link>
                  <Link 
                    href="/dashboard/draft" 
                    className={`block px-3 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                      isActive('/dashboard/draft')
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Drafts
                  </Link>
                  <Link 
                    href="/dashboard/history" 
                    className={`block px-3 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                      isActive('/dashboard/history')
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    History
                  </Link>
                  <div className="pt-4 border-t border-slate-200 mt-2 space-y-2">
                    {/* Bytes Platform Link */}
                    <button
                      onClick={() => {
                        // Add navigation or dropdown functionality here if needed
                        setIsMenuOpen(false)
                      }}
                      className="flex items-center space-x-2 px-3 py-2 hover:bg-slate-100 rounded-lg transition-colors w-full text-left"
                    >
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold shadow-md">
                        B
                      </div>
                      <span className="text-sm font-medium text-slate-600">Bytes Platform</span>
                    </button>
                    {/* User Info and Actions */}
                    <div className="px-3 py-2 border-t border-slate-200">
                      <div className="mb-3">
                        <div className="text-sm text-slate-600">
                          <span className="font-semibold text-slate-900 block">{client?.name}</span>
                          <span className="text-xs">Customer Account</span>
                        </div>
                      </div>
                      <Link
                        href="/dashboard"
                        className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100 mb-2"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <span>Dashboard</span>
                      </Link>
                      <Link
                        href="/dashboard/profile"
                        className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100 mb-2"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>My Profile</span>
                      </Link>
                      <button
                        onClick={() => {
                          setIsMenuOpen(false)
                          handleLogout()
                        }}
                        className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 w-full text-left cursor-pointer"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Link 
                    href="/#features" 
                    className="block px-3 py-2.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white font-medium transition-all duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Features
                  </Link>
                  <Link 
                    href="/#pricing" 
                    className="block px-3 py-2.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white font-medium transition-all duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Pricing
                  </Link>
                  <Link 
                    href="/#about" 
                    className="block px-3 py-2.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white font-medium transition-all duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    About
                  </Link>
                  <div className="pt-4 border-t border-slate-200 space-y-2 mt-2">
                    <Button
                      onClick={() => {
                        router.push('/auth/login')
                        setIsMenuOpen(false)
                      }}
                      variant="outline"
                      className="w-full border-slate-300"
                    >
                      Sign In
                    </Button>
                    <Button
                      onClick={() => {
                        router.push('/auth/register')
                        setIsMenuOpen(false)
                      }}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md"
                    >
                      Get Started
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
