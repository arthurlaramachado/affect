import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  NotificationService,
  NotificationServiceError,
  type NotificationRepository,
} from './notification.service'
import type { Notification } from '@/lib/db/schema'

function createMockNotificationRepository(): NotificationRepository {
  return {
    findById: vi.fn(),
    findByUserId: vi.fn(),
    findUnreadByUserId: vi.fn(),
    create: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    getUnreadCount: vi.fn(),
    delete: vi.fn(),
  }
}

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

describe('NotificationService', () => {
  let service: NotificationService
  let mockRepo: ReturnType<typeof createMockNotificationRepository>

  beforeEach(() => {
    mockRepo = createMockNotificationRepository()
    service = new NotificationService(mockRepo)
  })

  describe('create', () => {
    it('should create a notification', async () => {
      const mockNotification = createMockNotification()
      vi.mocked(mockRepo.create).mockResolvedValue(mockNotification)

      const result = await service.create({
        userId: 'user-1',
        type: 'follow_up_request',
        title: 'New Follow-up Request',
        message: 'Dr. Smith requested a follow-up',
      })

      expect(result).toEqual(mockNotification)
      expect(mockRepo.create).toHaveBeenCalledWith({
        userId: 'user-1',
        type: 'follow_up_request',
        title: 'New Follow-up Request',
        message: 'Dr. Smith requested a follow-up',
        metadata: undefined,
      })
    })

    it('should create a notification with metadata', async () => {
      const mockNotification = createMockNotification({
        metadata: { followUpId: 'fu-1' },
      })
      vi.mocked(mockRepo.create).mockResolvedValue(mockNotification)

      const result = await service.create({
        userId: 'user-1',
        type: 'follow_up_request',
        title: 'New Follow-up Request',
        message: 'Dr. Smith requested a follow-up',
        metadata: { followUpId: 'fu-1' },
      })

      expect(result.metadata).toEqual({ followUpId: 'fu-1' })
    })
  })

  describe('createFollowUpRequestNotification', () => {
    it('should create a follow-up request notification for patient', async () => {
      const mockNotification = createMockNotification()
      vi.mocked(mockRepo.create).mockResolvedValue(mockNotification)

      await service.createFollowUpRequestNotification('patient-1', 'Dr. Smith')

      expect(mockRepo.create).toHaveBeenCalledWith({
        userId: 'patient-1',
        type: 'follow_up_request',
        title: 'New Follow-up Request',
        message: 'Dr. Smith has requested a follow-up with you.',
        metadata: undefined,
      })
    })
  })

  describe('createFollowUpAcceptedNotification', () => {
    it('should create a follow-up accepted notification for doctor', async () => {
      const mockNotification = createMockNotification({ type: 'follow_up_accepted' })
      vi.mocked(mockRepo.create).mockResolvedValue(mockNotification)

      await service.createFollowUpAcceptedNotification('doctor-1', 'John Doe')

      expect(mockRepo.create).toHaveBeenCalledWith({
        userId: 'doctor-1',
        type: 'follow_up_accepted',
        title: 'Follow-up Accepted',
        message: 'John Doe has accepted your follow-up request.',
        metadata: undefined,
      })
    })
  })

  describe('createFollowUpDeclinedNotification', () => {
    it('should create a follow-up declined notification for doctor', async () => {
      const mockNotification = createMockNotification({ type: 'follow_up_declined' })
      vi.mocked(mockRepo.create).mockResolvedValue(mockNotification)

      await service.createFollowUpDeclinedNotification('doctor-1', 'John Doe')

      expect(mockRepo.create).toHaveBeenCalledWith({
        userId: 'doctor-1',
        type: 'follow_up_declined',
        title: 'Follow-up Declined',
        message: 'John Doe has declined your follow-up request.',
        metadata: undefined,
      })
    })
  })

  describe('getNotificationsForUser', () => {
    it('should return all notifications for user', async () => {
      const mockNotifications = [
        createMockNotification({ id: '1' }),
        createMockNotification({ id: '2' }),
      ]
      vi.mocked(mockRepo.findByUserId).mockResolvedValue(mockNotifications)

      const result = await service.getNotificationsForUser('user-1')

      expect(result).toHaveLength(2)
      expect(mockRepo.findByUserId).toHaveBeenCalledWith('user-1', undefined)
    })

    it('should respect limit parameter', async () => {
      vi.mocked(mockRepo.findByUserId).mockResolvedValue([])

      await service.getNotificationsForUser('user-1', 10)

      expect(mockRepo.findByUserId).toHaveBeenCalledWith('user-1', 10)
    })
  })

  describe('getUnreadNotifications', () => {
    it('should return unread notifications', async () => {
      const mockNotifications = [createMockNotification({ read: false })]
      vi.mocked(mockRepo.findUnreadByUserId).mockResolvedValue(mockNotifications)

      const result = await service.getUnreadNotifications('user-1')

      expect(result).toHaveLength(1)
      expect(mockRepo.findUnreadByUserId).toHaveBeenCalledWith('user-1', undefined)
    })
  })

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const mockNotification = createMockNotification({ userId: 'user-1' })
      vi.mocked(mockRepo.findById).mockResolvedValue(mockNotification)

      const readNotification = createMockNotification({ read: true })
      vi.mocked(mockRepo.markAsRead).mockResolvedValue(readNotification)

      const result = await service.markAsRead('notification-1', 'user-1')

      expect(result.read).toBe(true)
      expect(mockRepo.markAsRead).toHaveBeenCalledWith('notification-1')
    })

    it('should throw if notification not found', async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(null)

      await expect(
        service.markAsRead('invalid-id', 'user-1')
      ).rejects.toThrow(NotificationServiceError)
    })

    it('should throw if user does not own notification', async () => {
      const mockNotification = createMockNotification({ userId: 'other-user' })
      vi.mocked(mockRepo.findById).mockResolvedValue(mockNotification)

      await expect(
        service.markAsRead('notification-1', 'user-1')
      ).rejects.toThrow(NotificationServiceError)
    })
  })

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      vi.mocked(mockRepo.markAllAsRead).mockResolvedValue(5)

      const result = await service.markAllAsRead('user-1')

      expect(result).toBe(5)
      expect(mockRepo.markAllAsRead).toHaveBeenCalledWith('user-1')
    })
  })

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      vi.mocked(mockRepo.getUnreadCount).mockResolvedValue(3)

      const result = await service.getUnreadCount('user-1')

      expect(result).toBe(3)
      expect(mockRepo.getUnreadCount).toHaveBeenCalledWith('user-1')
    })
  })

  describe('deleteNotification', () => {
    it('should delete notification', async () => {
      const mockNotification = createMockNotification({ userId: 'user-1' })
      vi.mocked(mockRepo.findById).mockResolvedValue(mockNotification)
      vi.mocked(mockRepo.delete).mockResolvedValue(true)

      const result = await service.deleteNotification('notification-1', 'user-1')

      expect(result).toBe(true)
      expect(mockRepo.delete).toHaveBeenCalledWith('notification-1')
    })

    it('should throw if notification not found', async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(null)

      await expect(
        service.deleteNotification('invalid-id', 'user-1')
      ).rejects.toThrow(NotificationServiceError)
    })

    it('should throw if user does not own notification', async () => {
      const mockNotification = createMockNotification({ userId: 'other-user' })
      vi.mocked(mockRepo.findById).mockResolvedValue(mockNotification)

      await expect(
        service.deleteNotification('notification-1', 'user-1')
      ).rejects.toThrow(NotificationServiceError)
    })
  })
})
