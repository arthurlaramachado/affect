import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession as defaultGetSession } from '@/lib/auth/session'
import type {
  ReminderSettings,
  UpdateReminderSettingsParams,
} from '@/lib/services/reminders.service'

// Time format regex for HH:MM (24-hour format)
const TIME_FORMAT_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/

// Zod schema for update request validation
const updateRemindersSchema = z
  .object({
    enabled: z.boolean({
      error: 'enabled must be a boolean',
    }),
    time: z
      .string()
      .regex(TIME_FORMAT_REGEX, 'Invalid time format. Use HH:MM (24-hour format)')
      .optional()
      .or(z.null()),
  })
  .refine(
    (data) => {
      // When enabling, time is required
      if (data.enabled && !data.time) {
        return false
      }
      return true
    },
    {
      message: 'time is required when enabling reminders',
      path: ['time'],
    }
  )

export interface RemindersServiceInterface {
  getReminderSettings(userId: string): Promise<ReminderSettings>
  updateReminderSettings(
    userId: string,
    settings: UpdateReminderSettingsParams
  ): Promise<ReminderSettings>
}

export type GetSessionFn = () => Promise<{
  user: { id: string; role?: string } | null
} | null>

export interface Dependencies {
  getSession: GetSessionFn
  remindersService: RemindersServiceInterface
}

function isRemindersServiceError(
  error: unknown
): error is Error & { code: string } {
  return error instanceof Error && error.name === 'RemindersServiceError'
}

function handleRemindersServiceError(error: Error & { code: string }): NextResponse {
  switch (error.code) {
    case 'USER_NOT_FOUND':
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    case 'INVALID_TIME_FORMAT':
      return NextResponse.json(
        { success: false, error: 'Invalid time format' },
        { status: 400 }
      )
    case 'TIME_REQUIRED':
      return NextResponse.json(
        { success: false, error: 'Time is required when enabling reminders' },
        { status: 400 }
      )
    default:
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
  }
}

export async function handleGetReminders(deps: Dependencies): Promise<NextResponse> {
  try {
    const session = await deps.getSession()

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = session.user

    if (user.role !== 'patient') {
      return NextResponse.json(
        { success: false, error: 'Only patients can access reminder settings' },
        { status: 403 }
      )
    }

    const settings = await deps.remindersService.getReminderSettings(user.id)

    return NextResponse.json({
      success: true,
      data: settings,
    })
  } catch (error) {
    if (isRemindersServiceError(error)) {
      return handleRemindersServiceError(error)
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function handleUpdateReminders(
  request: NextRequest,
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

    const user = session.user

    if (user.role !== 'patient') {
      return NextResponse.json(
        { success: false, error: 'Only patients can update reminder settings' },
        { status: 403 }
      )
    }

    // Parse request body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      )
    }

    // Validate input with Zod
    const validationResult = updateRemindersSchema.safeParse(body)

    if (!validationResult.success) {
      const firstIssue = validationResult.error.issues[0]
      return NextResponse.json(
        { success: false, error: firstIssue.message },
        { status: 400 }
      )
    }

    const { enabled, time } = validationResult.data

    const settings = await deps.remindersService.updateReminderSettings(user.id, {
      enabled,
      time: time ?? null,
    })

    return NextResponse.json({
      success: true,
      data: settings,
    })
  } catch (error) {
    if (isRemindersServiceError(error)) {
      return handleRemindersServiceError(error)
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Import real dependencies
import { RemindersService } from '@/lib/services/reminders.service'
import { notificationService } from '@/lib/services'
import { userRepository } from '@/lib/db/repositories'

// Create RemindersService singleton with dependencies
// Note: userRepository needs to implement RemindersUserRepository interface
const remindersService = new RemindersService(
  userRepository as unknown as import('@/lib/services/reminders.service').RemindersUserRepository,
  notificationService
)

const defaultDependencies: Dependencies = {
  getSession: defaultGetSession,
  remindersService,
}

export async function GET() {
  return handleGetReminders(defaultDependencies)
}

export async function PATCH(request: NextRequest) {
  return handleUpdateReminders(request, defaultDependencies)
}
