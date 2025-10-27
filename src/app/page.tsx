'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // Initialize on client side
    if (typeof window !== 'undefined') {
      setIsInitialized(true)
    }
  }, [])

  useEffect(() => {
    if (isInitialized && isAuthenticated && !isLoading) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, isInitialized, isLoading, router])

  if (isLoading || !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-slate-600 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  if (isAuthenticated && isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-slate-600 font-medium">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">

      {/* Hero Section */}
      <main className="pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6">
              Automate Your
              <span className="text-indigo-600"> Email Marketing</span>
            </h1>
            <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto">
              Streamline your email campaigns with powerful CSV ingestion, intelligent web scraping, 
              and comprehensive analytics. Scale your marketing efforts effortlessly.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Button
                onClick={() => router.push('/auth/register')}
                size="lg"
                className="bg-indigo-600 hover:bg-indigo-700 px-8 py-4 text-lg font-semibold"
              >
                Start Free Trial
              </Button>
              <Button
                onClick={() => router.push('/auth/login')}
                variant="outline"
                size="lg"
                className="border-slate-300 text-slate-700 hover:bg-slate-50 px-8 py-4 text-lg font-semibold"
              >
                Sign In
              </Button>
            </div>

          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="py-20 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Powerful Features
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Everything you need to automate and scale your email marketing campaigns
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* CSV Ingestion */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">CSV Ingestion</h3>
              <p className="text-slate-600 mb-4">
                Upload and process CSV files with intelligent validation, 
                duplicate detection, and real-time preview.
              </p>
              <ul className="text-sm text-slate-500 space-y-1">
                <li>• Drag & drop file upload</li>
                <li>• Automatic data validation</li>
                <li>• Duplicate detection</li>
                <li>• Real-time preview</li>
              </ul>
            </div>

            {/* Web Scraping */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Web Scraping</h3>
              <p className="text-slate-600 mb-4">
                Extract contact information from websites with configurable 
                parameters and intelligent data parsing.
              </p>
              <ul className="text-sm text-slate-500 space-y-1">
                <li>• URL-based scraping</li>
                <li>• Configurable parameters</li>
                <li>• Rate limiting</li>
                <li>• Data validation</li>
              </ul>
            </div>

            {/* History & Analytics */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">History & Analytics</h3>
              <p className="text-slate-600 mb-4">
                Track all your operations with comprehensive history, 
                detailed analytics, and export capabilities.
              </p>
              <ul className="text-sm text-slate-500 space-y-1">
                <li>• Complete operation history</li>
                <li>• Performance analytics</li>
                <li>• Export capabilities</li>
                <li>• Filtering & search</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">
            Ready to Automate Your Email Marketing?
          </h2>
          <p className="text-lg text-slate-600 mb-8">
            Join thousands of marketers who have streamlined their email campaigns with our platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => router.push('/auth/register')}
              size="lg"
              className="bg-indigo-600 hover:bg-indigo-700 px-8 py-4 text-lg font-semibold"
            >
              Get Started Free
            </Button>
            <Button
              onClick={() => router.push('/auth/login')}
              variant="outline"
              size="lg"
              className="border-slate-300 text-slate-700 hover:bg-slate-50 px-8 py-4 text-lg font-semibold"
            >
              Sign In
            </Button>
          </div>
        </div>
      </section>

    </div>
  )
}