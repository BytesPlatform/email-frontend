'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Skeleton, SkeletonText } from '@/components/common/Skeleton'

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)
  const [hasRedirected, setHasRedirected] = useState(false)

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    if (!isLoading) {
      setIsChecking(false)
      if (!isAuthenticated && !hasRedirected) {
        setHasRedirected(true)
        router.push('/auth/login')
      }
    }
  }, [isAuthenticated, isLoading, router, hasRedirected])

  // Show loading while checking authentication
  if (isLoading || isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="mb-8 flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-2 h-3 w-24" />
            </div>
          </div>
          <SkeletonText lines={4} />
        </div>
      </div>
    )
  }

  // Don't render children if not authenticated
  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
