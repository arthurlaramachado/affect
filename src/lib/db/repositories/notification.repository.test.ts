import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createNotificationRepository } from './notification.repository'
import type { Notification, NewNotification } from '../schema'

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
}

describe('NotificationRepository', () => {
  let notificationRepository: ReturnType<typeof createNotificationRepository>

  beforeEach(() => {
    vi.clearAllMocks()
    notificationRepository = createNotificationRepository(mockDb as never)
  })

  describe('findById', () => {
    it('should return notification when found', async () => {
      const mockNotification: Notification = {
        id: 'notif-123',
        userId: 'user-123',
        type: 'follow_up_request',
        title: 'New Follow-up Request',
        message: 'Dr. Smith wants to follow up with you',
        metadata: { doctorId: 'doctor-123' },
        read: false,
        createdAt: new Date(),
      }

      mockDb.limit.mockResolvedValueOnce([mockNotification])

      const result = await notificationRepository.findById('notif-123')

      expect(result).toEqual(mockNotification)
    })

    it('should return null when not found', async () => {
      mockDb.limit.mockResolvedValueOnce([])

      const result = await notificationRepository.findById('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('findByUserId', () => {
    it('should return all notifications for a user', async () => {
      const notifications: Notification[] = [
        {
          id: 'notif-1',
          userId: 'user-123',
          type: 'follow_up_request',
          title: 'New Follow-up Request',
          message: 'Dr. Smith wants to follow up',
          metadata: null,
          read: false,
          createdAt: new Date(),
        },
        {
          id: 'notif-2',
          userId: 'user-123',
          type: 'follow_up_accepted',
          title: 'Follow-up Accepted',
          message: 'Patient John accepted',
          metadata: null,
          read: true,
          createdAt: new Date(),
        },
      ]

      mockDb.limit.mockResolvedValueOnce(notifications)

      const result = await notificationRepository.findByUserId('user-123')

      expect(result).toEqual(notifications)
    })
  })

  describe('findUnreadByUserId', () => {
    it('should return only unread notifications', async () => {
      const unreadNotifications: Notification[] = [
        {
          id: 'notif-1',
          userId: 'user-123',
          type: 'follow_up_request',
          title: 'New Follow-up Request',
          message: 'Dr. Smith wants to follow up',
          metadata: null,
          read: false,
          createdAt: new Date(),
        },
      ]

      mockDb.limit.mockResolvedValueOnce(unreadNotifications)

      const result = await notificationRepository.findUnreadByUserId('user-123')

      expect(result).toEqual(unreadNotifications)
      expect(result.every((n) => !n.read)).toBe(true)
    })
  })

  describe('create', () => {
    it('should create a new notification', async () => {
      const newNotification: NewNotification = {
        userId: 'user-123',
        type: 'follow_up_request',
        title: 'New Follow-up Request',
        message: 'Dr. Smith wants to follow up with you',
        metadata: { doctorId: 'doctor-123', followUpId: 'followup-123' },
      }

      const createdNotification: Notification = {
        id: 'new-notif-id',
        ...newNotification,
        read: false,
        createdAt: new Date(),
      }

      mockDb.returning.mockResolvedValueOnce([createdNotification])

      const result = await notificationRepository.create(newNotification)

      expect(result).toEqual(createdNotification)
    })
  })

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const readNotification: Notification = {
        id: 'notif-123',
        userId: 'user-123',
        type: 'follow_up_request',
        title: 'New Follow-up Request',
        message: 'Dr. Smith wants to follow up',
        metadata: null,
        read: true,
        createdAt: new Date(),
      }

      mockDb.returning.mockResolvedValueOnce([readNotification])

      const result = await notificationRepository.markAsRead('notif-123')

      expect(result).toEqual(readNotification)
      expect(result?.read).toBe(true)
    })

    it('should return null when notification not found', async () => {
      mockDb.returning.mockResolvedValueOnce([])

      const result = await notificationRepository.markAsRead('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for a user', async () => {
      mockDb.returning.mockResolvedValueOnce([{ id: 'notif-1' }, { id: 'notif-2' }])

      const result = await notificationRepository.markAllAsRead('user-123')

      expect(result).toBe(2)
    })

    it('should return 0 when no notifications to mark', async () => {
      mockDb.returning.mockResolvedValueOnce([])

      const result = await notificationRepository.markAllAsRead('user-123')

      expect(result).toBe(0)
    })
  })

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      const unreadNotifications = [
        { id: 'notif-1' },
        { id: 'notif-2' },
        { id: 'notif-3' },
      ]

      mockDb.where.mockResolvedValueOnce(unreadNotifications)

      const result = await notificationRepository.getUnreadCount('user-123')

      expect(result).toBe(3)
    })

    it('should return 0 when no unread notifications', async () => {
      mockDb.where.mockResolvedValueOnce([])

      const result = await notificationRepository.getUnreadCount('user-123')

      expect(result).toBe(0)
    })
  })

  describe('delete', () => {
    it('should delete notification and return true', async () => {
      mockDb.returning.mockResolvedValueOnce([{ id: 'notif-123' }])

      const result = await notificationRepository.delete('notif-123')

      expect(result).toBe(true)
    })

    it('should return false when notification not found', async () => {
      mockDb.returning.mockResolvedValueOnce([])

      const result = await notificationRepository.delete('non-existent')

      expect(result).toBe(false)
    })
  })
})
