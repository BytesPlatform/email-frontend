'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

interface EmptyDraftsStateProps {
  type: 'email' | 'sms'
  onNavigateToGeneration?: () => void
}

export function EmptyDraftsState({ type, onNavigateToGeneration }: EmptyDraftsStateProps) {
  const isEmail = type === 'email'
  
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        {isEmail ? (
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        ) : (
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        No {isEmail ? 'Email' : 'SMS'} Drafts Yet
      </h3>
      <p className="text-sm text-gray-500 text-center mb-6 max-w-md">
        {isEmail 
          ? "You haven't created any email drafts yet. Generate your first email draft to get started."
          : "You haven't created any SMS drafts yet. Generate your first SMS draft to get started."
        }
      </p>
      
      <Link href="/dashboard/email-generation">
        <Button variant="primary">
          Go to Generation Page
        </Button>
      </Link>
    </div>
  )
}

