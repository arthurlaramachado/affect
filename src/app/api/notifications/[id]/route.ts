import { NextRequest, NextResponse } from 'next/server'
import { getSession as defaultGetSession } from '@/lib/auth/session'
import type { Notification } from '@/lib/db/schema'

export interface NotificationServiceInterface {
  markAsRead(notificationId: string, userId: string): Promise<Notification>
  deleteNotification(notificationId: string, userId: string): Promise<boolean>
}

export type GetSessionFn = () => Promise<{
  user: { id: string } | null
} | null>

export interface Dependencies {
  getSession: GetSessionFn
  notificationService: NotificationServiceInterface
}

export async function handleMarkAsRead(
  notificationId: string,
  deps: Dependencies
): Promise<NextResponse> {
  try {
    const session = await deps.getSession()

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const notification = await deps.notificationService.markAsRead(
      notificationId,
      session.user.id
    )

    return NextResponse.json({ success: true, data: notification })
  } catch (error) {
    if (error instanceof Error && error.name === 'NotificationServiceError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function handleDeleteNotification(
  notificationId: string,
  deps: Dependencies
): Promise<NextResponse> {
  try {
    const session = await deps.getSession()

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await deps.notificationService.deleteNotification(notificationId, session.user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.name === 'NotificationServiceError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      )
    }

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

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  return handleMarkAsRead(id, defaultDependencies)
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  return handleDeleteNotification(id, defaultDependencies)
}
