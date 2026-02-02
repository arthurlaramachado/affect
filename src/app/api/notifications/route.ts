import { NextResponse } from 'next/server'
import { getSession as defaultGetSession } from '@/lib/auth/session'
import type { Notification } from '@/lib/db/schema'

export interface NotificationServiceInterface {
  getNotificationsForUser(userId: string, limit?: number): Promise<Notification[]>
  getUnreadCount(userId: string): Promise<number>
  markAsRead(notificationId: string, userId: string): Promise<Notification>
  markAllAsRead(userId: string): Promise<number>
  deleteNotification(notificationId: string, userId: string): Promise<boolean>
}

export type GetSessionFn = () => Promise<{
  user: { id: string } | null
} | null>

export interface Dependencies {
  getSession: GetSessionFn
  notificationService: NotificationServiceInterface
}

export async function handleGetNotifications(deps: Dependencies): Promise<NextResponse> {
  try {
    const session = await deps.getSession()

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const [notifications, unreadCount] = await Promise.all([
      deps.notificationService.getNotificationsForUser(session.user.id),
      deps.notificationService.getUnreadCount(session.user.id),
    ])

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function handleMarkAllAsRead(deps: Dependencies): Promise<NextResponse> {
  try {
    const session = await deps.getSession()

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const markedCount = await deps.notificationService.markAllAsRead(session.user.id)

    return NextResponse.json({
      success: true,
      data: { markedCount },
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Import real dependencies
import { notificationService } from '@/lib/services'

const defaultDependencies: Dependencies = {
  getSession: defaultGetSession,
  notificationService,
}

export async function GET() {
  return handleGetNotifications(defaultDependencies)
}

export async function POST() {
  return handleMarkAllAsRead(defaultDependencies)
}
