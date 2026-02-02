import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleGetNotifications, handleMarkAllAsRead, type Dependencies } from './route'
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

describe('GET /api/notifications', () => {
  let mockDeps: Dependencies

  beforeEach(() => {
    mockDeps = {
      getSession: vi.fn(),
      notificationService: {
        getNotificationsForUser: vi.fn(),
        getUnreadCount: vi.fn(),
        markAsRead: vi.fn(),
        markAllAsRead: vi.fn(),
        deleteNotification: vi.fn(),
      },
    }
  })

  it('should return 401 if not authenticated', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue(null)

    const response = await handleGetNotifications(mockDeps)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
  })

  it('should return notifications for user', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'user-1' },
    })

    const mockNotifications = [
      createMockNotification({ id: '1' }),
      createMockNotification({ id: '2' }),
    ]
    vi.mocked(mockDeps.notificationService.getNotificationsForUser).mockResolvedValue(
      mockNotifications
    )
    vi.mocked(mockDeps.notificationService.getUnreadCount).mockResolvedValue(2)

    const response = await handleGetNotifications(mockDeps)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.notifications).toHaveLength(2)
    expect(data.data.unreadCount).toBe(2)
  })
})

describe('POST /api/notifications/mark-all-read', () => {
  let mockDeps: Dependencies

  beforeEach(() => {
    mockDeps = {
      getSession: vi.fn(),
      notificationService: {
        getNotificationsForUser: vi.fn(),
        getUnreadCount: vi.fn(),
        markAsRead: vi.fn(),
        markAllAsRead: vi.fn(),
        deleteNotification: vi.fn(),
      },
    }
  })

  it('should return 401 if not authenticated', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue(null)

    const response = await handleMarkAllAsRead(mockDeps)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
  })

  it('should mark all notifications as read', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'user-1' },
    })

    vi.mocked(mockDeps.notificationService.markAllAsRead).mockResolvedValue(5)

    const response = await handleMarkAllAsRead(mockDeps)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.markedCount).toBe(5)
  })
})
