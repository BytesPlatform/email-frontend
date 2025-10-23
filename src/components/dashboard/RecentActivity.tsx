'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/Card'

export function RecentActivity() {
  return (
    <Card variant="elevated">
      <CardHeader
        title="Recent Activity"
        subtitle="Your latest data operations"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      >
        <div></div>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">No recent activity</h3>
          <p className="text-gray-500 text-sm leading-relaxed max-w-sm mx-auto">
            Start uploading CSV files or running scraping jobs to see your activity history here.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
