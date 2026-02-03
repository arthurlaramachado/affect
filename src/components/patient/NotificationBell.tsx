'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FollowUpRequestsModal } from './FollowUpRequestsModal'

interface NotificationBellProps {
  initialCount?: number
}

export function NotificationBell({ initialCount = 0 }: NotificationBellProps) {
  const [count, setCount] = useState(initialCount)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const response = await fetch('/api/follow-ups')
        const data = await response.json()
        if (data.success) {
          setCount(data.data.length)
        }
      } catch {
        // Ignore fetch errors
      }
    }

    fetchCount()
    const interval = setInterval(fetchCount, 30000)

    return () => clearInterval(interval)
  }, [])

  const handleModalClose = (open: boolean) => {
    setIsModalOpen(open)
    if (!open) {
      fetch('/api/follow-ups')
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setCount(data.data.length)
          }
        })
        .catch(() => {})
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsModalOpen(true)}
        className="relative"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </Button>

      <FollowUpRequestsModal
        open={isModalOpen}
        onOpenChange={handleModalClose}
      />
    </>
  )
}
