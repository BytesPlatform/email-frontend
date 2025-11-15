'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { clientAccountsApi, ClientEmail } from '@/api/clientAccounts'

export function EmailAccountsCard() {
  const [emails, setEmails] = useState<ClientEmail[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; emailId: number | null; emailAddress: string }>({
    isOpen: false,
    emailId: null,
    emailAddress: '',
  })
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    loadEmails()
  }, [])

  const loadEmails = async () => {
    setIsLoading(true)
    setError(null)
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

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) {
      setError('Please enter a valid email address')
      return
    }

    setIsAdding(true)
    setError(null)
    try {
      const response = await clientAccountsApi.createClientEmail({ emailAddress: newEmail })
      if (response.success && response.data) {
        setEmails([response.data, ...emails])
        setNewEmail('')
        setIsAdding(false)
      } else {
        // Extract clean error message from response
        let errorMessage = 'Failed to add email'
        if (response.error) {
          errorMessage = response.error
          // Clean up common error patterns
          if (errorMessage.includes('already exists')) {
            errorMessage = 'This email address is already registered for your account.'
          } else if (errorMessage.includes('Unique constraint')) {
            errorMessage = 'This email address already exists in your account.'
          }
        }
        setError(errorMessage)
        setIsAdding(false)
      }
    } catch (err) {
      let errorMessage = 'Failed to add email'
      if (err instanceof Error) {
        errorMessage = err.message
        // Clean up stack traces and verbose errors
        if (errorMessage.includes('already exists') || errorMessage.includes('Unique constraint')) {
          errorMessage = 'This email address is already registered for your account.'
        } else if (errorMessage.includes('BadRequestException')) {
          errorMessage = errorMessage.replace(/BadRequestException:\s*/g, '')
          errorMessage = errorMessage.split('\n')[0] // Get first line only
        }
      }
      setError(errorMessage)
      setIsAdding(false)
    }
  }

  const handleDeleteClick = (id: number, emailAddress: string) => {
    setDeleteDialog({ isOpen: true, emailId: id, emailAddress })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.emailId) return

    setIsDeleting(true)
    setError(null)
    try {
      const response = await clientAccountsApi.deleteClientEmail(deleteDialog.emailId)
      if (response.success) {
        setEmails(emails.filter(email => email.id !== deleteDialog.emailId))
        setDeleteDialog({ isOpen: false, emailId: null, emailAddress: '' })
      } else {
        setError(response.error || 'Failed to delete email')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete email')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteDialog({ isOpen: false, emailId: null, emailAddress: '' })
  }

  return (
    <Card variant="elevated">
      <CardHeader
        title="Email Accounts"
        subtitle="Manage email addresses for sending emails"
        icon={
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        }
      />
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {/* Add Email Form */}
          <div className="flex gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddEmail()}
              placeholder="Enter email address"
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={isAdding}
            />
            <Button
              onClick={handleAddEmail}
              disabled={isAdding || !newEmail.trim()}
              className="whitespace-nowrap"
            >
              {isAdding ? 'Adding...' : 'Add'}
            </Button>
          </div>

          {/* Email List */}
          {isLoading ? (
            <div className="text-center py-8 text-slate-500">Loading emails...</div>
          ) : emails.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No emails added yet. Add your first email above.</div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {emails.map((email) => (
                <div
                  key={email.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 truncate">{email.emailAddress}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        email.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {email.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Sent: {email.currentCounter} / {email.limit === 0 ? '∞' : email.limit} emails
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteClick(email.id, email.emailAddress)}
                    className="ml-3 text-red-600 hover:text-red-700 hover:border-red-300"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      {/* Delete Confirmation Dialog */}
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

