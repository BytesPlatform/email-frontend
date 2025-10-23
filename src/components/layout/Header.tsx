'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'

export function Header() {
  const { user, logout, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  // Show loading state during hydration
  if (isLoading) {
    return (
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">EA</span>
              </div>
              <span className="ml-3 text-xl font-bold text-slate-900">Email Automation</span>
            </div>
            <div className="animate-pulse bg-gray-200 h-8 w-20 rounded"></div>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="bg-white shadow-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">EA</span>
              </div>
              <span className="text-xl font-bold text-slate-900">Email Automation</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {isAuthenticated ? (
              <>
                <Link 
                  href="/dashboard" 
                  className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
                >
                  Dashboard
                </Link>
                <Link 
                  href="/dashboard/csv-ingestion" 
                  className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
                >
                  CSV Ingestion
                </Link>
                <Link 
                  href="/dashboard/scraping" 
                  className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
                >
                  Scraping
                </Link>
                <Link 
                  href="/dashboard/history" 
                  className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
                >
                  History
                </Link>
                <Link 
                  href="/dashboard/profile" 
                  className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
                >
                  Profile
                </Link>
              </>
            ) : (
              <>
                <Link 
                  href="/#features" 
                  className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
                >
                  Features
                </Link>
                <Link 
                  href="/#pricing" 
                  className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
                >
                  Pricing
                </Link>
                <Link 
                  href="/#about" 
                  className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
                >
                  About
                </Link>
              </>
            )}
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-slate-600">
                  Welcome, <span className="font-semibold">{user?.name}</span>
                </span>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
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
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => router.push('/auth/register')}
                  size="sm"
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
              className="text-slate-600 hover:text-slate-900 focus:outline-none focus:text-slate-900"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-slate-200">
              {isAuthenticated ? (
                <>
                  <Link 
                    href="/dashboard" 
                    className="block px-3 py-2 text-slate-600 hover:text-slate-900 font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link 
                    href="/dashboard/csv-ingestion" 
                    className="block px-3 py-2 text-slate-600 hover:text-slate-900 font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    CSV Ingestion
                  </Link>
                  <Link 
                    href="/dashboard/scraping" 
                    className="block px-3 py-2 text-slate-600 hover:text-slate-900 font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Scraping
                  </Link>
                  <Link 
                    href="/dashboard/history" 
                    className="block px-3 py-2 text-slate-600 hover:text-slate-900 font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    History
                  </Link>
                  <Link 
                    href="/dashboard/profile" 
                    className="block px-3 py-2 text-slate-600 hover:text-slate-900 font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <div className="pt-4 border-t border-slate-200">
                    <div className="px-3 py-2 text-sm text-slate-600">
                      Welcome, <span className="font-semibold">{user?.name}</span>
                    </div>
                    <Button
                      onClick={handleLogout}
                      variant="outline"
                      className="w-full mt-2"
                    >
                      Sign Out
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <Link 
                    href="/#features" 
                    className="block px-3 py-2 text-slate-600 hover:text-slate-900 font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Features
                  </Link>
                  <Link 
                    href="/#pricing" 
                    className="block px-3 py-2 text-slate-600 hover:text-slate-900 font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Pricing
                  </Link>
                  <Link 
                    href="/#about" 
                    className="block px-3 py-2 text-slate-600 hover:text-slate-900 font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    About
                  </Link>
                  <div className="pt-4 border-t border-slate-200 space-y-2">
                    <Button
                      onClick={() => {
                        router.push('/auth/login')
                        setIsMenuOpen(false)
                      }}
                      variant="outline"
                      className="w-full"
                    >
                      Sign In
                    </Button>
                    <Button
                      onClick={() => {
                        router.push('/auth/register')
                        setIsMenuOpen(false)
                      }}
                      className="w-full"
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
