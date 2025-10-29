import React from 'react'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse rounded-md bg-slate-200 ${className}`}></div>
  )
}

interface SkeletonTextProps {
  lines?: number
  className?: string
}

export function SkeletonText({ lines = 3, className = '' }: SkeletonTextProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, idx) => (
        <div key={idx} className="h-3 rounded bg-slate-200 animate-pulse w-full"></div>
      ))}
    </div>
  )
}

interface SkeletonAvatarProps {
  size?: 'sm' | 'md' | 'lg'
  rounded?: boolean
  className?: string
}

export function SkeletonAvatar({ size = 'md', rounded = true, className = '' }: SkeletonAvatarProps) {
  const sizeClass = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  }[size]
  return (
    <div className={`animate-pulse ${rounded ? 'rounded-full' : 'rounded-md'} bg-slate-200 ${sizeClass} ${className}`}></div>
  )
}

interface SkeletonCardProps {
  className?: string
  header?: boolean
  footer?: boolean
}

export function SkeletonCard({ className = '', header = true, footer = false }: SkeletonCardProps) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}>
      {header && (
        <div className="mb-4 flex items-center gap-3">
          <SkeletonAvatar size="sm" />
          <div className="flex-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-2 h-3 w-24" />
          </div>
        </div>
      )}
      <SkeletonText lines={4} />
      {footer && (
        <div className="mt-6 flex gap-3">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      )}
    </div>
  )
}

export default Skeleton


