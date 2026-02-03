'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Patient {
  id: string
  name: string
  email: string
}

interface NewFollowUpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewFollowUpDialog({ open, onOpenChange }: NewFollowUpDialogProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [message, setMessage] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const searchPatients = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setPatients([])
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/patients/search?q=${encodeURIComponent(query)}`)
      const data = await response.json()

      if (data.success) {
        setPatients(data.data)
      } else {
        setPatients([])
      }
    } catch {
      setPatients([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchQuery && !selectedPatient) {
        searchPatients(searchQuery)
      }
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [searchQuery, selectedPatient, searchPatients])

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient)
    setSearchQuery(patient.email)
    setPatients([])
  }

  const handleClearSelection = () => {
    setSelectedPatient(null)
    setSearchQuery('')
    setPatients([])
  }

  const handleSubmit = async () => {
    if (!selectedPatient) {
      setError('Please select a patient')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/follow-ups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          message: message.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create follow-up request')
        return
      }

      setSuccess(true)
      setTimeout(() => {
        handleReset()
        onOpenChange(false)
      }, 2000)
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setSearchQuery('')
    setPatients([])
    setSelectedPatient(null)
    setMessage('')
    setError(null)
    setSuccess(false)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      handleReset()
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Follow-Up Request</DialogTitle>
          <DialogDescription>
            Search for a patient by email or name to send a follow-up request.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-lg font-medium text-green-600">
              Follow-up request sent!
            </p>
            <p className="text-sm text-gray-500 mt-1">
              The patient will receive a notification.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="patient-search">Patient</Label>
              <div className="relative">
                <Input
                  id="patient-search"
                  type="text"
                  placeholder="Search by email or name..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    if (selectedPatient) {
                      setSelectedPatient(null)
                    }
                  }}
                  disabled={isSubmitting}
                />
                {selectedPatient && (
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>

              {isSearching && (
                <p className="text-sm text-gray-500">Searching...</p>
              )}

              {patients.length > 0 && !selectedPatient && (
                <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                  {patients.map((patient) => (
                    <button
                      key={patient.id}
                      type="button"
                      onClick={() => handlePatientSelect(patient)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors"
                    >
                      <p className="font-medium text-sm">{patient.name}</p>
                      <p className="text-xs text-gray-500">{patient.email}</p>
                    </button>
                  ))}
                </div>
              )}

              {selectedPatient && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="font-medium text-sm text-green-800">
                    {selectedPatient.name}
                  </p>
                  <p className="text-xs text-green-600">{selectedPatient.email}</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message (Optional)</Label>
              <Input
                id="message"
                type="text"
                placeholder="Add a note for the patient..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>
        )}

        {!success && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedPatient || isSubmitting}
            >
              {isSubmitting ? 'Sending...' : 'Send Request'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
