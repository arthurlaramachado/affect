'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface FollowUpRequest {
  id: string
  doctorId: string
  doctorName?: string
  message: string | null
  requestedAt: string
}

interface FollowUpRequestsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FollowUpRequestsModal({ open, onOpenChange }: FollowUpRequestsModalProps) {
  const [requests, setRequests] = useState<FollowUpRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchRequests = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/follow-ups')
      const data = await response.json()

      if (data.success) {
        setRequests(data.data)
      } else {
        setError(data.error || 'Failed to load requests')
      }
    } catch {
      setError('Failed to load requests')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      fetchRequests()
    }
  }, [open, fetchRequests])

  const handleAction = async (id: string, action: 'accept' | 'decline') => {
    setProcessingId(id)
    setError(null)

    try {
      const response = await fetch(`/api/follow-ups/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to process request')
        return
      }

      setRequests((prev) => prev.filter((r) => r.id !== id))

      if (requests.length === 1) {
        setTimeout(() => onOpenChange(false), 1000)
      }
    } catch {
      setError('Failed to process request')
    } finally {
      setProcessingId(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Follow-Up Requests</DialogTitle>
          <DialogDescription>
            Review and respond to doctor follow-up requests.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="py-8 text-center text-gray-500">
            Loading requests...
          </div>
        ) : requests.length === 0 ? (
          <div className="py-8 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-gray-400"
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
            <p className="text-gray-600">No pending requests</p>
            <p className="text-sm text-gray-400 mt-1">
              You&apos;re all caught up!
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {requests.map((request) => (
              <div
                key={request.id}
                className="p-4 border rounded-lg bg-gray-50"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900">
                      Dr. {request.doctorName || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(request.requestedAt)}
                    </p>
                  </div>
                </div>

                {request.message && (
                  <p className="text-sm text-gray-600 mb-3 italic">
                    &quot;{request.message}&quot;
                  </p>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleAction(request.id, 'accept')}
                    disabled={processingId === request.id}
                    className="flex-1"
                  >
                    {processingId === request.id ? 'Processing...' : 'Accept'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction(request.id, 'decline')}
                    disabled={processingId === request.id}
                    className="flex-1"
                  >
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
