import React from 'react'

interface ErrorMessageProps {
  message: string | null
}

const ErrorMessageComponent: React.FC<ErrorMessageProps> = ({ message }) => {
  if (!message) return null

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
      <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
      <span className="text-red-700">{message}</span>
    </div>
  )
}

ErrorMessageComponent.displayName = 'ErrorMessage'

export const ErrorMessage = React.memo(ErrorMessageComponent)
