import { ButtonHTMLAttributes, ReactNode } from 'react'
import { Skeleton } from '@/components/common/Skeleton'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'success'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  isLoading?: boolean
  children: ReactNode
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  children,
  disabled,
  leftIcon,
  rightIcon,
  ...props
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0 relative overflow-hidden'

  const variantClasses = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 shadow-lg hover:shadow-xl border-0',
    secondary: 'bg-white text-slate-900 hover:bg-slate-50 border border-slate-200 shadow-sm hover:shadow-md focus:ring-slate-500',
    danger: 'bg-gradient-to-br from-red-500 via-red-600 to-red-700 text-white hover:from-red-400 hover:via-red-500 hover:to-red-600 focus:ring-red-500 shadow-[0_4px_14px_0_rgba(220,38,38,0.39)] hover:shadow-[0_6px_20px_rgba(220,38,38,0.23)] border border-red-500/20',
    success: 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 text-white hover:from-emerald-400 hover:via-emerald-500 hover:to-emerald-600 focus:ring-emerald-500 shadow-[0_4px_14px_0_rgba(16,185,129,0.39)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.23)] border border-emerald-500/20',
    outline: 'bg-transparent border-2 border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400 focus:ring-slate-500',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-500'
  }

  const sizeClasses = {
    xs: 'px-3 py-1.5 text-xs gap-1.5',
    sm: 'px-4 py-2 text-sm gap-2',
    md: 'px-5 py-2.5 text-sm gap-2',
    lg: 'px-8 py-3.5 text-base gap-2.5',
    xl: 'px-10 py-4 text-lg gap-3'
  }

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {/* Loading state placeholder */}
      {isLoading && (
        <Skeleton className="-ml-1 mr-2 h-4 w-4 bg-white/20" />
      )}

      {/* Left icon */}
      {!isLoading && leftIcon && (
        <span className="flex-shrink-0">{leftIcon}</span>
      )}

      {/* Button content */}
      <span className="flex-1">{children}</span>

      {/* Right icon */}
      {!isLoading && rightIcon && (
        <span className="flex-shrink-0">{rightIcon}</span>
      )}
    </button>
  )
}
