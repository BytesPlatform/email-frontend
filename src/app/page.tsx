'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Skeleton, SkeletonText } from '@/components/common/Skeleton'
import {
  DocumentArrowUpIcon,
  UsersIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  PencilSquareIcon,
  ClockIcon,
  ChartBarIcon,
  ArrowRightIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-8">
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 bg-blue-600 rounded-full opacity-20 animate-ping"></div>
            <div className="relative bg-blue-600 rounded-full p-4">
              <SparklesIcon className="w-16 h-16 text-white animate-pulse" />
            </div>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-8 w-64 mx-auto bg-slate-200" />
            <Skeleton className="h-4 w-48 mx-auto bg-slate-200" />
          </div>
        </div>
      </div>
    )
  }

  if (isAuthenticated && isInitialized) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-white">

      {/* Hero Section - Navy Blue Background */}
      <main className="relative bg-[#0f172a] pt-24 pb-32 overflow-hidden">
        {/* Professional Diagonal Stripes Background */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_35px,#ffffff_35px,#ffffff_70px)]"></div>
        </div>

        {/* Subtle Gradient Overlays */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-900/10 via-transparent to-cyan-900/10"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight leading-tight">
              Scale Your Outreach
              <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-300 to-white">
                Without The Grind
              </span>
            </h1>

            <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
              Stop manually scraping and writing. Our AI pipeline handles everything from
              <span className="text-white font-semibold"> CSV ingestion </span>
              to
              <span className="text-white font-semibold"> personalized emails</span>.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                onClick={() => router.push('/auth/register')}
                size="lg"
                className="bg-indigo-600 text-white hover:bg-indigo-700 border-0 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold px-8 min-w-[160px]"
              >
                Get Started
              </Button>
              <Button
                onClick={() => router.push('/auth/login')}
                variant="outline"
                size="lg"
                className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-slate-900 hover:border-white font-semibold px-8 transition-all duration-200 min-w-[160px]"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Pipeline Section - White Background */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              The Complete Pipeline
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              From data import to sent emails, fully automated
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 relative">
            {[
              { title: 'Import', icon: DocumentArrowUpIcon, color: 'blue' },
              { title: 'Contacts', icon: UsersIcon, color: 'blue' },
              { title: 'Scrape', icon: MagnifyingGlassIcon, color: 'blue' },
              { title: 'Generate', icon: SparklesIcon, color: 'cyan' },
              { title: 'Draft', icon: PencilSquareIcon, color: 'blue' },
              { title: 'Track', icon: ClockIcon, color: 'blue' },
              { title: 'Analyze', icon: ChartBarIcon, color: 'blue' },
            ].map((step, index) => (
              <div key={index} className="group relative">
                <div className="bg-white border-2 border-slate-200 rounded-xl p-6 hover:border-blue-500 hover:shadow-lg transition-all duration-300 h-full flex flex-col items-center text-center">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 ${step.color === 'cyan'
                      ? 'bg-gradient-to-br from-cyan-500 to-blue-600'
                      : 'bg-gradient-to-br from-blue-600 to-blue-700'
                    } group-hover:scale-110 transition-transform duration-300`}>
                    <step.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Step {index + 1}</span>
                  <h3 className="text-sm font-bold text-slate-900">{step.title}</h3>
                </div>
                {index < 6 && (
                  <div className="hidden lg:block absolute top-1/2 -right-2 w-4 h-0.5 bg-slate-300 -translate-y-1/2"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section - Light Blue Background */}
      <section className="py-24 bg-gradient-to-br from-blue-50 to-cyan-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Everything You Need
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Built for speed, designed for scale
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* CSV Processing */}
            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-shadow duration-300 border border-slate-200">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center mb-6">
                <DocumentArrowUpIcon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Smart CSV Processing</h3>
              <p className="text-slate-600 mb-6">
                Drag and drop your leads. We automatically clean, validate, and deduplicate your data instantly.
              </p>
              <div className="space-y-2">
                {['Auto-Validation', 'Deduplication', 'Format Fixing'].map((item) => (
                  <div key={item} className="flex items-center text-sm text-slate-700">
                    <CheckCircleIcon className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Web Scraping */}
            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-shadow duration-300 border border-slate-200">
              <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center mb-6">
                <MagnifyingGlassIcon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Deep Web Scraping</h3>
              <p className="text-slate-600 mb-6">
                Extract emails, names, and roles from any website at machine speed.
              </p>
              <div className="space-y-2">
                {['Intelligent Parsing', 'Rate Limiting', 'Anti-blocking'].map((item) => (
                  <div key={item} className="flex items-center text-sm text-slate-700">
                    <CheckCircleIcon className="w-5 h-5 text-cyan-600 mr-2 flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* AI Generation */}
            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-shadow duration-300 border border-slate-200">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center mb-6">
                <SparklesIcon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">AI Generation</h3>
              <p className="text-slate-600 mb-6">
                Generate personalized emails for each lead using advanced LLMs.
              </p>
              <div className="space-y-2">
                {['Custom Templates', 'Personalization', 'Bulk Generation'].map((item) => (
                  <div key={item} className="flex items-center text-sm text-slate-700">
                    <CheckCircleIcon className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Navy Blue Background */}
      <section className="py-24 bg-[#0f172a] relative overflow-hidden">
        {/* Professional Diagonal Stripes Background */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_35px,#ffffff_35px,#ffffff_70px)]"></div>
        </div>

        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8 relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to 10x Your Outreach?
          </h2>
          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
            Join hundreds of marketers using AI to automate their email campaigns.
          </p>
          <Button
            onClick={() => router.push('/auth/register')}
            size="xl"
            className="bg-indigo-600 text-white hover:bg-indigo-700 border-0 shadow-xl hover:shadow-2xl transition-all duration-200 font-bold px-12"
          >
            Get Started Now
          </Button>
        </div>
      </section>
    </div>
  )
}