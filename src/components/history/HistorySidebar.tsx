'use client'

import React from 'react'

export type HistoryViewType =
  | 'all'
  | 'sms-sent'
  | 'email-sent'
  | 'email-unsubscribed'

interface HistorySidebarProps {
  isCollapsed: boolean
  activeView: HistoryViewType
  onViewChange: (view: HistoryViewType) => void
  onToggleCollapse: () => void
  allCount?: number
  smsSentCount: number
  emailSentCount: number
  emailUnsubscribedCount: number
}

export function HistorySidebar({
  isCollapsed,
  activeView,
  onViewChange,
  onToggleCollapse,
  allCount,
  smsSentCount,
  emailSentCount,
  emailUnsubscribedCount,
}: HistorySidebarProps) {
  const menuItems = [
    {
      id: 'all' as HistoryViewType,
      label: 'All History',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      count: allCount ?? (smsSentCount + emailSentCount + emailUnsubscribedCount),
    },
    {
      id: 'sms-sent' as HistoryViewType,
      label: 'SMS Sent',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      count: smsSentCount,
    },
    {
      id: 'email-sent' as HistoryViewType,
      label: 'Email Sent',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      count: emailSentCount,
    },
    {
      id: 'email-unsubscribed' as HistoryViewType,
      label: 'Email Unsubscribed',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      ),
      count: emailUnsubscribedCount,
    },
  ]

  return (
    <aside
      className={`flex flex-col h-full overflow-hidden transition-[width] duration-300 ease-in-out ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Hamburger Menu Button */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 min-h-[60px]">
        <button
          onClick={onToggleCollapse}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
          title={isCollapsed ? 'Show main menu' : 'Hide main menu'}
        >
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span
          className={`text-sm font-medium text-gray-700 transition-opacity duration-300 ease-in-out whitespace-nowrap ${
            isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'
          }`}
        >
          Menu
        </span>
      </div>

      {/* Sidebar Content */}
      <div className="flex-1 overflow-y-auto">
        <nav className="p-2">
          {menuItems.map((item) => {
            const isActive = activeView === item.id
            const showCount = item.count > 0 && !isCollapsed

            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <span className={`flex-shrink-0 ${isActive ? 'text-blue-700' : 'text-gray-600'}`}>
                  {item.icon}
                </span>
                <span
                  className={`flex-1 text-left text-sm transition-opacity duration-300 ease-in-out whitespace-nowrap ${
                    isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'
                  }`}
                >
                  {item.label}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full transition-opacity duration-300 ease-in-out whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-200 text-blue-800'
                      : 'bg-gray-200 text-gray-700'
                  } ${
                    !showCount || isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'
                  }`}
                >
                  {item.count > 99 ? '99+' : item.count}
                </span>
              </button>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}

