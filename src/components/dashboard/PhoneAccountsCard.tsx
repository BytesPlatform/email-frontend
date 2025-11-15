'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { clientAccountsApi, ClientSms } from '@/api/clientAccounts'

export function PhoneAccountsCard() {
  const [phoneNumbers, setPhoneNumbers] = useState<ClientSms[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [newPhone, setNewPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; phoneId: number | null; phoneNumber: string }>({
    isOpen: false,
    phoneId: null,
    phoneNumber: '',
  })
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    loadPhoneNumbers()
  }, [])

  const loadPhoneNumbers = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await clientAccountsApi.getClientSms()
      if (response.success && response.data) {
        setPhoneNumbers(response.data)
      } else {
        setError(response.error || 'Failed to load phone numbers')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load phone numbers')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddPhone = async () => {
    if (!newPhone.trim()) {
      setError('Please enter a phone number')
      return
    }

    // Basic phone validation (E.164 format or simple digits)
    const phoneRegex = /^\+?[1-9]\d{1,14}$|^\d{10,}$/
    const cleanedPhone = newPhone.replace(/\D/g, '')
    if (!phoneRegex.test(cleanedPhone) && !phoneRegex.test(newPhone)) {
      setError('Please enter a valid phone number')
      return
    }

    setIsAdding(true)
    setError(null)
    try {
      const response = await clientAccountsApi.createClientSms({ phoneNumber: newPhone })
      if (response.success && response.data) {
        setPhoneNumbers([response.data, ...phoneNumbers])
        setNewPhone('')
        setIsAdding(false)
      } else {
        // Extract clean error message from response
        let errorMessage = 'Failed to add phone number'
        if (response.error) {
          errorMessage = response.error
          // Clean up common error patterns
          if (errorMessage.includes('already exists')) {
            errorMessage = 'This phone number is already registered for your account.'
          } else if (errorMessage.includes('Unique constraint')) {
            errorMessage = 'This phone number already exists in your account.'
          }
        }
        setError(errorMessage)
        setIsAdding(false)
      }
    } catch (err) {
      let errorMessage = 'Failed to add phone number'
      if (err instanceof Error) {
        errorMessage = err.message
        // Clean up stack traces and verbose errors
        if (errorMessage.includes('already exists') || errorMessage.includes('Unique constraint')) {
          errorMessage = 'This phone number is already registered for your account.'
        } else if (errorMessage.includes('BadRequestException')) {
          errorMessage = errorMessage.replace(/BadRequestException:\s*/g, '')
          errorMessage = errorMessage.split('\n')[0] // Get first line only
        }
      }
      setError(errorMessage)
      setIsAdding(false)
    }
  }

  const handleDeleteClick = (id: number, phoneNumber: string) => {
    setDeleteDialog({ isOpen: true, phoneId: id, phoneNumber })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.phoneId) return

    setIsDeleting(true)
    setError(null)
    try {
      const response = await clientAccountsApi.deleteClientSms(deleteDialog.phoneId)
      if (response.success) {
        setPhoneNumbers(phoneNumbers.filter(phone => phone.id !== deleteDialog.phoneId))
        setDeleteDialog({ isOpen: false, phoneId: null, phoneNumber: '' })
      } else {
        setError(response.error || 'Failed to delete phone number')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete phone number')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteDialog({ isOpen: false, phoneId: null, phoneNumber: '' })
  }

  return (
    <Card variant="elevated">
      <CardHeader
        title="Phone Numbers"
        subtitle="Manage phone numbers for sending SMS"
        icon={
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
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
          {/* Add Phone Form */}
          <div className="flex gap-2">
            <input
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddPhone()}
              placeholder="Enter phone number"
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={isAdding}
            />
            <Button
              onClick={handleAddPhone}
              disabled={isAdding || !newPhone.trim()}
              className="whitespace-nowrap"
            >
              {isAdding ? 'Adding...' : 'Add'}
            </Button>
          </div>

          {/* Phone List */}
          {isLoading ? (
            <div className="text-center py-8 text-slate-500">Loading phone numbers...</div>
          ) : phoneNumbers.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No phone numbers added yet. Add your first phone number above.</div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {phoneNumbers.map((phone) => (
                <div
                  key={phone.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 truncate">{phone.phoneNumber}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        phone.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {phone.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Sent: {phone.currentCounter} {phone.limit !== null ? `/ ${phone.limit}` : '(unlimited)'} SMS
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteClick(phone.id, phone.phoneNumber)}
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
        title="Delete Phone Number"
        message={`Are you sure you want to delete ${deleteDialog.phoneNumber}? This action cannot be undone.`}
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

