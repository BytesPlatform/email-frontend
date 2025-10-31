import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { getCurrentPageRecords } from './utils/emailGenerationUtils'
import { RecordTableRow } from './RecordTableRow'
import type { ScrapedRecord } from '@/types/emailGeneration'

interface RecordsTableProps {
  records: ScrapedRecord[]
  isLoading: boolean
  mode: 'email' | 'sms'
  currentPage: number
  recordsPerPage: number
  onRecordClick: (record: ScrapedRecord) => void
  onViewSummary: (recordId: number) => Promise<void>
  onViewEmailBody: (recordId: number) => Promise<void>
  onViewSMSBody: (recordId: number) => Promise<void>
  onSetEmailBodyOverlay: (overlay: {
    isOpen: boolean
    subject: string
    body: string
    smsDraftId?: number
    isEditMode?: boolean
  }) => void
  onGenerateSummary: (recordId: number) => void
  onGenerateEmail: (recordId: number) => void
  onGenerateSMS: (recordId: number) => void
  onSendEmail: (recordId: number) => void
  onSendSMS: (recordId: number) => void
}

export const RecordsTable: React.FC<RecordsTableProps> = ({
  records,
  isLoading,
  mode,
  currentPage,
  recordsPerPage,
  onRecordClick,
  onViewSummary,
  onViewEmailBody,
  onViewSMSBody,
  onSetEmailBodyOverlay,
  onGenerateSummary,
  onGenerateEmail,
  onGenerateSMS,
  onSendEmail,
  onSendSMS,
}) => {
  const currentRecords = getCurrentPageRecords(records, currentPage, recordsPerPage)

  return (
    <Card variant="elevated">
      <CardHeader
        title="Scraped Records"
        subtitle="Generate summaries and emails for your scraped contacts"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
      />
      <CardContent>
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading scraped records...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Scraped Records</h3>
            <p className="text-gray-500 mb-6">No successfully scraped records found. You need to scrape some contacts first before generating emails.</p>
            <Link 
              href="/dashboard/scraping" 
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 shadow-md font-medium"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Go to Scraping
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto relative">
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent opacity-50 pointer-events-none"></div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                    Business
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                    Contact Info
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                    Summary
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                    {mode === 'email' ? 'Email' : 'SMS'}
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentRecords.map((record) => (
                  <RecordTableRow
                    key={record.id}
                    record={record}
                    mode={mode}
                    onRowClick={() => onRecordClick(record)}
                    onViewSummary={onViewSummary}
                    onViewEmailBody={onViewEmailBody}
                    onViewSMSBody={onViewSMSBody}
                    onSetEmailBodyOverlay={onSetEmailBodyOverlay}
                    onGenerateSummary={onGenerateSummary}
                    onGenerateEmail={onGenerateEmail}
                    onGenerateSMS={onGenerateSMS}
                    onSendEmail={onSendEmail}
                    onSendSMS={onSendSMS}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
