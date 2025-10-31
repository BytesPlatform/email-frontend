import React from 'react'
import Link from 'next/link'

interface EmailGenerationHeaderProps {
  mode: 'email' | 'sms'
  onModeChange: (mode: 'email' | 'sms') => void
}

const EmailGenerationHeaderComponent: React.FC<EmailGenerationHeaderProps> = ({
  mode,
  onModeChange,
}) => {
  return (
    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Link href="/dashboard" className="text-white/80 hover:text-white text-sm mb-2 inline-flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold mb-2">{mode === 'email' ? 'Email Generation' : 'SMS Generation'}</h1>
          <p className="text-indigo-100 text-lg">
            {mode === 'email' 
              ? 'Generate business summaries and personalized emails for your scraped contacts.'
              : 'Generate business summaries and personalized SMS for your scraped contacts.'}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Mode Toggle */}
          <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/20">
            <span className={`text-sm font-medium px-3 py-1 rounded transition-colors ${mode === 'email' ? 'bg-white text-indigo-600' : 'text-white/70'}`}>
              Email
            </span>
            <button
              onClick={() => onModeChange(mode === 'email' ? 'sms' : 'email')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-600 ${
                mode === 'sms' ? 'bg-white' : 'bg-white/30'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-indigo-600 transition-transform ${
                  mode === 'sms' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm font-medium px-3 py-1 rounded transition-colors ${mode === 'sms' ? 'bg-white text-indigo-600' : 'text-white/70'}`}>
              SMS
            </span>
          </div>
          <div className="hidden md:block">
            <div className="h-20 w-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30">
              {mode === 'email' ? (
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              ) : (
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

EmailGenerationHeaderComponent.displayName = 'EmailGenerationHeader'

export const EmailGenerationHeader = React.memo(EmailGenerationHeaderComponent)
