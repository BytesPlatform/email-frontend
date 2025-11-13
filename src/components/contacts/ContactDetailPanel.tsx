import type { ClientContact } from '@/types/ingestion'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

interface ValidityDisplay {
  label: string
  className: string
  reason?: string
}

interface ContactDetailPanelProps {
  contact: ClientContact | null
  validity: ValidityDisplay | null
  isLoading: boolean
  isSaving: boolean
  editEmail: string
  editPhone: string
  onEditEmailChange: (value: string) => void
  onEditPhoneChange: (value: string) => void
  onSave: () => void
  onReset: () => void
  onClearSelection: () => void
  error?: string | null
  success?: string | null
}

export function ContactDetailPanel({
  contact,
  validity,
  isLoading,
  isSaving,
  editEmail,
  editPhone,
  onEditEmailChange,
  onEditPhoneChange,
  onSave,
  onReset,
  onClearSelection,
  error,
  success
}: ContactDetailPanelProps) {
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <LoadingSpinner text="Loading contact details..." />
      </div>
    )
  }

  if (!contact) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        <span>Select a contact to view details.</span>
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            {contact.businessName || 'Untitled Contact'}
          </h3>
          <p className="text-xs uppercase tracking-wide text-slate-500 mt-1">
            ID: {contact.id}
          </p>
        </div>
        {validity && (
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${validity.className}`}
            title={validity.reason}
          >
            {validity.label}
          </span>
        )}
      </div>

      {validity?.reason && (
        <p className="text-xs text-slate-500">{validity.reason}</p>
      )}

      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
            Email
          </dt>
          <dd className="text-slate-700 break-all">{contact.email || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
            Phone
          </dt>
          <dd className="text-slate-700">{contact.phone || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
            State
          </dt>
          <dd className="text-slate-700">{contact.state || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
            Zip code
          </dt>
          <dd className="text-slate-700">{contact.zipCode || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
            Website
          </dt>
          <dd className="text-indigo-600 break-all">
            {contact.website ? (
              <a
                href={
                  contact.website.startsWith('http')
                    ? contact.website
                    : `https://${contact.website}`
                }
                target="_blank"
                rel="noreferrer"
                className="hover:underline"
              >
                {contact.website}
              </a>
            ) : (
              <span className="text-slate-700">—</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
            Uploaded from
          </dt>
          <dd className="text-slate-700">
            <span className="block font-medium">{contact.csvUpload?.fileName || '—'}</span>
            <span className="text-xs text-slate-500">{contact.csvUpload?.createdAt}</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
            Created at
          </dt>
          <dd className="text-slate-700">{contact.createdAt || '—'}</dd>
        </div>
      </dl>

      <div className="pt-2">
        <Button variant="outline" size="sm" onClick={onClearSelection}>
          Clear selection
        </Button>
      </div>
    </div>
  )
}

