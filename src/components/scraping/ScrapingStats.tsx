'use client'

import type { StatsResponse } from '@/types/scraping'

interface ScrapingStatsProps {
  stats: StatsResponse['stats']
  onStatClick: (filter: 'all' | 'scraped' | 'ready_to_scrape' | 'scrape_failed') => void
}

export function ScrapingStats({ stats, onStatClick }: ScrapingStatsProps) {
  return (
    <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Total Contacts */}
      <button 
        onClick={() => onStatClick('all')} 
        className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-md text-left hover:shadow-lg transition-shadow cursor-pointer"
      >
        <div className="flex items-center justify-between mb-2">
          <svg className="w-8 h-8 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
        <div className="text-3xl font-bold">{stats.totalContacts}</div>
        <div className="text-sm text-blue-100 mt-1">Total Contacts</div>
      </button>

      {/* Successfully Scraped */}
      <button 
        onClick={() => onStatClick('scraped')} 
        className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white shadow-md text-left hover:shadow-lg transition-shadow cursor-pointer"
      >
        <div className="flex items-center justify-between mb-2">
          <svg className="w-8 h-8 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="text-3xl font-bold">{stats.scraped}</div>
        <div className="text-sm text-green-100 mt-1">Successfully Scraped</div>
      </button>

      {/* Ready to Scrape */}
      <button 
        onClick={() => onStatClick('ready_to_scrape')} 
        className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-5 text-white shadow-md text-left hover:shadow-lg transition-shadow cursor-pointer"
      >
        <div className="flex items-center justify-between mb-2">
          <svg className="w-8 h-8 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="text-3xl font-bold">{stats.readyToScrape}</div>
        <div className="text-sm text-yellow-100 mt-1">Ready to Scrape</div>
      </button>

      {/* Failed */}
      <button 
        onClick={() => onStatClick('scrape_failed')} 
        className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-5 text-white shadow-md text-left hover:shadow-lg transition-shadow cursor-pointer"
      >
        <div className="flex items-center justify-between mb-2">
          <svg className="w-8 h-8 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="text-3xl font-bold">{stats.scrapeFailed}</div>
        <div className="text-sm text-red-100 mt-1">Failed</div>
      </button>
    </div>
  )
}

