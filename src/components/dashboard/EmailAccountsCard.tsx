'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { clientAccountsApi, ClientEmail } from '@/api/clientAccounts'
import { canResendOtp, resendCountdown } from '@/lib/phone'

const verificationChip: Record<ClientEmail['verificationStatus'], string> = {
  verified: 'bg-green-100 text-green-800',
  pending: 'bg-amber-100 text-amber-800',
  expired: 'bg-slate-200 text-slate-700',
  rejected: 'bg-red-100 text-red-700',
}

export function EmailAccountsCard() {
  const [emails, setEmails] = useState<ClientEmail[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; emailId: number | null; emailAddress: string; verificationId: number | null }>({
    isOpen: false,
    emailId: null,
    emailAddress: '',
    verificationId: null,
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({}) // Use string key to support both id and verificationId
  const [otpVerifying, setOtpVerifying] = useState<Record<string, boolean>>({})
  const [otpSending, setOtpSending] = useState<Record<string, boolean>>({})

  useEffect(() => {
    loadEmails()
  }, [])

  const loadEmails = async () => {
    setIsLoading(true)
    setError(null)
    setNotice(null)
    try {
      const response = await clientAccountsApi.getClientEmails()
      if (response.success && response.data) {
        setEmails(response.data)
      } else {
        setError(response.error || 'Failed to load emails')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load emails')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddEmail = async () => {
    if (!newEmail.trim()) {
      setError('Please enter an email address')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) {
      setError('Please enter a valid email address')
      return
    }

    setIsAdding(true)
    setError(null)
    setNotice(null)
    try {
      const response = await clientAccountsApi.createClientEmail({ emailAddress: newEmail })
      if (response.success && response.data) {
        setEmails([response.data, ...emails])
        setNewEmail('')
        setNotice('We sent a verification code to that inbox. Enter it below to activate sending.')
      } else {
        let errorMessage = response.error || 'Failed to add email'
        if (errorMessage.includes('already exists')) {
          errorMessage = 'This email address is already registered for your account.'
        }
        setError(errorMessage)
      }
    } catch (err) {
      let errorMessage = 'Failed to add email'
      if (err instanceof Error) {
        errorMessage = err.message
        if (errorMessage.includes('already exists')) {
          errorMessage = 'This email address is already registered for your account.'
        } else if (errorMessage.includes('BadRequestException')) {
          errorMessage = errorMessage.replace(/BadRequestException:\s*/g, '').split('\n')[0]
        }
      }
      setError(errorMessage)
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeleteClick = (email: ClientEmail) => {
    const emailAddress = email.emailAddress
    // If it's a pending verification (id is null), use verificationId
    if (email.id === null && email.verificationId) {
      setDeleteDialog({ isOpen: true, emailId: null, emailAddress, verificationId: email.verificationId })
    } else if (email.id !== null) {
      // Verified email - use the ClientEmail id
      setDeleteDialog({ isOpen: true, emailId: email.id, emailAddress, verificationId: null })
    } else {
      setError('Cannot delete: No valid identifier found.')
    }
  }

  const handleDeleteConfirm = async () => {
    setIsDeleting(true)
    setError(null)
    setNotice(null)
    try {
      let response
      // If it's a pending verification (verificationId exists), delete the verification
      if (deleteDialog.verificationId !== null) {
        response = await clientAccountsApi.deletePendingEmailVerification(deleteDialog.verificationId)
        if (response.success) {
          setEmails(emails.filter(email => email.verificationId !== deleteDialog.verificationId))
        }
      } else if (deleteDialog.emailId !== null) {
        // Verified email - delete the ClientEmail
        response = await clientAccountsApi.deleteClientEmail(deleteDialog.emailId)
        if (response.success) {
          setEmails(emails.filter(email => email.id !== deleteDialog.emailId))
        }
      } else {
        setError('No valid identifier for deletion')
        return
      }

      if (response && response.success) {
        setDeleteDialog({ isOpen: false, emailId: null, emailAddress: '', verificationId: null })
      } else {
        setError(response?.error || 'Failed to delete email')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete email')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteDialog({ isOpen: false, emailId: null, emailAddress: '', verificationId: null })
  }

  // Get unique identifier for an email (id or verificationId)
  const getEmailIdentifier = (email: ClientEmail): string => {
    return email.id !== null ? `id_${email.id}` : `verification_${email.verificationId || 'unknown'}`
  }

  // Get the numeric ID to use for API calls
  const getEmailApiId = (email: ClientEmail): number => {
    return email.id !== null ? email.id : (email.verificationId || 0)
  }

  const updateEmail = (identifier: string, updater: (email: ClientEmail) => ClientEmail) => {
    setEmails(prev => prev.map(email => {
      const emailKey = getEmailIdentifier(email)
      return emailKey === identifier ? updater(email) : email
    }))
  }

  const handleVerifyOtp = async (email: ClientEmail) => {
    const identifier = getEmailIdentifier(email)
    const code = otpInputs[identifier]?.trim()
    if (!code) {
      setError('Enter the verification code before submitting.')
      return
    }

    const apiId = getEmailApiId(email)
    setOtpVerifying(prev => ({ ...prev, [identifier]: true }))
    setError(null)
    setNotice(null)
    try {
      const response = await clientAccountsApi.verifyEmailOtp(apiId, code)
      if (!response.success) {
        throw new Error(response.error || 'Failed to verify email')
      }

      // Reload emails to get the updated record with the new id
      await loadEmails()
      setOtpInputs(prev => ({ ...prev, [identifier]: '' }))
      setNotice('Email verified. You can start sending immediately.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify email')
    } finally {
      setOtpVerifying(prev => ({ ...prev, [identifier]: false }))
    }
  }

  const handleRequestOtp = async (email: ClientEmail) => {
    const identifier = getEmailIdentifier(email)
    const apiId = getEmailApiId(email)
    setOtpSending(prev => ({ ...prev, [identifier]: true }))
    setError(null)
    setNotice(null)

    try {
      const response = await clientAccountsApi.requestEmailOtp(apiId)
      if (!response.success) {
        throw new Error(response.error || 'Failed to send verification code')
      }

      updateEmail(identifier, email => ({
        ...email,
        verificationStatus: 'pending',
        lastOtpSentAt: new Date().toISOString(),
      }))
      setNotice('Verification code sent. Check your inbox.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code')
    } finally {
      setOtpSending(prev => ({ ...prev, [identifier]: false }))
    }
  }

  return (
    <Card variant="elevated">
      <CardHeader
        title="Email Accounts"
        subtitle="Verify each sender before delivering campaigns"
        icon={
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        }
      />
      <CardContent>
        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
        {notice && (
          <div className="mb-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-700 text-sm">
            {notice}
          </div>
        )}

        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddEmail()}
              placeholder="Enter email address"
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={isAdding}
            />
            <Button onClick={handleAddEmail} disabled={isAdding || !newEmail.trim()} className="whitespace-nowrap">
              {isAdding ? 'Adding...' : 'Add'}
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-slate-500">Loading emails...</div>
          ) : emails.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No emails added yet. Add your first email above.</div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {emails.map((email) => {
                const identifier = getEmailIdentifier(email)
                const canResend = canResendOtp(email.lastOtpSentAt)
                const countdown = resendCountdown(email.lastOtpSentAt)
                const otpInput = otpInputs[identifier] || ''
                return (
                  <div key={identifier} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-slate-900 truncate">{email.emailAddress}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              email.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {email.status}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${verificationChip[email.verificationStatus]}`}
                          >
                            {email.verificationStatus}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          Sent: {email.currentCounter} / {email.limit === 0 ? '∞' : email.limit} emails
                        </div>
                      </div>
                      {/* Show delete button for all emails (verified or pending/expired) */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(email)}
                        className="text-red-600 hover:text-red-700 hover:border-red-300"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </Button>
                    </div>

                    {email.verificationStatus !== 'verified' && (
                      <div className="rounded-md bg-white border border-dashed border-slate-200 p-3 text-xs text-slate-600 space-y-2">
                        <p>Enter the 6-digit code sent to this inbox to activate sending.</p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={otpInput}
                            onChange={(e) => setOtpInputs(prev => ({ ...prev, [identifier]: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                            placeholder="123456"
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <Button
                            variant="primary"
                            onClick={() => handleVerifyOtp(email)}
                            disabled={otpInput.length < 4 || otpVerifying[identifier]}
                          >
                            {otpVerifying[identifier] ? 'Verifying...' : 'Verify'}
                          </Button>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRequestOtp(email)}
                          disabled={otpSending[identifier] || !canResend}
                          className={`text-xs font-medium ${
                            canResend ? 'text-indigo-600 hover:text-indigo-700' : 'text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {otpSending[identifier]
                            ? 'Sending code...'
                            : canResend
                              ? 'Resend code'
                              : `Resend available in ${countdown}s`}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </CardContent>

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Delete Email Address"
        message={`Are you sure you want to delete ${deleteDialog.emailAddress}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isLoading={isDeleting}
      />
    </Card>
  )
}