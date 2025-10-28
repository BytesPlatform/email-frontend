'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthContext } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'

export function Header() {
  const { client, logout, isAuthenticated, isLoading } = useAuthContext()
  const router = useRouter()
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleLogout = () => {
    // Clear authentication state first
    logout()
    
    // Redirect to home page
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
    <header className="bg-white/95 backdrop-blur-lg shadow-sm border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3">
              <div className="h-9 w-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-sm">EA</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Email Automation</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {isAuthenticated ? (
              <>
                <Link 
                  href="/dashboard" 
                  className={`px-4 py-2 rounded-lg font-medium ${
                    isActive('/dashboard') 
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Dashboard
                </Link>
                <Link 
                  href="/dashboard/csv-ingestion" 
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    isActive('/dashboard/csv-ingestion') 
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  CSV Ingestion
                </Link>
                <Link 
                  href="/dashboard/scraping" 
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    isActive('/dashboard/scraping') 
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Scraping
                </Link>
                <Link 
                  href="/dashboard/history" 
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    isActive('/dashboard/history') 
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  History
                </Link>
                <Link 
                  href="/dashboard/profile" 
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    isActive('/dashboard/profile') 
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Profile
                </Link>
              </>
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

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold shadow-md">
                    {client?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="text-sm text-slate-600">
                    <span className="font-semibold text-slate-900">{client?.name}</span>
                  </span>
                </div>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                  className="border-slate-300 hover:border-red-300 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
                >
                  Sign Out
                </Button>
              </div>
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
                    href="/dashboard" 
                    className={`block px-3 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                      isActive('/dashboard')
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
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
                  <Link 
                    href="/dashboard/profile" 
                    className={`block px-3 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                      isActive('/dashboard/profile')
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <div className="pt-4 border-t border-slate-200 mt-2">
                    <div className="flex items-center space-x-2 px-3 py-2">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold shadow-md">
                        {client?.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="text-sm text-slate-600">
                        <span className="font-semibold text-slate-900 block">{client?.name}</span>
                        <span className="text-xs">Logged in</span>
                      </div>
                    </div>
                    <Button
                      onClick={handleLogout}
                      variant="outline"
                      className="w-full mt-2 border-slate-300 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                    >
                      Sign Out
                    </Button>
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
