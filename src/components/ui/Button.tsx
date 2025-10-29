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
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden'
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 text-white hover:from-indigo-700 hover:via-indigo-800 hover:to-indigo-900 focus:ring-indigo-500 shadow-lg hover:shadow-xl border border-indigo-700',
    secondary: 'bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 text-white hover:from-slate-700 hover:via-slate-800 hover:to-slate-900 focus:ring-slate-500 shadow-lg hover:shadow-xl border border-slate-700',
    danger: 'bg-gradient-to-r from-red-600 via-red-700 to-red-800 text-white hover:from-red-700 hover:via-red-800 hover:to-red-900 focus:ring-red-500 shadow-lg hover:shadow-xl border border-red-700',
    success: 'bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-800 text-white hover:from-emerald-700 hover:via-emerald-800 hover:to-emerald-900 focus:ring-emerald-500 shadow-lg hover:shadow-xl border border-emerald-700',
    outline: 'border-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 focus:ring-slate-500 shadow-sm hover:shadow-md hover:bg-slate-50',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 focus:ring-slate-500 border border-transparent hover:border-slate-200'
  }
  
  const sizeClasses = {
    xs: 'px-2.5 py-1.5 text-xs gap-1',
    sm: 'px-3 py-2 text-sm gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2',
    xl: 'px-8 py-4 text-lg gap-2.5'
  }

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {/* Loading state placeholder */}
      {isLoading && (
        <Skeleton className="-ml-1 mr-2 h-4 w-4" />
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
