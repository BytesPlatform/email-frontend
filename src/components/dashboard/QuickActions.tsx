'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

export function QuickActions() {
  const uploadIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
    </svg>
  )

  const scrapingIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
    </svg>
  )

  const historyIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )

  return (
    <Card variant="elevated">
      <CardHeader
        title="Quick Actions"
        subtitle="Get started with data collection"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        }
      >
        <div></div>
      </CardHeader>
      <CardContent>
        <div className="space-y-12">
          <div className="mb-4">
            <Link href="/dashboard/csv-ingestion">
              <Button 
                className="w-full justify-start h-16 text-left p-6" 
                size="lg"
                leftIcon={uploadIcon}
              >
                <div className="flex flex-col items-start">
                  <span className="font-semibold">Upload CSV File</span>
                  <span className="text-sm font-normal opacity-75">Import contact data from CSV</span>
                </div>
              </Button>
            </Link>
          </div>
          
          <div className="mb-4">
            <Link href="/dashboard/scraping">
              <Button 
                variant="outline" 
                className="w-full justify-start h-16 text-left p-6 hover:bg-indigo-50 hover:border-indigo-300" 
                size="lg"
                leftIcon={scrapingIcon}
              >
                <div className="flex flex-col items-start">
                  <span className="font-semibold">Start Web Scraping</span>
                  <span className="text-sm font-normal opacity-75">Extract data from websites</span>
                </div>
              </Button>
            </Link>
          </div>
          
          <div>
            <Link href="/dashboard/history">
              <Button 
                variant="outline" 
                className="w-full justify-start h-16 text-left p-6 hover:bg-indigo-50 hover:border-indigo-300" 
                size="lg"
                leftIcon={historyIcon}
              >
                <div className="flex flex-col items-start">
                  <span className="font-semibold">View History</span>
                  <span className="text-sm font-normal opacity-75">Check your data operations</span>
                </div>
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
