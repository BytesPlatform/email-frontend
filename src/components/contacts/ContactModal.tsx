'use client'

import { useEffect } from 'react'
import type { ClientContact } from '@/types/ingestion'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

interface ValidityDisplay {
  label: string
  className: string
  reason?: string
}

interface ContactModalProps {
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
  onClose: () => void
  error?: string | null
  success?: string | null
  formatDateTime: (value?: string) => string
}

export function ContactModal({
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
  onClose,
  error,
  success,
  formatDateTime
}: ContactModalProps) {
  // Block body scrolling when modal is open
  useEffect(() => {
    if (contact) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [contact])

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && contact) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [contact, onClose])

  if (!contact) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {contact.businessName || 'Untitled Contact'}
            </h2>
            <p className="text-xs uppercase tracking-wide text-slate-500 mt-1">
              ID: {contact.id}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {validity && (
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${validity.className}`}
                title={validity.reason}
              >
                {validity.label}
              </span>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="py-12">
              <LoadingSpinner text="Loading contact details..." />
            </div>
          ) : (
            <>
              {validity?.reason && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-sm text-slate-600">{validity.reason}</p>
                </div>
              )}

              {/* Contact Details */}
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                    Email
                  </dt>
                  <dd className="text-sm text-slate-700 break-all">
                    {contact.email || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                    Phone
                  </dt>
                  <dd className="text-sm text-slate-700">
                    {contact.phone || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                    Website
                  </dt>
                  <dd className="text-sm text-indigo-600 break-all">
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
                      <span className="text-slate-400">—</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                    State
                  </dt>
                  <dd className="text-sm text-slate-700">
                    {contact.state || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                    Zip Code
                  </dt>
                  <dd className="text-sm text-slate-700">
                    {contact.zipCode || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                    Status
                  </dt>
                  <dd>
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 capitalize">
                      {contact.status || 'unknown'}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                    Uploaded From
                  </dt>
                  <dd className="text-sm text-slate-700">
                    <span className="block font-medium">
                      {contact.csvUpload?.fileName || '—'}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatDateTime(contact.csvUpload?.createdAt)}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                    Created At
                  </dt>
                  <dd className="text-sm text-slate-700">
                    {formatDateTime(contact.createdAt)}
                  </dd>
                </div>
              </dl>

              {/* Edit Form for Invalid Contacts */}
              {validity?.label === 'Invalid' && (
                <div className="rounded-lg border-2 border-rose-200 bg-rose-50 p-4 space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700">Fix Contact</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Add a valid email or phone number to bring this contact back into the valid list.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Email Address
                      </label>
                      <Input
                        value={editEmail}
                        onChange={event => onEditEmailChange(event.target.value)}
                        placeholder="name@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Phone Number
                      </label>
                      <Input
                        value={editPhone}
                        onChange={event => onEditPhoneChange(event.target.value)}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>

                  {error && (
                    <p className="text-xs font-medium text-rose-600">{error}</p>
                  )}
                  {success && (
                    <p className="text-xs font-medium text-emerald-600">{success}</p>
                  )}

                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={onSave}
                      isLoading={isSaving}
                      disabled={isSaving}
                    >
                      Save Contact
                    </Button>
                    <Button variant="ghost" size="sm" onClick={onReset}>
                      Reset
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

