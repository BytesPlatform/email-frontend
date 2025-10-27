import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'elevated' | 'outlined' | 'filled'
  hover?: boolean
}

export function Card({ 
  children, 
  className = '', 
  padding = 'md',
  variant = 'default',
  hover = false
}: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10'
  }

  const variantClasses = {
    default: 'bg-white border border-slate-200 shadow-sm',
    elevated: 'bg-white border-0 shadow-lg',
    outlined: 'bg-white border-2 border-slate-200 shadow-none',
    filled: 'bg-slate-50 border border-slate-200 shadow-sm'
  }

  const hoverClasses = hover ? 'hover:shadow-lg hover:border-slate-300 transition-all duration-200' : ''

  return (
    <div className={`
      rounded-xl overflow-hidden
      ${variantClasses[variant]}
      ${paddingClasses[padding]}
      ${hoverClasses}
      ${className}
    `}>
      {children}
    </div>
  )
}

interface CardHeaderProps {
  children?: ReactNode
  className?: string
  title?: string
  subtitle?: string
  icon?: ReactNode
}

export function CardHeader({ 
  children, 
  className = '', 
  title,
  subtitle,
  icon
}: CardHeaderProps) {
  return (
    <div className={`border-b border-slate-200 pb-4 mb-6 ${className}`}>
      {(title || subtitle || icon) && (
        <div className="flex items-start space-x-3 mb-4">
          {icon && (
            <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
              {icon}
            </div>
          )}
          <div className="flex-1">
            {title && (
              <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            )}
            {subtitle && (
              <p className="text-sm text-slate-600 mt-1">{subtitle}</p>
            )}
          </div>
        </div>
      )}
      {children}
    </div>
  )
}

interface CardContentProps {
  children: ReactNode
  className?: string
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return (
    <div className={className}>
      {children}
    </div>
  )
}

interface CardFooterProps {
  children: ReactNode
  className?: string
  align?: 'left' | 'center' | 'right' | 'between'
}

export function CardFooter({ 
  children, 
  className = '', 
  align = 'left' 
}: CardFooterProps) {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between'
  }

  return (
    <div className={`
      border-t border-slate-200 pt-4 mt-6 
      flex items-center ${alignClasses[align]}
      ${className}
    `}>
      {children}
    </div>
  )
}
