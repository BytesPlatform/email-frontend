import React from 'react'
import { Button } from '@/components/ui/Button'
import { truncateBusinessName } from './utils/emailGenerationUtils'
import type { ScrapedRecord } from '@/types/emailGeneration'

interface RecordTableRowProps {
  record: ScrapedRecord
  mode: 'email' | 'sms'
  onRowClick: () => void
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

const RecordTableRowComponent: React.FC<RecordTableRowProps> = ({
  record,
  mode,
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
  return (
    <tr key={record.id} className="hover:bg-gray-50 cursor-pointer" onClick={onRowClick}>
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
        </div>
      </td>
      <td className="px-2 py-2 whitespace-nowrap min-w-[120px]">
        {mode === 'email' ? (
          <div className="flex items-center space-x-1">
            <Button
              onClick={async (e) => {
                e.stopPropagation()
                if (record.generatedEmail) {
                  onSetEmailBodyOverlay({
                    isOpen: true,
                    subject: record.generatedEmail.subject,
                    body: record.generatedEmail.body
                  })
                } else {
                  await onViewEmailBody(record.id)
                }
              }}
              disabled={record.isLoadingEmailDraft}
              variant="outline"
              size="xs"
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
            >
              {record.isLoadingEmailDraft ? 'Loading...' : 'View Body'}
            </Button>
          </div>
        ) : (
          <div className="flex items-center space-x-1">
            <Button
              onClick={async (e) => {
                e.stopPropagation()
                if (record.generatedSMS) {
                  onSetEmailBodyOverlay({
                    isOpen: true,
                    subject: record.generatedSMS.subject,
                    body: record.generatedSMS.body,
                    smsDraftId: record.smsDraftId,
                    isEditMode: false
                  })
                } else {
                  await onViewSMSBody(record.id)
                }
              }}
              disabled={record.isLoadingSMSDraft}
              variant="outline"
              size="xs"
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
            >
              {record.isLoadingSMSDraft ? 'Loading...' : 'View SMS'}
            </Button>
          </div>
        )}
      </td>
      <td className="px-2 py-2 whitespace-nowrap text-sm font-medium min-w-[140px]">
        <div className="flex space-x-1" onClick={(e) => e.stopPropagation()}>
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
                onClick={() => onSendEmail(record.id)}
                disabled={record.isSendingEmail}
                isLoading={record.isSendingEmail}
                size="sm"
                variant="primary"
              >
                {record.isSendingEmail ? 'Sending...' : 'Send Email'}
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
            ) : record.smsStatus === 'sent' ? (
              <span className="text-sm text-green-600 font-medium">SMS Sent ✓</span>
            ) : (
              <Button
                onClick={() => onSendSMS(record.id)}
                disabled={record.isSendingSMS}
                isLoading={record.isSendingSMS}
                size="sm"
                variant="primary"
              >
                {record.isSendingSMS ? 'Sending...' : 'Send SMS'}
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
