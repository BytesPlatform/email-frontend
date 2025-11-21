import React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { truncateBusinessName } from '@/lib/utils'
import type { ScrapedRecord } from '@/types/emailGeneration'

interface RecordTableRowProps {
  record: ScrapedRecord
  mode: 'email' | 'sms'
  isSelected: boolean
  onSelect: (selected: boolean) => void
  onRowClick: () => void
  onViewSummary: (recordId: number) => Promise<void>
  onViewEmailBody: (recordId: number) => Promise<void>
  onViewSMSBody: (recordId: number) => Promise<void>
  onSetEmailBodyOverlay: (overlay: {
    isOpen: boolean
    subject: string
    body: string
    smsDraftId?: number
    emailDraftId?: number
    isEditMode?: boolean
    spamCheckResult?: {
      score: number
      keywords: string[]
      suggestions: string[]
      blocked: boolean
    }
  }) => void
  onGenerateSummary: (recordId: number) => void
  onGenerateEmail: (recordId: number) => void
  onGenerateSMS: (recordId: number) => void
  onSendEmail: (recordId: number) => void
  onSendSMS: (recordId: number) => void
}

const RecordTableRowComponent: React.FC<RecordTableRowProps> = ({
  record,
  mode,
  isSelected,
  onSelect,
  onRowClick,
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
  const router = useRouter()
  // Check if record has a draft (should hide checkbox)
  const hasDraft = mode === 'email' 
    ? (record.hasEmailDraft || record.emailDraftId) 
    : (record.hasSMSDraft || record.smsDraftId)

  return (
    <tr key={record.id} className={`${isSelected ? 'bg-blue-50' : ''}`}>
      {!hasDraft && (
        <td className="px-2 py-2 whitespace-nowrap w-12" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation()
              onSelect(e.target.checked)
            }}
            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
          />
        </td>
      )}
      {hasDraft && <td className="px-2 py-2 whitespace-nowrap w-12"></td>}
      <td className="px-2 py-2 whitespace-nowrap min-w-[150px]">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-8 w-8">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-semibold text-xs">
                {record.businessName?.[0]?.toUpperCase() || 'B'}
              </span>
            </div>
          </div>
          <div className="ml-3">
            <div className="text-sm font-medium text-gray-900">
              {truncateBusinessName(record.businessName)}
            </div>
            <div className="text-xs text-gray-500">
              ID: {record.contactId}
            </div>
          </div>
        </div>
      </td>
      <td className="px-2 py-2 whitespace-nowrap min-w-[120px]">
        <div className="text-sm text-gray-900 truncate">
          {record.email || 'No email'}
        </div>
        <div className="text-xs text-gray-500 truncate">
          {record.website || 'No website'}
        </div>
      </td>
      <td className="px-2 py-2 whitespace-nowrap min-w-[120px]">
        <div className="flex items-center space-x-1">
          {record.hasSummary && (
            <Button
              onClick={async (e) => {
                e.stopPropagation()
                await onViewSummary(record.id)
              }}
              disabled={record.isLoadingSummary}
              variant="outline"
              size="xs"
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
            >
              {record.isLoadingSummary ? 'Loading...' : 'View'}
            </Button>
          )}
        </div>
      </td>
      <td className="px-2 py-2 whitespace-nowrap text-sm font-medium min-w-[140px]">
        <div className="flex space-x-1 cursor-pointer" onClick={(e) => e.stopPropagation()}>
          {(!record.hasSummary && !record.generatedSummary) ? (
            <Button
              onClick={() => onGenerateSummary(record.id)}
              disabled={record.isGeneratingSummary}
              isLoading={record.isGeneratingSummary}
              size="sm"
            >
              {record.isGeneratingSummary ? 'AI Processing...' : 'Generate Summary'}
            </Button>
          ) : mode === 'email' ? (
            !record.generatedEmail && !record.emailDraftId && !record.hasEmailDraft ? (
              <Button
                onClick={() => onGenerateEmail(record.id)}
                disabled={record.isGeneratingEmail}
                isLoading={record.isGeneratingEmail}
                size="sm"
                variant="success"
              >
                {record.isGeneratingEmail ? 'Generating...' : 'Generate Email'}
              </Button>
            ) : (
              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  // Navigate to drafts page with email draft ID
                  router.push(`/dashboard/draft?emailDraftId=${record.emailDraftId}`)
                }}
                size="sm"
                variant="primary"
              >
                View Draft
              </Button>
            )
          ) : (
            !record.generatedSMS && !record.smsDraftId && !record.hasSMSDraft ? (
              <Button
                onClick={() => onGenerateSMS(record.id)}
                disabled={record.isGeneratingSMS}
                isLoading={record.isGeneratingSMS}
                size="sm"
                variant="success"
              >
                {record.isGeneratingSMS ? 'Generating...' : 'Generate SMS'}
              </Button>
            ) : (
              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  // Navigate to drafts page with SMS draft ID
                  router.push(`/dashboard/draft?smsDraftId=${record.smsDraftId}`)
                }}
                size="sm"
                variant="primary"
              >
                View Draft
              </Button>
            )
          )}
        </div>
      </td>
    </tr>
  )
}

RecordTableRowComponent.displayName = 'RecordTableRow'

export const RecordTableRow = React.memo(RecordTableRowComponent)
