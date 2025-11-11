'use client'

import React from 'react'

export type DraftViewType =
  | 'all'
  | 'email'
  | 'sms'
  | 'starred'
  | 'not-delivered'

interface DraftsSidebarProps {
  isCollapsed: boolean
  activeView: DraftViewType
  activeTab?: 'email' | 'sms'
  onViewChange: (view: DraftViewType) => void
  onToggleCollapse: () => void
  allDraftsCount?: number
  emailDraftCount: number
  smsDraftCount: number
  starredCount: number
  notDeliveredCount: number
}

export function DraftsSidebar({
  isCollapsed,
  activeView,
  activeTab,
  onViewChange,
  onToggleCollapse,
  allDraftsCount,
  emailDraftCount,
  smsDraftCount,
  starredCount,
  notDeliveredCount,
}: DraftsSidebarProps) {
  const menuItems = [
    {
      id: 'all' as DraftViewType,
      label: 'All Drafts',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      count: allDraftsCount ?? (emailDraftCount + smsDraftCount),
    },
    {
      id: 'email' as DraftViewType,
      label: 'Email Drafts',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      count: emailDraftCount,
    },
    {
      id: 'sms' as DraftViewType,
      label: 'SMS Drafts',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      count: smsDraftCount,
    },
    {
      id: 'starred' as DraftViewType,
      label: 'Starred',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ),
      count: starredCount,
    },
    {
      id: 'not-delivered' as DraftViewType,
      label: 'Not Delivered',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01" />
        </svg>
      ),
      count: notDeliveredCount,
    },
  ]

  return (
    <aside
      className={`bg-white border-r border-gray-200 flex flex-col overflow-hidden transition-[width] duration-300 ease-in-out ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Hamburger Menu Button - Prominently placed on left like Gmail */}
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

