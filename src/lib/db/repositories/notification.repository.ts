import { eq, and, desc } from 'drizzle-orm'
import { notifications, type Notification, type NewNotification } from '../schema'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

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

export function createNotificationRepository(
  db: NodePgDatabase
): NotificationRepository {
  return {
    async findById(id: string): Promise<Notification | null> {
      const result = await db
        .select()
        .from(notifications)
        .where(eq(notifications.id, id))
        .limit(1)

      return result[0] ?? null
    },

    async findByUserId(userId: string, limit = 50): Promise<Notification[]> {
      return db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
    },

    async findUnreadByUserId(userId: string, limit = 50): Promise<Notification[]> {
      return db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.read, false)
          )
        )
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
    },

    async create(data: NewNotification): Promise<Notification> {
      const result = await db.insert(notifications).values(data).returning()

      return result[0]
    },

    async markAsRead(id: string): Promise<Notification | null> {
      const result = await db
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.id, id))
        .returning()

      return result[0] ?? null
    },

    async markAllAsRead(userId: string): Promise<number> {
      const result = await db
        .update(notifications)
        .set({ read: true })
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.read, false)
          )
        )
        .returning({ id: notifications.id })

      return result.length
    },

    async getUnreadCount(userId: string): Promise<number> {
      const result = await db
        .select({ id: notifications.id })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.read, false)
          )
        )

      return result.length
    },

    async delete(id: string): Promise<boolean> {
      const result = await db
        .delete(notifications)
        .where(eq(notifications.id, id))
        .returning({ id: notifications.id })

      return result.length > 0
    },
  }
}

// Import db here to avoid circular dependencies
import { db } from '@/lib/db'

export const notificationRepository = createNotificationRepository(db as unknown as NodePgDatabase)
