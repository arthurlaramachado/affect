import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleMarkAsRead, handleDeleteNotification, type Dependencies } from './route'
import type { Notification } from '@/lib/db/schema'

function createMockNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'notification-1',
    userId: 'user-1',
    type: 'follow_up_request',
    title: 'New Follow-up Request',
    message: 'Dr. Smith requested a follow-up',
    metadata: null,
    read: false,
    createdAt: new Date(),
    ...overrides,
  }
}

describe('PATCH /api/notifications/[id]', () => {
  let mockDeps: Dependencies

  beforeEach(() => {
    mockDeps = {
      getSession: vi.fn(),
      notificationService: {
        markAsRead: vi.fn(),
        deleteNotification: vi.fn(),
      },
    }
  })

  it('should return 401 if not authenticated', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue(null)

    const response = await handleMarkAsRead('notification-1', mockDeps)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
  })

  it('should mark notification as read', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'user-1' },
    })

    const mockNotification = createMockNotification({ read: true })
    vi.mocked(mockDeps.notificationService.markAsRead).mockResolvedValue(mockNotification)

    const response = await handleMarkAsRead('notification-1', mockDeps)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.read).toBe(true)
  })

  it('should return 400 on service error', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'user-1' },
    })

    const error = new Error('Notification not found')
    error.name = 'NotificationServiceError'
    vi.mocked(mockDeps.notificationService.markAsRead).mockRejectedValue(error)

    const response = await handleMarkAsRead('notification-1', mockDeps)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })
})

describe('DELETE /api/notifications/[id]', () => {
  let mockDeps: Dependencies

  beforeEach(() => {
    mockDeps = {
      getSession: vi.fn(),
      notificationService: {
        markAsRead: vi.fn(),
        deleteNotification: vi.fn(),
      },
    }
  })

  it('should return 401 if not authenticated', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue(null)

    const response = await handleDeleteNotification('notification-1', mockDeps)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
  })

  it('should delete notification', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'user-1' },
    })

    vi.mocked(mockDeps.notificationService.deleteNotification).mockResolvedValue(true)

    const response = await handleDeleteNotification('notification-1', mockDeps)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('should return 400 on service error', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'user-1' },
    })

    const error = new Error('Unauthorized')
    error.name = 'NotificationServiceError'
    vi.mocked(mockDeps.notificationService.deleteNotification).mockRejectedValue(error)

    const response = await handleDeleteNotification('notification-1', mockDeps)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })
})
