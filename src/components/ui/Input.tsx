import { InputHTMLAttributes, forwardRef, ReactNode } from 'react'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'filled' | 'outlined'
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    label, 
    error, 
    helperText, 
    leftIcon, 
    rightIcon, 
    size = 'md',
    variant = 'default',
    className = '', 
    ...props 
  }, ref) => {
    const sizeClasses = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-3 text-sm',
      lg: 'px-4 py-4 text-base'
    }

    const variantClasses = {
      default: 'bg-white border border-slate-300 focus:border-indigo-500 focus:ring-indigo-500',
      filled: 'bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 focus:bg-white',
      outlined: 'bg-transparent border-2 border-slate-300 focus:border-indigo-500 focus:ring-indigo-500'
    }

    const iconPadding = {
      left: leftIcon ? 'pl-10' : '',
      right: rightIcon ? 'pr-10' : ''
    }

    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          {/* Left Icon */}
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <div className="text-slate-400">
                {leftIcon}
              </div>
            </div>
          )}
          
          <input
            ref={ref}
            className={`
              w-full text-slate-900 placeholder-slate-400
              rounded-lg transition-all duration-200 ease-in-out
              focus:outline-none focus:ring-2 focus:ring-offset-0
              hover:border-slate-400
              ${sizeClasses[size]}
              ${variantClasses[variant]}
              ${iconPadding.left}
              ${iconPadding.right}
              ${error 
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50' 
                : ''
              }
              ${className}
            `}
            {...props}
          />
          
          {/* Right Icon */}
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <div className="text-slate-400">
                {rightIcon}
              </div>
            </div>
          )}
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="flex items-center space-x-1">
            <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-600 font-medium">{error}</p>
          </div>
        )}
        
        {/* Helper Text */}
        {helperText && !error && (
          <p className="text-sm text-slate-500 font-medium">{helperText}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
