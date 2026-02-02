import type { Notification, NewNotification } from '@/lib/db/schema'
import type { NotificationType } from '@/types/database'

export class NotificationServiceError extends Error {
  constructor(message: string, public code: string) {
    super(message)
    this.name = 'NotificationServiceError'
  }
}

export interface NotificationRepository {
  findById(id: string): Promise<Notification | null>
  findByUserId(userId: string, limit?: number): Promise<Notification[]>
  findUnreadByUserId(userId: string, limit?: number): Promise<Notification[]>
  create(data: NewNotification): Promise<Notification>
  markAsRead(id: string): Promise<Notification | null>
  markAllAsRead(userId: string): Promise<number>
  getUnreadCount(userId: string): Promise<number>
  delete(id: string): Promise<boolean>
}

export interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  metadata?: Record<string, unknown>
}

export class NotificationService {
  constructor(private repository: NotificationRepository) {}

  async create(params: CreateNotificationParams): Promise<Notification> {
    const { userId, type, title, message, metadata } = params

    return this.repository.create({
      userId,
      type,
      title,
      message,
      metadata,
    })
  }

  async createFollowUpRequestNotification(
    patientId: string,
    doctorName: string
  ): Promise<void> {
    await this.create({
      userId: patientId,
      type: 'follow_up_request',
      title: 'New Follow-up Request',
      message: `${doctorName} has requested a follow-up with you.`,
    })
  }

  async createFollowUpAcceptedNotification(
    doctorId: string,
    patientName: string
  ): Promise<void> {
    await this.create({
      userId: doctorId,
      type: 'follow_up_accepted',
      title: 'Follow-up Accepted',
      message: `${patientName} has accepted your follow-up request.`,
    })
  }

  async createFollowUpDeclinedNotification(
    doctorId: string,
    patientName: string
  ): Promise<void> {
    await this.create({
      userId: doctorId,
      type: 'follow_up_declined',
      title: 'Follow-up Declined',
      message: `${patientName} has declined your follow-up request.`,
    })
  }

  async getNotificationsForUser(userId: string, limit?: number): Promise<Notification[]> {
    return this.repository.findByUserId(userId, limit)
  }

  async getUnreadNotifications(userId: string, limit?: number): Promise<Notification[]> {
    return this.repository.findUnreadByUserId(userId, limit)
  }

  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    const notification = await this.repository.findById(notificationId)

    if (!notification) {
      throw new NotificationServiceError('Notification not found', 'NOT_FOUND')
    }

    if (notification.userId !== userId) {
      throw new NotificationServiceError('Unauthorized', 'UNAUTHORIZED')
    }

    const updated = await this.repository.markAsRead(notificationId)

    if (!updated) {
      throw new NotificationServiceError('Failed to update notification', 'UPDATE_FAILED')
    }

    return updated
  }

  async markAllAsRead(userId: string): Promise<number> {
    return this.repository.markAllAsRead(userId)
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.repository.getUnreadCount(userId)
  }

  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const notification = await this.repository.findById(notificationId)

    if (!notification) {
      throw new NotificationServiceError('Notification not found', 'NOT_FOUND')
    }

    if (notification.userId !== userId) {
      throw new NotificationServiceError('Unauthorized', 'UNAUTHORIZED')
    }

    return this.repository.delete(notificationId)
  }
}
