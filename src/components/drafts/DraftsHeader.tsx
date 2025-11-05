'use client'

import React from 'react'
import { DraftsToggle } from './DraftsToggle'

interface DraftsHeaderProps {
  activeTab: 'email' | 'sms'
  onTabChange: (tab: 'email' | 'sms') => void
  emailCount?: number
  smsCount?: number
}

export function DraftsHeader({ activeTab, onTabChange, emailCount = 0, smsCount = 0 }: DraftsHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Drafts Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          View and manage your email and SMS drafts
        </p>
      </div>
      
      <DraftsToggle
        activeTab={activeTab}
        onTabChange={onTabChange}
        emailCount={emailCount}
        smsCount={smsCount}
      />
    </div>
  )
}

